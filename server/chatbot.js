const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { ChatVerification, ChatMessage, ChatSession } = require('./chatbot-models');
const { CASE_STUDIES } = require('./caseStudiesData');
const { sendOtpEmail, sendChatTranscriptEmail } = require('../utils/email');
const { validatePhone } = require('./contact');
const { BlogPost, Service } = require('./models');

// Rate limiting map: identifier -> array of timestamps
const otpRateLimitMap = new Map();

// Disposable email domains to block
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'throwaway.email',
  'yopmail.com',
  'temp-mail.org'
]);

// Email regex matching contact form in index.html
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

// ─────────────────────────────────────────────────────────────
// Gemini resilience helpers
// ─────────────────────────────────────────────────────────────

// Models tried in order. First success wins.
// gemini-3.8-flash  → primary, fastest
// gemini-3.8-pro    → higher quality fallback (slower)
// gemini-2.5-flash  → legacy stable fallback
const GEMINI_MODELS = [
  'gemini-3.8-flash',        // primary, stable
  'gemini-3.7-flash',        // stable fallback
  'gemini-3.5-flash-lite'         // legacy stable fallback
];

// HTTP statuses worth retrying.
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

// Per-attempt network timeout (ms).
const GEMINI_TIMEOUT_MS = 8000;

// Total time budget across all models + retries (ms).
// Set to 10s so secondary/tertiary fallback models always get a fair chance to run.
const GEMINI_TOTAL_BUDGET_MS = 10000;

// Sleep helper.
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Exponential backoff with full jitter.
// attempt = 1, 2, 3 → base 300ms, 600ms, 1200ms (± 50% jitter)
function backoffDelay(attempt) {
  const base = 300 * Math.pow(2, attempt - 1);
  const jitter = base * 0.5 * Math.random();
  return Math.floor(base + jitter);
}

/**
 * Calls Gemini for a single model with retry + timeout.
 * Returns { ok: true, text } on success.
 * Returns { ok: false, status, retryable } on failure.
 */
async function callGeminiModel(model, systemPrompt, messages, timeoutMs = GEMINI_TIMEOUT_MS) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: messages,
    generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal
    });

    if (response.ok) {
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return { ok: true, text: text.trim() };
      return { ok: false, status: 200, retryable: false, reason: 'empty response' };
    }

    const errorText = await response.text();
    return {
      ok: false,
      status: response.status,
      retryable: RETRYABLE_STATUSES.has(response.status),
      reason: errorText.slice(0, 200)
    };
  } catch (err) {
    // Network error, abort, DNS failure, etc. — treat as retryable.
    return {
      ok: false,
      status: 0,
      retryable: true,
      reason: err.name === 'AbortError' ? 'timeout' : err.message
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Orchestrates the full multi-model, multi-retry Gemini call.
 * Returns the text reply or null if all attempts fail.
 */
async function callGeminiWithFallback(systemPrompt, messages) {
  const startTime = Date.now();

  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i];
    // Only allow retry on primary model if budget permits.
    const maxAttempts = i === 0 ? 2 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const elapsed = Date.now() - startTime;
      const remainingBudget = GEMINI_TOTAL_BUDGET_MS - elapsed;

      // Need at least 1500ms to complete a round-trip
      if (remainingBudget < 1500) {
        console.warn(`[chatbot] Gemini budget depleted (${remainingBudget}ms left) before trying ${model}`);
        return null;
      }

      // Bound per-call timeout by remaining budget so no attempt overshoots
      const effectiveTimeout = Math.min(GEMINI_TIMEOUT_MS, remainingBudget);

      const t0 = Date.now();
      const result = await callGeminiModel(model, systemPrompt, messages, effectiveTimeout);
      const dt = Date.now() - t0;

      if (result.ok) {
        console.log(`[chatbot] Gemini OK model=${model} attempt=${attempt} ${dt}ms`);
        return result.text;
      }

      console.warn(
        `[chatbot] Gemini FAIL model=${model} attempt=${attempt} status=${result.status} ` +
        `retryable=${result.retryable} ${dt}ms reason=${result.reason}`
      );

      // Non-retryable (400, 401, 403, 404) -> stop retrying this model
      if (!result.retryable) {
        break;
      }

      // On 503 (model overloaded) or timeout (status 0) or server error (500/502/504):
      // Retrying the SAME overloaded/hung model wastes precious budget.
      // Immediately failover to the next model in the chain!
      if (result.status === 503 || result.status === 0 || result.status === 500 || result.status === 502 || result.status === 504) {
        console.log(`[chatbot] Model ${model} is overloaded or timed out — failing over to next model immediately`);
        break;
      }

      // If rate limited (429), back off and retry primary once if budget allows
      if (attempt < maxAttempts) {
        const delay = backoffDelay(attempt);
        if (Date.now() - startTime + delay + 2000 >= GEMINI_TOTAL_BUDGET_MS) {
          console.warn('[chatbot] Gemini budget would be exceeded by backoff — moving to next model');
          break;
        }
        await sleep(delay);
      }
    }
  }

  console.error('[chatbot] All Gemini models failed — falling back to rules');
  return null;
}

