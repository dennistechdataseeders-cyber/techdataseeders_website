// ============================================================
// SCHEMA BUILDER MODULE - Techdataseeders
// Reusable Schema.org JSON-LD generation helpers
// ============================================================

const SITE_URL = 'https://techdataseeders.com';
const DEFAULT_LOGO = 'https://res.cloudinary.com/dhcwcyqke/image/upload/v1787127332/tds-icon_jflapc.webp';

/**
 * Converts any date format to YYYY-MM-DD.
 * Falls back to today's date if unparseable.
 */
function formatDate(dateVal) {
  if (!dateVal) {
    return new Date().toISOString().split('T')[0];
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) {
    return new Date().toISOString().split('T')[0];
  }
  return d.toISOString().split('T')[0];
}

/**
 * Resolves image URL. Prepends site URL if path starts with '/',
 * or falls back to Cloudinary logo if missing.
 */
function resolveImageUrl(img) {
  if (!img || typeof img !== 'string' || !img.trim()) {
    return DEFAULT_LOGO;
  }
  const trimmed = img.trim();
  if (trimmed.startsWith('/')) {
    return `${SITE_URL}${trimmed}`;
  }
  return trimmed;
}

/**
 * Strips leading numbers/bullets like "1. ", "2) ", "Q1: ", etc. from question strings.
 */
function cleanQuestionText(raw) {
  if (!raw) return '';
  let q = String(raw).trim();
  if (q.startsWith('**') && q.endsWith('**') && q.length > 4) {
    q = q.slice(2, -2).trim();
  }
  q = q.replace(/^#{2,4}\s*/, '');
  q = q.replace(/^(?:Q\d+[:.]|\d+[\.\)])\s*/i, '').trim();
  return q;
}

/**
 * Normalizes answer text from markdown array.
 */
function cleanAnswerText(linesArr) {
  return linesArr
    .map(l => String(l).trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\[(.+?)\]\([^)]+\)/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .trim();
}

/**
 * Extracts FAQs from blog post markdown body.
 * Supports:
 *   1. Explicit "## FAQ" section with bold/header questions
 *   2. Standalone "**Question?**" or "**1. Question?**" lines
 * Returns array of { question, answer } or null if no FAQs found.
 */
function extractFaqs(md) {
  if (!md || typeof md !== 'string') return null;
  const lines = md.split(/\r?\n/);
  const faqs = [];

  let inFaqSection = false;
  let currentQ = null;
  let currentA = [];

  // Pass 1: Explicit ## FAQ section
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (/^##\s+.*faq/i.test(line)) {
      inFaqSection = true;
      if (currentQ && currentA.length > 0) {
        const ans = cleanAnswerText(currentA);
        if (ans) faqs.push({ question: currentQ, answer: ans });
        currentQ = null;
        currentA = [];
      }
      continue;
    }

    if (inFaqSection) {
      if (/^##\s+/i.test(line) && !/faq/i.test(line)) {
        if (currentQ && currentA.length > 0) {
          const ans = cleanAnswerText(currentA);
          if (ans) faqs.push({ question: currentQ, answer: ans });
          currentQ = null;
          currentA = [];
        }
        inFaqSection = false;
        break;
      }

      const isBold = line.startsWith('**') && line.endsWith('**') && line.length > 4;
      const isH3 = line.startsWith('### ');
      const looksLikeQuestion = isBold || isH3 || line.endsWith('?');

      if (looksLikeQuestion) {
        if (currentQ && currentA.length > 0) {
          const ans = cleanAnswerText(currentA);
          if (ans) faqs.push({ question: currentQ, answer: ans });
        }
        currentQ = cleanQuestionText(line);
        currentA = [];
      } else if (currentQ) {
        currentA.push(line);
      }
    }
  }

  if (inFaqSection && currentQ && currentA.length > 0) {
    const ans = cleanAnswerText(currentA);
    if (ans) faqs.push({ question: currentQ, answer: ans });
  }

  // Pass 2: Standalone question lines with question marks if no ## FAQ heading was found
  if (faqs.length === 0) {
    let standaloneQ = null;
    let standaloneA = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const isStandaloneQ = /^\*\*(?:\d+[\.\)]\s*)?[^*]+?\?\*\*$/.test(line);
      if (isStandaloneQ) {
        if (standaloneQ && standaloneA.length > 0) {
          const ans = cleanAnswerText(standaloneA);
          if (ans) faqs.push({ question: standaloneQ, answer: ans });
        }
        standaloneQ = cleanQuestionText(line);
        standaloneA = [];
      } else if (line.startsWith('#')) {
        if (standaloneQ && standaloneA.length > 0) {
          const ans = cleanAnswerText(standaloneA);
          if (ans) faqs.push({ question: standaloneQ, answer: ans });
        }
        standaloneQ = null;
        standaloneA = [];
      } else if (standaloneQ) {
        standaloneA.push(line);
      }
    }

    if (standaloneQ && standaloneA.length > 0) {
      const ans = cleanAnswerText(standaloneA);
      if (ans) faqs.push({ question: standaloneQ, answer: ans });
    }
  }

  return faqs.length > 0 ? faqs : null;
}