// ─────────────────────────────────────────────────────────────
// Startup AI provider check
// ─────────────────────────────────────────────────────────────
if (process.env.GEMINI_API_KEY) {
  console.log('[chatbot] AI provider: Google Gemini');
  console.log(`[chatbot] Model chain: ${GEMINI_MODELS.join(' → ')}`);
  console.log(`[chatbot] Retry policy: dynamic per-call timeout (max ${GEMINI_TIMEOUT_MS}ms), failover on 503/timeout, total budget=${GEMINI_TOTAL_BUDGET_MS}ms`);
} else if (process.env.ANTHROPIC_API_KEY) {
  console.log('[chatbot] AI provider: Anthropic Claude');
} else {
  console.warn('[chatbot] No AI provider configured — using rule-based fallback.');
}

/**
 * Returns a promise that resolves after a random delay between 3 and 5 seconds.
 * Mimics a human assistant thinking and typing before responding.
 */
function humanDelay() {
  const minMs = 3000;
  const maxMs = 5000;
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Post-processing sanitizer: strips Jenny's self-intro prefix from replies
 * that are NOT the first message. This is the final safety net regardless
 * of whether the AI model or the fallback rule matcher generated the text.
 */
function stripIntro(text) {
  if (!text) return text;
  const introPatterns = [
    /^Hey!?\s*👋\s*I'?m Jenny from Techdataseeders[.,]?\s*/i,
    /^Hi!?\s*👋\s*I'?m Jenny from Techdataseeders[.,]?\s*/i,
    /^Hello!?\s*👋\s*I'?m Jenny from Techdataseeders[.,]?\s*/i,
    /^Hey!?\s*I'?m Jenny from Techdataseeders[.,]?\s*/i,
    /^Hi!?\s*I'?m Jenny from Techdataseeders[.,]?\s*/i,
    /^I'?m Jenny from Techdataseeders[.,]?\s*/i,
    /^Hey there!?\s*👋\s*I'?m Jenny.*?[.!]\s*/i,
    /^I'?m Jenny,?\s+part of the \*\*Techdataseeders\*\* team!?\s*👋\s*/i,
    // Bare greetings on follow-up replies (no self-intro needed to strip)
    /^Hey there!?\s*👋\s*/i,
    /^Hey!?\s*👋\s*/i,
    /^Hi!?\s*👋\s*/i,
    /^Hello there!?\s*👋\s*/i,
  ];
  let cleaned = text;
  for (const pattern of introPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  // Re-capitalise the first letter after stripping
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  // Fallback: if stripping emptied the string, return the original
  return cleaned.trim() || text;
}

/**
 * Helper to update chat session activity timestamp and reset transcriptSent flag
 */
async function touchChatSession(identifier) {
  try {
    await ChatSession.findOneAndUpdate(
      { identifier },
      { $set: { lastActivityAt: new Date(), transcriptSent: false } },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('[chatbot] touchChatSession error:', err.message);
  }
}

/**
 * Background scheduler: evaluates every ChatSession independently against
 * its own lastActivityAt timestamp.
 *
 * On each tick it finds sessions where:
 *   - lastActivityAt < (now - INACTIVITY_MS)   ← per-session idle clock
 *   - transcriptSent == false                   ← defensive; re-touch resets this
 *
 * Per matching session:
 *   - No messages   → deleteOne(session), no email.
 *   - Send SUCCESS  → deleteMany(messages) + deleteOne(session).
 *   - Send FAILURE  → leave everything intact; next tick retries.
 */
function startChatTranscriptScheduler() {
  const INTERVAL_MS   = 10 * 60 * 1000;       // 10 minutes
  const INACTIVITY_MS =  2 * 60 * 60 * 1000;  // 2 hours
  const RECIPIENT     = 'sales@techdataseeders.com';

  setInterval(async () => {
    try {
      const now    = Date.now();
      const cutoff = new Date(now - INACTIVITY_MS);

      // Each session's lastActivityAt is compared against the same
      // per-tick cutoff, which is equivalent to checking
      //   (now - session.lastActivityAt) > INACTIVITY_MS
      // for every session individually.
      const stale = await ChatSession.find({
        lastActivityAt: { $lt: cutoff },
        transcriptSent: false
      }).lean();

      for (const s of stale) {
        try {
          const idleMs  = now - new Date(s.lastActivityAt).getTime();
          const idleMins = Math.floor(idleMs / 60000);

          const messages = await ChatMessage.find({ identifier: s.identifier })
            .sort({ createdAt: 1 })
            .lean();

          // Empty session — remove silently, no email
          if (!messages.length) {
            const delSess = await ChatSession.deleteOne({ _id: s._id });
            console.log(
              `[chatbot] Empty session removed: ${s.identifier} ` +
              `(idle: ${idleMins} min, session deleted: ${delSess.deletedCount})`
            );
            continue;
          }

          const result = await sendChatTranscriptEmail({
            to: RECIPIENT,
            identifier: s.identifier,
            messages
          });

          if (result.success) {
            // DELETE EVERYTHING for this session — messages first, then session record
            const delMsgs = await ChatMessage.deleteMany({ identifier: s.identifier });
            const delSess = await ChatSession.deleteOne({ _id: s._id });

            console.log(
              `[chatbot] Transcript sent & data purged for ${s.identifier} ` +
              `(idle: ${idleMins} min, messages deleted: ${delMsgs.deletedCount}, ` +
              `session deleted: ${delSess.deletedCount})`
            );
          } else {
            // Leave everything intact — next tick will retry
            console.error(
              `[chatbot] Transcript email failed for ${s.identifier} ` +
              `(idle: ${idleMins} min): ${result.error}`
            );
          }
        } catch (err) {
          // Isolate per-session errors so the loop continues for other sessions
          console.error(
            `[chatbot] Transcript loop error for ${s.identifier}:`, err.message
          );
        }
      }
    } catch (err) {
      // Outer catch keeps the scheduler alive even if the DB query itself fails
      console.error('[chatbot] Transcript scheduler error:', err.message);
    }
  }, INTERVAL_MS);

  console.log('[chatbot] Transcript scheduler started (10 min interval, 2 h idle threshold)');
}

/**
 * Compact knowledge base built for system prompt and fallback matching
 */
const KNOWLEDGE_BASE = {
  company: {
    name: "Techdataseeders",
    tagline: "Seeding Intelligence from the Web",
    description: "A global provider of enterprise web scraping, data extraction, and intelligent automation — turning the open web into decision-ready data.",
    compliance: "Techdataseeders only extracts publicly available information and does not scrape personal or identity-related data.",
    offices: [
      {
        location: "San Jose, USA",
        address: "1715 Lundy Ave, Suite 192, San Jose, CA 95131, United States",
        phone: "+1 650 519 1100",
        email: "sales@techdataseeders.com"
      },
      {
        location: "Ahmedabad, India",
        address: "9th Floor, Sankalp Square 3B, Sindhu Bhavan Road, Near Taj Skyline, Ahmedabad, Gujarat, India",
        phone: "+91 8401481455",
        email: "sales@techdataseeders.in"
      },
      {
        location: "Dubai, UAE",
        address: "Hamad Tower, Arjan, Al Barsha South, Dubai, United Arab Emirates",
        phone: "+971 55 411 7867",
        email: "sales@techdataseeders.com"
      }
    ],
    contactUrl: "/#contact"
  },
  services: [
    {
      name: "Enterprise Web Scraping",
      url: "/services/enterprise-web-scraping.html",
      summary: "High-scale, fully managed web data extraction with automated scheduling, residential and mobile proxy rotation, advanced anti-bot bypass (Cloudflare, Akamai, PerimeterX), and delivery in custom formats (JSON, CSV, S3, SQL)."
    },
    {
      name: "Mobile App Scraping",
      url: "/services/mobile-app-scraping.html",
      summary: "Specialized mobile data extraction capturing encrypted traffic, private mobile APIs, and app-only endpoints across Android and iOS applications with 99.9% uptime."
    },
    {
      name: "Data Analytics & Intelligence",
      url: "/services/data-analytics-intelligence.html",
      summary: "Transforming unstructured data feeds into automated executive dashboards, competitive price intelligence, sentiment analysis, brand monitoring, and predictive market models."
    },
    {
      name: "Custom Data API",
      url: "/services/custom-data-api.html",
      summary: "Production-ready, low-latency REST and GraphQL APIs and webhooks that pipe clean, real-time structured data directly into internal pipelines and applications."
    }
  ],
  industries: [
    { name: "E-Commerce", url: "/industries/ecomm.html", summary: "Catalog indexing, real-time competitor price tracking, inventory monitoring, and review sentiment across Amazon, Walmart, Target, etc." },
    { name: "Retail", url: "/industries/retail.html", summary: "Omnichannel price matching, SKU reconciliation, automated product categorization, and local promotional monitoring." },
    { name: "Real Estate", url: "/industries/real-estate.html", summary: "Property listings, rental yields, price-per-square-foot analytics, and historical valuation intelligence from major portals." },
    { name: "Travel & Hospitality", url: "/industries/travel-hotel.html", summary: "Hotel room rate intelligence, airline seat availability, OTA benchmark data, and seasonal booking trends." },
    { name: "Food & Beverages", url: "/industries/food-beverages.html", summary: "Restaurant menu pricing, item availability, delivery platform data (DoorDash, Uber Eats, Grubhub), and consumer reviews." },
    { name: "Quick Commerce", url: "/industries/q-commerce.html", summary: "Hyperlocal dark store stock tracking, 10-minute delivery pricing, and competitor catalog surveillance (Blinkit, Zepto, Instamart)." },
    { name: "Social Media", url: "/industries/social-media.html", summary: "Social listening, brand mentions, engagement analytics, trend forecasting, and influencer intelligence." },
    { name: "Entertainment & OTT", url: "/industries/entertainment-ott.html", summary: "Streaming catalog monitoring, regional content availability, viewer sentiment, and release schedule tracking." }
  ],
  caseStudies: CASE_STUDIES.map(cs => ({
    category: cs.category,
    title: cs.title,
    client: cs.client,
    desc: cs.desc,
    href: cs.href.replace(/^\.\//, '/'),
    metrics: cs.metrics.map(m => `${m.v} ${m.l}`).join(', ')
  }))
};

/**
 * Fetch latest blog excerpts dynamically to enrich AI context
 */
async function getRecentBlogSummary() {
  try {
    const posts = await BlogPost.find({ published: true })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title slug excerpt category')
      .lean();

    return posts.map(p => ({
      title: p.title,
      slug: `/blog/${p.slug}/`,
      category: p.category,
      excerpt: p.excerpt || ''
    }));
  } catch (err) {
    return [];
  }
}

/**
 * Build compact prompt knowledge string
 */
async function buildSystemPrompt(userAlreadyGreeted) {
  const blogs = await getRecentBlogSummary();
  const context = {
    ...KNOWLEDGE_BASE,
    recentBlogs: blogs
  };

  const greetingRule = userAlreadyGreeted
    ? 'The user has already been greeted in this session. Do NOT greet them again. Do NOT say "Hi", "Hello", "Hey", or re-introduce yourself. Just answer their message directly and naturally as a continuation of the conversation.'
    : 'This may be the user\'s first message. If they greet you, greet them back warmly with "Hi! 👋". If they ask a question directly, answer it without a greeting.';

  return `IDENTITY: You are Jenny Smith, a friendly and knowledgeable team member at Techdataseeders. Always speak in the first person as Jenny. Never refer to yourself as a bot, assistant, or AI unless directly asked.

TONE: Be warm, conversational, and human-like. Use emojis occasionally (e.g. 👋 😊 🚀 💡 📊) to add personality, but don't overdo it. Avoid robotic or overly formal language. Write like you're chatting with a colleague, not reading from a FAQ.

RULES:
- Only answer questions about: services, industries, case studies, blog topics, company information, contact details, and general data extraction capabilities (web scraping, mobile app scraping, data APIs, analytics).
- If asked something off-topic (politics, general coding help, personal advice, medical, legal, gambling, homework), politely decline in a friendly way and steer back to Techdataseeders topics.
- PRICING: When the user asks about pricing, cost, quote, rate, or fee, do NOT give a vague 'custom pricing' reply. State that pricing depends on data volume and number of SKUs, then direct them to sales@techdataseeders.com and the office phone numbers: +1 650 519 1100 (USA), +91 8401481455 (India), +971 55 411 7867 (UAE). Keep it to 3–4 short lines. If the user mentions a specific platform (e.g. 'costing for amazon'), STILL answer with pricing info — pricing intent wins.
- Never invent client names, revenue figures, or SLA numbers not in the knowledge base.
- Keep replies under 120 words unless the user explicitly requests deep technical detail.
- Use markdown-lite: **bold** for emphasis. When linking to a service or industry, ALWAYS use a markdown link with a human-readable label, never a raw .html path. Examples:
  [Enterprise Web Scraping](/services/enterprise-web-scraping.html)
  [Mobile App Scraping](/services/mobile-app-scraping.html)
  [Custom Data API](/services/custom-data-api.html)
  [Data Analytics & Intelligence](/services/data-analytics-intelligence.html)
  [E-Commerce](/industries/ecomm.html)
  [Real Estate](/industries/real-estate.html)
  [Contact Us](/#contact)
  Never output a bare path like /services/... in a reply.
- End with a soft, friendly CTA when relevant (e.g., "Want a custom quote? Happy to connect you → [Contact Us](/#contact) 😊").
- GREETING RULE (critical — read carefully):
  - ${greetingRule}
  - In ALL subsequent messages after the first exchange, NEVER say "Hi", "Hello", or "Hey" again. Never re-introduce yourself. Never say "How can I help you today?" more than once per session. Just continue the conversation naturally as if talking to someone you already know.
- NO RE-GREETING (critical):
  - Once the user has been greeted in the current session, do NOT say "Hi", "Hello", "Hey", or any greeting again, even if the user says "hi" again.
  - If the user greets you again mid-conversation (e.g., "hi", "hello", "you there?"), respond casually and continue the conversation naturally. For example: "Hey again! 👋 What else can I help you with?" or "I'm here! What would you like to explore next?" — but do NOT restart with a full greeting or repeat the "How can I help you today?" line.
  - Treat any subsequent greeting as a casual check-in, not a new conversation.
- CRITICAL: NEVER re-introduce yourself after the first message. If the conversation history contains even one prior assistant message, skip all greetings and self-introductions — go straight to the answer.
- BAD example (forbidden after first msg): "Hey! 👋 I'm Jenny from Techdataseeders. We offer Enterprise Web Scraping..."
- GOOD example (direct answer): "We offer four core services: **Enterprise Web Scraping**, **Mobile App Scraping**, **Custom Data APIs**, and **Data Analytics & Intelligence**. Want details on any of these? 😊"

KNOWLEDGE BASE:
${JSON.stringify(context, null, 2)}`;
}

/**
 * Normalises a raw user query before rule matching:
 *   - lowercases + trims
 *   - maps common typos/synonyms to canonical tokens so every
 *     downstream regex only needs to match the canonical form.
 */
function normalizeQuery(q) {
  return String(q || '')
    .toLowerCase()
    .trim()
    .replace(/\bprising\b/g, 'pricing')
    .replace(/\bprise\b/g, 'price')
    .replace(/\bpric\b/g, 'price')
    .replace(/\bcosting\b/g, 'cost')
    .replace(/\bcater\b/g, 'cover')
    .replace(/\bservices?\b/g, 'service');
}

/**
 * Fallback rule-based matcher with zero external dependencies.
 * Order matters: pricing intent runs BEFORE platform / industry branches
 * so "costing for amazon" or "netflix pricing" correctly returns pricing.
 * The industries-list pattern no longer contains the greedy
 * "what ... can you scrape" alternative that previously hijacked
 * "what about amazon can you scrape it".
 */
function fallbackRuleMatcher(query, userAlreadyGreeted) {
  const q = normalizeQuery(query);

  // 1. Off-topic screening
  if (/\b(politics|president|election|coding|debug|python|javascript|typescript|c\+\+|java|c#|golang|ruby|php|react|angular|vue|algorithm|homework|math|medical|doctor|illness|disease|legal|lawyer|lawsuit|gamble|casino|betting|poker|dating|relationship|girlfriend|boyfriend)\b|write\s+(?:.*?\s+)?code|help\s+(?:.*?\s+)?(?:with\s+)?code/i.test(q)) {
    return "That's a bit outside my lane! 😄 My expertise is all things data \u2014 web scraping, mobile app data extraction, analytics, and custom APIs. Want me to tell you more about what Techdataseeders can do for your business? → [Contact Us](/#contact)";
  }

  // 2. Greetings — only when explicitly a greeting AND not already greeted
  if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening|howdy|yo)\b/i.test(q)) {
    if (userAlreadyGreeted) {
      return "Hey again! 👋 What else can I help you with? Still happy to answer any questions about web scraping, mobile app data, custom APIs, or analytics.";
    }
    const greetWord = q.startsWith('hi') ? 'Hi' : q.startsWith('hello') ? 'Hello' : 'Hey';
    return `${greetWord}! 👋 Great to meet you. I'm Jenny — how can I help you today? Whether it's [Enterprise Web Scraping](/services/enterprise-web-scraping.html), [Mobile App Scraping](/services/mobile-app-scraping.html), [Custom Data APIs](/services/custom-data-api.html), or [Data Analytics](/services/data-analytics-intelligence.html), I've got you covered. (Looking for a quote? → [Contact Us](/#contact) 😊)`;
  }

  // 3. PRICING — highest priority among topic intents
  //    Runs BEFORE platform / industry branches so "costing for amazon"
  //    or "netflix pricing" correctly returns the pricing reply.
  if (/\b(price|pricing|cost|quote|how much|rate|charge|plan|subscription|budget|estimate|fee)\b/i.test(q)) {
    return "💰 Pricing depends on your **data volume** and the **number of SKUs** you need to monitor, along with factors like refresh frequency and anti-bot complexity.\n\nFor a custom quote, please reach out to our sales team directly:\n📧 **sales@techdataseeders.com**\n📞 **+1 650 519 1100** (USA) · **+91 8401481455** (India) · **+971 55 411 7867** (UAE)\n\nOr drop us a message at [Contact Us](/#contact) 😊";
  }

  // 4. Case studies
  if (/\b(case study|case studies|portfolio|success stories|client story|track record)\b/i.test(q)) {
    return "Here are some highlights from our work 🚀\n- **Healthcare & Pharma**: Cut 90% of manual research time with real-time pricing & stock tracking.\n- **Omnichannel Retail**: 96% catalog matching across 100,000+ SKUs with 83% fewer duplicates.\n- **Food Delivery**: 22% customer reach growth via menu & sentiment intelligence.\n\nCheck out all 8 case studies at [Case Studies](/case-studies.html) 😊";
  }

  // 5. PLATFORM-SPECIFIC — must run BEFORE generic e-commerce and industries-list
  if (/\b(amazon|walmart|target|ebay|flipkart|etsy|shopify|alibaba|noon|jumia|instacart|costco)\b/i.test(q)) {
    const m = q.match(/\b(amazon|walmart|target|ebay|flipkart|etsy|shopify|alibaba|noon|jumia|instacart|costco)\b/i);
    const pretty = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    return `🛍️ Yes — we scrape **${pretty}** data as part of our **E-Commerce** solutions. We extract catalog listings, real-time prices, buyer reviews, stock levels, seller info, and Buy Box signals — delivered in JSON, CSV, or straight to your database.\n\nRead more → [E-Commerce](/industries/ecomm.html) or [Contact Us](/#contact) for a custom quote 😊`;
  }

  // 6. Industries-list
  //    The "what ... can you scrape" alternative has been REMOVED so it
  //    can no longer hijack "what about amazon can you scrape it".
  //    "cater" is mapped to "cover" by normalizeQuery above.
  if (/\b(what|which|list|name|tell me)\b.{0,20}\b(industries|sectors|verticals|domains|categories)\b/i.test(q)) {
    return "We scrape data across **8 major industries** 🌐\n- 🛒 **E-Commerce** — product catalogs, pricing, reviews\n- 🏬 **Retail** — pricing compliance, shelf analytics\n- 🏠 **Real Estate** — listings, rental trends, valuations\n- ✈️ **Travel & Hospitality** — hotel rates, flights, OTA data\n- 🍔 **Food & Beverages** — menus, pricing, delivery data\n- ⚡ **Quick Commerce** — dark store inventory, hyperlocal pricing\n- 💬 **Social Media** — posts, sentiment, influencer data\n- 🎬 **Entertainment & OTT** — content catalogs, ratings\n\nExplore more at [E-Commerce](/industries/ecomm.html) or [Contact Us](/#contact) 😊";
  }

  // 7. Mobile App Scraping
  if (/\b(mobile|ios|android|app scraping|app data|app store|play store)\b/i.test(q)) {
    return "📱 Our **Mobile App Scraping** service captures encrypted traffic, private app APIs, and app-only endpoints from both iOS and Android \u2014 with 99.9% uptime. Perfect for apps that have no web equivalent.\n\nLearn more → [Mobile App Scraping](/services/mobile-app-scraping.html)";
  }

  // 8. Custom Data API
  if (/\b(api|custom data api|rest api|graphql|feed|webhook|data delivery)\b/i.test(q)) {
    return "💡 Our **Custom Data API** builds low-latency REST or GraphQL endpoints and automated webhooks so clean, real-time data flows directly into your apps or pipelines.\n\nDetails here → [Custom Data API](/services/custom-data-api.html)";
  }

  // 9. Data Analytics
  if (/\b(analytics|intelligence|sentiment|dashboard|market research|reporting)\b/i.test(q)) {
    return "📊 Our **Data Analytics & Intelligence** service turns raw data into executive dashboards, competitor benchmarks, pricing trends, and sentiment insights.\n\nSee how it works → [Data Analytics & Intelligence](/services/data-analytics-intelligence.html)";
  }

  // 10. Quick Commerce
  if (/\b(q-commerce|quick commerce|dark store|zepto|blinkit|instamart|10 minute|10-minute)\b/i.test(q)) {
    return "⚡ In **Quick Commerce**, we track real-time hyperlocal SKU availability, dark-store pricing, and stockouts across Blinkit, Zepto, and Instamart.\n\nCheck out [Quick Commerce](/industries/q-commerce.html) 😊";
  }

  // 11. E-Commerce (generic — platform-specific already handled above)
  if (/\b(ecommerce|e-commerce|product pricing|catalog|product data|marketplace)\b/i.test(q)) {
    return "🛍️ For **E-Commerce** we extract catalog listings, real-time prices, buyer reviews, and stock levels across Amazon, Walmart, Target, eBay, Flipkart, and more.\n\nRead more → [E-Commerce](/industries/ecomm.html)";
  }

  // 12. Real Estate
  if (/\b(real estate|property|housing|rental|zillow|realtor|99acres|magicbricks)\b/i.test(q)) {
    return "🏠 Our **Real Estate** data intelligence captures property listings, rental yields, price history, and demographic data to power your valuation models.\n\nSee [Real Estate](/industries/real-estate.html)";
  }

  // 13. Travel
  if (/\b(hotel|travel|flight|airline|hospitality|booking|airbnb|expedia|ota)\b/i.test(q)) {
    return "✈️ In **Travel & Hospitality**, we monitor hotel room rates, airline pricing, OTA distribution, and seasonal availability to help maximise revenue.\n\nDetails → [Travel & Hospitality](/industries/travel-hotel.html)";
  }

  // 14. Food & Beverages
  if (/\b(food|restaurant|menu|beverage|doordash|ubereats|grubhub|zomato|swiggy|deliveroo|talabat)\b/i.test(q)) {
    return "🍔 For **Food & Beverages**, we extract restaurant menus, delivery aggregator pricing, customer review ratings, and fees across DoorDash, Uber Eats, Zomato, and more.\n\nExplore → [Food & Beverages](/industries/food-beverages.html)";
  }

  // 15. Social Media
  if (/\b(social media|influencer|instagram|linkedin|twitter|tiktok|social listening|reddit|facebook)\b/i.test(q)) {
    return "💬 For **Social Media**, we extract public sentiment, trending hashtags, influencer engagement, and brand share of voice.\n\nRead more → [Social Media](/industries/social-media.html)";
  }

  // 16. Entertainment & OTT
  if (/\b(ott|entertainment|streaming|netflix|disney|movies|shows|prime video|hulu)\b/i.test(q)) {
    return "🎬 In **Entertainment & OTT**, we track catalog availability, release dates, viewer ratings, and regional content across all major streaming platforms.\n\nLearn more → [Entertainment & OTT](/industries/entertainment-ott.html)";
  }

  // 17. GENERIC web scraping — LAST among topic branches
  if (/\b(web scraping|scrape|scraping|crawler|crawl|extract|extraction|enterprise web|website data|web data)\b/i.test(q)) {
    return "🌐 **Enterprise Web Scraping** is our flagship service. We provide end-to-end managed pipelines with anti-bot bypass (Cloudflare, Akamai), smart proxy rotation, and delivery in JSON, CSV, or straight to your database.\n\nExplore → [Enterprise Web Scraping](/services/enterprise-web-scraping.html)";
  }

  // 18. Contact
  if (/\b(contact|reach|phone|call|email|support|office|address|location|headquarters|san jose|ahmedabad|dubai)\b/i.test(q)) {
    return "📞 Here's where to find us:\n- **USA**: 1715 Lundy Ave, Suite 192, San Jose, CA (+1 650 519 1100)\n- **India**: 9th Floor, Sankalp Square 3B, Ahmedabad (+91 8401481455)\n- **Dubai, UAE**: Hamad Tower, Arjan (+971 55 411 7867)\n- **Email**: sales@techdataseeders.com\n\nOr drop us a message at [Contact Us](/#contact) 😊";
  }

  // 19. Blog
  if (/\b(blog|article|insights|guides)\b/i.test(q)) {
    return "📖 We publish deep-dives on web scraping strategies, AI extraction trends, and competitive intelligence. Check out our latest at [Blog](/blog/) \u2014 I think you'll find it handy!";
  }

  // 20. About
  if (/\b(about us|about techdataseeders|about the company|who are you|what is techdataseeders|company background|mission|vision)\b|^(about|company)$/i.test(q)) {
    return "**Techdataseeders** is a global leader in enterprise web scraping, mobile app data extraction, and intelligent automation \u2014 turning the open web into decision-ready data for businesses worldwide.\n\nCurious to learn more? Check our [About Us](/about.html) or [get in touch](/#contact) 😊";
  }

  // 21. Generic services enquiry
  if (/\b(service|what do you (do|offer)|offerings|solutions|capabilities)\b/i.test(q)) {
    return "We offer four core services:\n- 🌐 [Enterprise Web Scraping](/services/enterprise-web-scraping.html) — high-scale managed data pipelines.\n- 📱 [Mobile App Scraping](/services/mobile-app-scraping.html) — iOS & Android app data extraction.\n- 💡 [Custom Data API](/services/custom-data-api.html) — REST, GraphQL, and webhook delivery.\n- 📊 [Data Analytics & Intelligence](/services/data-analytics-intelligence.html) — dashboards, pricing intelligence, sentiment analysis.\n\nExplore or [Contact Us](/#contact) for a custom quote 🚀";
  }

  // 22. Default
  return "We specialize in **Enterprise Web Scraping**, **Mobile App Scraping**, **Custom Data APIs**, and **Data Analytics**. Whether you need competitor price monitoring, dark store tracking, or high-volume datasets, we build managed pipelines tailored to your needs.\n\nWhat data challenge can I help with? → [Contact Us](/#contact)";
}

/**
 * Call AI service (Gemini preferred, Anthropic as secondary), falling back
 * to the rule matcher if no provider is configured or all fail.
 */
async function getAssistantReply(userMessage, conversationHistory, userAlreadyGreeted) {
  const cleanQuery = String(userMessage || '').trim();

  // ─────────────────────────────────────────────────────────────
  // 1. Google Gemini Chat Completion (with retry + model fallback)
  // ─────────────────────────────────────────────────────────────
  if (process.env.GEMINI_API_KEY) {
    try {
      const systemPrompt = await buildSystemPrompt(userAlreadyGreeted);
      const messages = [];

      if (Array.isArray(conversationHistory)) {
        for (const item of conversationHistory.slice(-6)) {
          messages.push({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: item.content }]
          });
        }
      }

      messages.push({
        role: 'user',
        parts: [{ text: cleanQuery }]
      });

      const reply = await callGeminiWithFallback(systemPrompt, messages);
      if (reply) return reply;
    } catch (err) {
      console.error('[chatbot] Gemini orchestration error:', err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Anthropic Claude Completion (secondary fallback)
  // ─────────────────────────────────────────────────────────────
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const systemPrompt = await buildSystemPrompt(userAlreadyGreeted);
      const messages = [];

      if (Array.isArray(conversationHistory)) {
        for (const item of conversationHistory.slice(-6)) {
          messages.push({
            role: item.role === 'user' ? 'user' : 'assistant',
            content: item.content
          });
        }
      }

      messages.push({ role: 'user', content: cleanQuery });

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          system: systemPrompt,
          messages,
          max_tokens: 300
        })
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data?.content?.[0]?.text;
        if (reply) return reply.trim();
      } else {
        const errorText = await response.text();
        console.error('[chatbot] Anthropic API error:', response.status, errorText);
      }
    } catch (err) {
      console.error('[chatbot] Anthropic request failed:', err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Fallback rule-based matcher
  // ─────────────────────────────────────────────────────────────
  return fallbackRuleMatcher(cleanQuery, userAlreadyGreeted);
}

/**
 * Controller: POST /api/chat/request-otp
 */
async function requestOtp(req, res) {
  try {
    const { identifier, channel, countryCode } = req.body;

    if (!identifier || !channel) {
      return res.status(400).json({ success: false, message: 'Identifier and channel are required' });
    }

    if (channel !== 'email' && channel !== 'phone') {
      return res.status(400).json({ success: false, message: "Channel must be 'email' or 'phone'" });
    }

    let normalizedIdentifier = '';

    // Validate email channel
    if (channel === 'email') {
      const emailTrimmed = String(identifier).trim().toLowerCase();
      if (!EMAIL_REGEX.test(emailTrimmed)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
      }

      const domain = emailTrimmed.split('@')[1];
      if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
        return res.status(400).json({
          success: false,
          message: 'Disposable email addresses are not accepted. Please use a valid email.'
        });
      }

      normalizedIdentifier = emailTrimmed;
    }

    // Validate phone channel (kept defensively as fallback)
    if (channel === 'phone') {
      const rawPhone = String(identifier).trim();
      const code = String(countryCode || '+1').trim();

      // Check digits (6–15 digits)
      const digitsOnly = rawPhone.replace(/\D/g, '');
      if (digitsOnly.length < 6 || digitsOnly.length > 15) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid phone number (6 to 15 digits)'
        });
      }

      // Format E.164
      let e164 = rawPhone.startsWith('+') ? rawPhone : `${code}${rawPhone}`;
      e164 = '+' + e164.replace(/[^\d]/g, '');
      normalizedIdentifier = e164;

      // SMS configuration check
      if (!process.env.SMS_PROVIDER_URL) {
        return res.status(400).json({
          success: false,
          message: 'SMS channel not configured. Please use email verification.'
        });
      }
    }

    // Rate limiting: max 3 requests per identifier per 15 minutes
    const now = Date.now();
    const fifteenMinutesAgo = now - 15 * 60 * 1000;

    let history = otpRateLimitMap.get(normalizedIdentifier) || [];
    history = history.filter(ts => ts > fifteenMinutesAgo);

    if (history.length >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please wait 15 minutes before requesting a new code.'
      });
    }

    // Also check MongoDB collection for requests in the last 15 minutes
    const recentDbCount = await ChatVerification.countDocuments({
      identifier: normalizedIdentifier,
      createdAt: { $gt: new Date(fifteenMinutesAgo) }
    });

    if (recentDbCount >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please wait 15 minutes before requesting a new code.'
      });
    }

    // Generate 6-digit numeric OTP code
    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(now + 5 * 60 * 1000);

    // Save verification entry
    await ChatVerification.create({
      identifier: normalizedIdentifier,
      channel,
      codeHash,
      expiresAt,
      attempts: 0,
      verified: false,
      createdAt: new Date()
    });

    // Update in-memory rate limiter
    history.push(now);
    otpRateLimitMap.set(normalizedIdentifier, history);

    // Deliver OTP
    if (channel === 'email') {
      const emailResult = await sendOtpEmail({ email: normalizedIdentifier, otp: code });
      if (!emailResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to deliver verification email. Please check server email settings.'
        });
      }
    }

    return res.json({
      success: true,
      message: `Verification code sent to your ${channel}. Valid for 5 minutes.`
    });
  } catch (error) {
    console.error('[chatbot] Error in requestOtp:', error);
    return res.status(500).json({ success: false, message: 'Server error requesting OTP' });
  }
}

/**
 * Controller: POST /api/chat/verify-otp
 */
async function verifyOtp(req, res) {
  try {
    const { identifier, code } = req.body;

    if (!identifier || !code) {
      return res.status(400).json({ success: false, message: 'Identifier and OTP code are required' });
    }

    const normalizedIdentifier = String(identifier).trim().toLowerCase();

    // Find the latest active verification record
    const record = await ChatVerification.findOne({
      identifier: normalizedIdentifier,
      verified: false
    }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'No pending verification found. Please request a new code.'
      });
    }

    // Check expiration
    if (new Date() > record.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.'
      });
    }

    // Check attempts limit
    if (record.attempts >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new code.'
      });
    }

    // Compare code
    const isMatch = await bcrypt.compare(String(code).trim(), record.codeHash);
    if (!isMatch) {
      record.attempts += 1;
      await record.save();
      const remaining = 5 - record.attempts;
      return res.status(400).json({
        success: false,
        message: `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      });
    }

    // Mark as verified
    record.verified = true;
    await record.save();

    // Initialize or touch chat session timer starting from verification
    await touchChatSession(record.identifier);

    // Sign chat token (expires in 2h)
    const jwtSecret = process.env.JWT_SECRET || 'TechDS1!';
    const chatToken = jwt.sign(
      { identifier: record.identifier, channel: record.channel },
      jwtSecret,
      { expiresIn: '2h' }
    );

    return res.json({
      success: true,
      chatToken,
      message: 'Verified successfully'
    });
  } catch (error) {
    console.error('[chatbot] Error in verifyOtp:', error);
    return res.status(500).json({ success: false, message: 'Server error during verification' });
  }
}

/**
 * Middleware helper to authenticate JWT chat token
 */
function verifyChatToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  try {
    const jwtSecret = process.env.JWT_SECRET || 'TechDS1!';
    return jwt.verify(token, jwtSecret);
  } catch (err) {
    return null;
  }
}

/**
 * Controller: POST /api/chat/message (JWT protected)
 */
async function sendChatMessage(req, res) {
  try {
    const userPayload = verifyChatToken(req);
    if (!userPayload) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired chat token' });
    }

    // Reset inactivity timer on every incoming message
    await touchChatSession(userPayload.identifier);

    const { message, userAlreadyGreeted } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Sanitize input: strip tags, max 1000 chars
    const sanitized = message.replace(/<[^>]*>?/gm, '').trim().slice(0, 1000);
    if (!sanitized) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    // Persist user message
    await ChatMessage.create({
      identifier: userPayload.identifier,
      role: 'user',
      content: sanitized,
      createdAt: new Date()
    });

    // Retrieve recent conversation history for context
    const recentMessages = await ChatMessage.find({ identifier: userPayload.identifier })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    recentMessages.reverse();

    // Strip the bot's auto-generated intro message from history so the AI
    // doesn't see it as a template to repeat on every subsequent reply.
    const cleanedHistory = recentMessages.filter(function (msg) {
      if (msg.role === 'assistant' &&
          (msg.content.includes("I'm Jenny") ||
           msg.content.includes("I'm Jenny") ||
           msg.content.includes("So happy you\u2019re here") ||
           msg.content.includes("So happy you're here"))) {
        return false;
      }
      return true;
    });

    const alreadyGreeted = Boolean(userAlreadyGreeted);

    // Generate AI or rule-based reply
    const botReply = await getAssistantReply(sanitized, cleanedHistory, alreadyGreeted);

    // Only strip the intro on replies that are NOT the first assistant message.
    // cleanedHistory already has the intro filtered out, so counting assistant
    // messages in recentMessages gives us the true conversation position.
    const isFirstMessage = !alreadyGreeted && recentMessages.filter(m => m.role === 'assistant').length === 0;
    const finalReply = isFirstMessage ? botReply : stripIntro(botReply);

    // Mimic human typing / thinking time (3–5 seconds).
    // The user's message is already persisted above, so no data is lost on refresh.
    await humanDelay();

    // Persist the final (sanitized) reply
    await ChatMessage.create({
      identifier: userPayload.identifier,
      role: 'assistant',
      content: finalReply,
      createdAt: new Date()
    });

    return res.json({
      success: true,
      reply: finalReply
    });
  } catch (error) {
    console.error('[chatbot] Error in sendChatMessage:', error);
    return res.status(500).json({ success: false, message: 'Server error processing chat message' });
  }
}

/**
 * Controller: GET /api/chat/history (JWT protected)
 */
async function getChatHistory(req, res) {
  try {
    const userPayload = verifyChatToken(req);
    if (!userPayload) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired chat token' });
    }

    const messages = await ChatMessage.find({ identifier: userPayload.identifier })
      .sort({ createdAt: 1 })
      .limit(50)
      .lean();

    return res.json({
      success: true,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt
      }))
    });
  } catch (error) {
    console.error('[chatbot] Error in getChatHistory:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving history' });
  }
}

module.exports = {
  requestOtp,
  verifyOtp,
  sendChatMessage,
  getChatHistory,
  fallbackRuleMatcher,
  startChatTranscriptScheduler
};