/**
 * Builds Article Schema matching exact SEO template.
 */
function buildArticleSchema({
  title,
  description,
  canonicalUrl,
  imageUrl,
  datePublished,
  dateModified
}) {
  const published = formatDate(datePublished);
  const modified = dateModified ? formatDate(dateModified) : published;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl
    },
    "headline": title,
    "description": description || '',
    "image": resolveImageUrl(imageUrl),
    "author": {
      "@type": "Organization",
      "name": "techdataseeders",
      "url": `${SITE_URL}/`
    },
    "publisher": {
      "@type": "Organization",
      "name": "Techdataseeders",
      "logo": {
        "@type": "ImageObject",
        "url": DEFAULT_LOGO
      }
    },
    "datePublished": published,
    "dateModified": modified
  };
}

/**
 * Builds FAQ Schema matching exact SEO template.
 * Returns null if faqs is empty or null.
 */
function buildFaqSchema(faqs) {
  if (!faqs || !Array.isArray(faqs) || faqs.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };
}

/**
 * Builds BreadcrumbList Schema matching exact SEO template.
 * items: Array of { name: string, item: string }
 */
function buildBreadcrumbSchema(items) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": crumb.item
    }))
  };
}

/**
 * Builds Service Schema.
 */
function buildServiceSchema({
  name,
  description,
  canonicalUrl
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": name,
    "description": description || '',
    "url": canonicalUrl,
    "provider": {
      "@type": "Organization",
      "name": "Techdataseeders",
      "url": `${SITE_URL}/`,
      "logo": {
        "@type": "ImageObject",
        "url": DEFAULT_LOGO
      }
    }
  };
}

/**
 * Builds WebPage Schema (for Industry pages).
 */
function buildWebPageSchema({
  name,
  description,
  canonicalUrl
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": name,
    "description": description || '',
    "url": canonicalUrl,
    "publisher": {
      "@type": "Organization",
      "name": "Techdataseeders",
      "logo": {
        "@type": "ImageObject",
        "url": DEFAULT_LOGO
      }
    }
  };
}

/**
 * Builds CollectionPage Schema.
 */
function buildCollectionPageSchema({
  name,
  description,
  canonicalUrl
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": name,
    "description": description || '',
    "url": canonicalUrl
  };
}

/**
 * Builds ItemList Schema.
 * items: Array of { name: string, url: string }
 */
function buildItemListSchema({
  name,
  items
}) {
  const listItems = Array.isArray(items) ? items : [];
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": name,
    "numberOfItems": listItems.length,
    "itemListElement": listItems.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "url": item.url
    }))
  };
}

module.exports = {
  SITE_URL,
  DEFAULT_LOGO,
  formatDate,
  resolveImageUrl,
  cleanQuestionText,
  cleanAnswerText,
  extractFaqs,
  buildArticleSchema,
  buildFaqSchema,
  buildBreadcrumbSchema,
  buildServiceSchema,
  buildWebPageSchema,
  buildCollectionPageSchema,
  buildItemListSchema
};
