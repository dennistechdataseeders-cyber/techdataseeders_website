/* ============================================================
   TechDataSeeders — Blog Store
   Shared data + render helpers for the dynamic blog system.
   - Public pages read the PUBLISHED data (data/blogs.json).
   - The admin panel keeps a working copy in localStorage and
     exports an updated blogs.json to publish.
   Configure per page (before this script loads) with:
     window.BLOGS_PATH  -> path to blogs.json   (default './data/blogs.json')
     window.POST_BASE   -> base path to blog/    (default './blog/')
   ============================================================ */
(function (global) {
  'use strict';

  var BLOGS_PATH = global.BLOGS_PATH || './data/blogs.json';
  var POST_BASE  = global.POST_BASE  || './blog/';
  var LS_KEY     = 'tds_admin_blogs_v1';

  /* ---- preset card gradients ---- */
  var GRADIENTS = {
    blue:    'linear-gradient(135deg,#0d1b4b 0%,#1a4fd6 50%,#2563FF 100%)',
    green:   'linear-gradient(135deg,#064e3b 0%,#059669 50%,#10b981 100%)',
    purple:  'linear-gradient(135deg,#2e1065 0%,#5b21b6 50%,#7c3aed 100%)',
    magenta: 'linear-gradient(135deg,#4d1a3d 0%,#9d4edd 50%,#c77dff 100%)',
    teal:    'linear-gradient(135deg,#1a4d3d 0%,#2d9d6e 50%,#52b788 100%)',
    navy:    'linear-gradient(135deg,#0d1840 0%,#162050 60%,#2563FF 100%)'
  };

  /* ---- preset outline icons (inner SVG) ---- */
  var ICONS = {
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>',
    activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    shield:   '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    clock:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    chart:    '<path d="M3 21h18"/><path d="M7 21V10"/><path d="M12 21V4"/><path d="M17 21v-7"/>',
    doc:      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    globe:    '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>',
    star:     '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8l-6.2 3.3L7 14.2l-5-4.9 6.9-1z"/>',
    bulb:     '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2v.3h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/>'
  };

  /* ---- default seed posts (fallback when blogs.json can't be fetched, e.g. file://) ---- */
  var DEFAULT_BLOGS = [
    {
      slug: "automated-product-matching-a-complete-guide-to-boost-conversions",
      title: "Automated Product Matching: A Complete Guide to Boost Conversions",
      category: "eCommerce",
      author: "Dataseeders Team",
      date: "Feb 3, 2025",
      readTime: "5 min read",
      icon: "globe",
      gradient: "green",
      heroImage: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1400&q=80",
      excerpt: "In today's digital commerce landscape, customers expect accurate product information, relevant recommendations, and seamless shopping experiences. However, retailers, marketplaces, manufacturers, and comparison platforms often manage thousands—or eve",
      tags: ["eCommerce"],
      body: "> \"Customers compare products instantly. Businesses that connect and understand those products accurately gain a powerful competitive advantage.\"\n\n## Why Product Matching Has Become a Business Priority\n\nModern eCommerce ecosystems are more fragmented than ever.\nA single smartphone, laptop, appliance, or beauty product may be listed across dozens of websites with slightly different:\n- Product titles\n- Descriptions\n- Attributes\n- Images\n- SKUs\n- Seller information\n- Pricing structures\n\nWithout proper matching, businesses often struggle to understand whether listings represent the same product or entirely different items.\nThis creates challenges for pricing, catalog management, analytics, and customer experience.\n\n## What Is Automated Product Matching?\n\nAutomated Product Matching is the process of identifying and linking identical or highly similar products across multiple sources using technology, data models, and intelligent matching algorithms.\nRather than relying on manual review, businesses can automatically compare:\n**Product Titles** — Identify similar products despite naming variations.\n**Product Specifications** — Compare attributes such as size, color, capacity, brand, and model number.\n**Product Identifiers** — Match based on UPCs, GTINs, EANs, manufacturer codes, or internal SKUs.\n**Product Images** — Analyze visual similarities when textual information is inconsistent.\n\n## Marketplace Listings\n\nConnect products across retailers, marketplaces, and supplier catalogs.\nThe result is a unified view of product information across multiple channels.\n\n## Why Accurate Product Matching Drives Higher Conversions\n\nMany organizations view product matching as a back-end data process.\nIn reality, it directly impacts customer purchasing decisions.\n**Better Price Comparison** — Customers can compare equivalent products accurately across sellers and marketplaces.\n**Improved Product Discovery** — Cleaner product relationships improve search and recommendation accuracy.\n**Enhanced Catalog Quality** — Eliminate duplicate listings and inconsistent product information.\n**Smarter Pricing Strategies** — Benchmark pricing against truly comparable products.\n\n## Stronger Customer Experience\n\nReduce confusion caused by duplicate or inaccurate product listings.\nWhen shoppers find accurate information faster, they are more likely to complete a purchase.\n\n## How Techdataseeders Helps\n\nAt Techdataseeders, we help businesses create scalable product intelligence systems through advanced product matching, data extraction, and analytics solutions.\nOur capabilities include:\n- Product catalog matching\n- Marketplace product mapping\n- SKU normalization\n- Product attribute extraction\n- Catalog enrichment\n- Competitor benchmarking\n- Product relationship analysis\n- Cross-platform product intelligence\n\nBy combining large-scale web data collection with intelligent matching techniques, businesses gain a more accurate view of their products and markets.\n\n## A Real-World Scenario\n\nAn online electronics retailer wanted to benchmark pricing across multiple marketplaces.\nThe challenge was that the same products appeared under different listing formats across websites.\nFor example:\n- Different title structures\n- Inconsistent model naming\n- Missing product attributes\n- Marketplace-specific descriptions\n\nAfter implementing automated product matching, the retailer was able to accurately connect equivalent products across thousands of listings.\n\n## Business Impact\n\nThe company gained:\n- More reliable pricing comparisons\n- Better competitor visibility\n- Improved product recommendations\n- Higher catalog accuracy\n- Faster decision-making\n\nMost importantly, customers received more relevant product suggestions and comparison options, contributing to stronger engagement and conversion performance.\n**Industries Benefiting from Product Matching** — Automated product matching delivers value across multiple sectors.\n**Retail & E-Commerce** — Maintain clean catalogs and improve product discovery.\n**Online Marketplaces** — Connect millions of listings from different sellers.\n**Consumer Electronics** — Compare products accurately across retailers.\n**Automotive** — Match vehicle parts and accessories across catalogs.\n**Healthcare & Medical Supplies** — Standardize product information from multiple suppliers.\n**Manufacturing & Distribution** — Improve supplier catalog integration and procurement efficiency.\n\n## The Growing Need for Product Intelligence\n\nAs online product catalogs continue to expand, businesses face increasing pressure to maintain data quality.\nSeveral trends are driving adoption:\n- Growth of multi-channel commerce\n- Expansion of online marketplaces\n- Increased product assortment sizes\n- Rising customer expectations\n- Greater emphasis on pricing intelligence\n- Demand for personalized shopping experiences\n- These trends make automated product matching a critical component of modern commerce operations.\n\n## Where Businesses See the Biggest Gains\n\nOrganizations implementing product matching solutions often improve their ability to:\n\n- Eliminate duplicate listings\n- Improve catalog quality\n- Increase pricing accuracy\n- Enhance product recommendations\n- Support marketplace intelligence\n- Improve customer experience\n- Strengthen analytics and reporting\n- Increase conversion opportunities\n\n## Looking Beyond Product Data\n\nProduct matching becomes even more valuable when combined with:\n- Pricing intelligence\n- Competitor monitoring\n- Inventory analytics\n- Marketplace tracking\n- Customer behavior insights\n- Product performance reporting\n- Together, these capabilities create a complete product intelligence ecosystem.\n\n## Conclusion\n\nAs product catalogs grow larger and more complex, accurate product matching is becoming essential for retailers, marketplaces, manufacturers, and distributors.\nBusinesses that can correctly identify equivalent products across multiple sources gain cleaner data, stronger pricing visibility, better customer experiences, and more informed decision-making.\nAt Techdataseeders, we help organizations build scalable product intelligence solutions through advanced data extraction, catalog matching, enrichment, and analytics capabilities.\nIn today's competitive digital marketplace, product matching is no longer just a data management task it's a strategic advantage that directly supports growth and conversion performance."
    },
    {
      slug: "how-web-scraping-apis-power-real-time-product-monitoring",
      title: "How Web Scraping APIs Power Real-Time Product Monitoring",
      category: "Web Scraping",
      author: "Dataseeders Team",
      date: "Oct 3, 2025",
      readTime: "4 min read",
      icon: "star",
      gradient: "green",
      heroImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1400&q=80",
      excerpt: "In today's highly competitive eCommerce landscape, product information changes constantly. Prices fluctuate, inventory levels shift, promotions launch and expire, and new products enter the market every day. For retailers, brands, manufacturers, mark",
      tags: ["Web Scraping", "Real-Time Data"],
      body: "> \"The difference between market leaders and followers often comes down to who identifies product and pricing changes first.\"\n\n## The Challenge\n\nModern businesses operate in a rapidly changing digital marketplace.\nOrganizations often struggle with:\n- Tracking competitor pricing across hundreds of websites.\n- Monitoring stock availability in real time.\n- Identifying new product launches.\n- Analyzing promotional campaigns.\n- Maintaining accurate product catalogs.\n- Detecting unauthorized sellers and pricing violations.\n- Monitoring marketplace performance.\n- Managing millions of product records across multiple regions.\n- As product data grows, manual monitoring becomes expensive, inaccurate, and unsustainable.\n\n## Why Real-Time Product Monitoring Matters\n\nA competitor can change product pricing multiple times a day.\nAn out-of-stock product can suddenly become available.\nA new promotion can significantly impact market demand.\nWithout real-time visibility, businesses risk:\n- Losing sales opportunities\n- Falling behind competitors\n- Missing market trends\n- Making pricing decisions based on outdated information\n- This is why real-time product intelligence has become a strategic advantage.\n\n## How Techdataseeders Helps\n\nAt Techdataseeders, we provide enterprise-grade Web Scraping APIs and data intelligence solutions that enable organizations to monitor products, pricing, inventory, and marketplace activity at scale.\nOur solutions help businesses collect:\n\n## Product Information\n\nProduct titles\nDescriptions\nSpecifications\nCategories\nBrand information\nSKU details\n\n## Pricing Intelligence\n\nCurrent prices\nHistorical pricing trends\nDiscount tracking\nPromotional monitoring\nDynamic pricing changes\n\n## Inventory Monitoring\n\nStock availability\nOut-of-stock alerts\nInventory fluctuations\nProduct availability by region\n\n## Marketplace Intelligence\n\nSeller information\nProduct rankings\nBuy Box monitoring\nMarketplace competition analysis\n\n## Turning Product Data into Business Intelligence\n\nCollecting product data is only the beginning.\nThe true value lies in analyzing that data to uncover opportunities and risks.\nTechdataseeders helps organizations generate:\n**Competitive Pricing Intelligence** — Monitor competitor pricing strategies and identify pricing opportunities.\n**Product Trend Analysis** — Discover emerging products, fast-growing categories, and shifting consumer demand.\n**Inventory Intelligence** — Track stock availability to understand market demand and supply patterns.\n**Market Share Monitoring** — Analyze product visibility, rankings, and competitive positioning.\n**Brand Protection Insights** — Identify unauthorized sellers, pricing inconsistencies, and marketplace violations.\n**Industry Insights & Market Statistics** — The importance of product monitoring continues to grow as global eCommerce expands.\n\n## Key Industry Facts\n\n## Global eCommerce sales are projected to exceed $8 trillion annually by 2028.\n\nMillions of product prices change every day across online marketplaces.\nMore than 80% of consumers compare prices online before making a purchase.\nDynamic pricing strategies have become standard practice among leading retailers.\nReal-time inventory visibility is now a critical factor in customer satisfaction and operational efficiency.\nAs digital commerce becomes increasingly competitive, businesses need continuous access to reliable product intelligence.\n\n## Real-World Example\n\nA consumer electronics retailer wanted to improve pricing competitiveness across multiple online marketplaces.\nUsing Techdataseeders' Web Scraping API solution, the company monitored:\n- Competitor product listings\n- Price changes\n- Inventory availability\n- Promotional campaigns\n- Product rankings\n- Seller activity\n\n**Key Discovery** — Several competitors were automatically adjusting prices throughout the day, allowing them to consistently appear as the lowest-priced option.\n**Action Taken** — The retailer implemented data-driven pricing strategies based on real-time market intelligence.\n\n## Business Impact\n\nImproved pricing competitiveness\nFaster response to market changes\nIncreased product visibility\nHigher conversion rates\nBetter revenue optimization\n\n## Why Businesses Choose Techdataseeders\n\nTechdataseeders delivers more than raw product data.\nWe help organizations build scalable product intelligence ecosystems through:\n\n- Web Scraping APIs\n- Real-Time Product Monitoring\n- Pricing Intelligence Solutions\n- Inventory Tracking Systems\n- Marketplace Analytics\n- Competitor Intelligence\n- Product Data Enrichment\n- Custom Data Pipelines\n- Business Intelligence Dashboards\n- Enterprise Analytics Solutions\n\n## The Results\n\nOrganizations leveraging real-time product monitoring achieve:\n\n- Better pricing decisions\n- Faster market response\n- Increased competitive visibility\n- Improved inventory management\n- Stronger marketplace positioning\n- Enhanced customer experience\n- Higher operational efficiency\n- Data-driven business growth\n\n## Conclusion\n\nIn an increasingly dynamic eCommerce environment, real-time product monitoring is no longer optional—it's essential.\nWeb Scraping APIs empower businesses to continuously monitor products, pricing, inventory, and market activity, enabling smarter decisions and faster responses to changing market conditions.\nAt Techdataseeders, we help organizations transform large-scale web data into actionable product intelligence through scalable extraction, enrichment, and analytics solutions that drive measurable business outcomes."
    },
    {
      slug: "why-competitor-price-tracking-is-important-for-businesses-in-2026",
      title: "Why Competitor Price Tracking Is Important for Businesses in 2026",
      category: "Price Intelligence",
      author: "Dataseeders Team",
      date: "May 25, 2026",
      readTime: "5 min read",
      icon: "activity",
      gradient: "magenta",
      heroImage: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1400&q=80",
      excerpt: "In 2026, pricing is no longer something businesses review once a week or even once a day. Across eCommerce platforms, retail websites, marketplaces, travel portals, food delivery apps, and service industries, prices change constantly. Customers can c",
      tags: ["Price Intelligence", "Pricing"],
      body: "> \"Your competitors are telling you a story through their pricing. The question is whether you're paying attention.\"\n\n## The Hidden Signals Behind Every Price Change\n\nMost businesses view pricing as a number.\nSuccessful businesses view it as a market signal.\nWhen a competitor suddenly reduces prices, several things could be happening:\n- Excess inventory\n- Seasonal demand shifts\n- New product launches\n- Aggressive customer acquisition efforts\n- Market share expansion strategies\n- Similarly, when competitors increase prices, it may indicate:\n- Strong demand\n- Supply constraints\n- Premium positioning\n- Reduced market competition\n- Price changes often reveal what's happening behind the scenes long before official reports become available.\n\n## Why Businesses Lose Revenue Without Realizing It\n\nOne of the biggest challenges in modern commerce is invisible revenue loss.\nImagine a company selling 5,000 products online.\nIf competitors quietly adjust pricing on a handful of high-volume products, the business may not notice immediately.\nOver time, this can lead to:\n- Lower conversion rates\n- Reduced visibility\n- Declining market share\n- Customer migration to competitors\n- By the time sales reports reveal the problem, the market has already moved.\n- Competitor price tracking helps businesses identify these shifts early.\n\n## It's Not About Being the Cheapest\n\nA common misconception is that price tracking exists to support discounting.\nIn reality, constantly lowering prices can damage profitability and brand perception.\nThe smartest companies use competitive intelligence to answer questions such as:\n- Which products require pricing adjustments?\n- Which products can support premium pricing?\n- Where are competitors becoming aggressive?\n- Which categories are experiencing demand growth?\n- How sensitive are customers to pricing changes?\n- The goal is smarter positioning, not price wars.\n\n## How Different Industries Use Competitor Pricing Intelligence\n\n**Retail & E-Commerce** — Monitor SKU-level pricing, promotions, and marketplace activity to improve competitiveness.\n**Travel & Hospitality** — Track hotel rates, airline fares, and accommodation pricing to optimize revenue management.\n**Food Delivery** — Analyze menu prices, delivery fees, and restaurant promotions across delivery platforms.\n**Car Rentals** — Monitor rental rates by location, season, and demand conditions.\n\n## Consumer Goods\n\nBenchmark products against competing brands across online and offline channels.\nCompetitor intelligence has become relevant far beyond traditional retail.\n\n## How Techdataseeders Helps Businesses Stay Ahead\n\nAt Techdataseeders, we help organizations collect and analyze large-scale pricing intelligence from websites, marketplaces, booking platforms, and digital commerce channels.\nOur solutions help businesses monitor:\n- Competitor prices\n- Promotional campaigns\n- Product availability\n- Market trends\n- Pricing fluctuations\n- Category performance\n- Regional pricing differences\n- Marketplace activity\n- Rather than overwhelming businesses with data, we focus on delivering intelligence that supports better decisions.\n\n## A Real-World Example\n\nA consumer electronics distributor noticed declining sales for a category that had historically performed well.\nInitial assumptions pointed toward weaker customer demand.\nHowever, a deeper analysis revealed something different.\nSeveral competitors had begun bundling complementary products while maintaining nearly identical prices.\nCustomers perceived these bundles as offering greater value, despite minimal pricing differences.\nThe company adjusted its offer structure rather than lowering prices.\nThe result was improved competitiveness without sacrificing margins.\nThis highlights an important lesson:\n- Sometimes the issue isn't the price itself—it's the context surrounding it.\n\n## What Will Change in 2026 and Beyond?\n\nBusinesses are moving away from static pricing models.\nKey trends include:\n**Faster Pricing Cycles** — Prices can change multiple times within a day.\n**AI-Powered Pricing Strategies** — Companies increasingly use automation and analytics to guide decisions.\n**Greater Customer Transparency** — Consumers have more pricing information available than ever before.\n**Cross-Platform Competition** — Businesses compete across websites, marketplaces, apps, and aggregators simultaneously.\n**Data-Driven Decision Making** — Pricing strategies are becoming increasingly dependent on market intelligence rather than intuition.\n**The Questions Every Business Should Be Asking** — Instead of asking:\n\n## \"Are our prices competitive?\"\n\nBusinesses should ask:\n- Where are competitors gaining traction?\n- Which products are most vulnerable?\n- Which categories offer margin opportunities?\n- What pricing patterns indicate changing demand?\n- How quickly can we respond to market shifts?\n- These questions often provide more valuable answers than pricing alone.\n\n## The Business Impact of Better Visibility\n\nOrganizations that actively monitor competitor pricing often improve their ability to:\n\n- Protect profit margins\n- Improve pricing confidence\n- React faster to market changes\n- Identify competitive threats\n- Discover growth opportunities\n- Support revenue optimization\n- Improve forecasting accuracy\n- Strengthen market positioning\n\n## Conclusion\n\nIn 2026, competitor price tracking is no longer just a pricing exercise—it's a market intelligence strategy.\nEvery pricing decision made by competitors provides clues about customer demand, inventory conditions, market trends, and business priorities.\nOrganizations that understand these signals gain a significant advantage over those relying solely on internal data.\nAt Techdataseeders, we help businesses transform pricing data into meaningful competitive intelligence through advanced extraction, monitoring, and analytics solutions.\nBecause in today's market, understanding competitor behavior is often just as important as understanding your own."
    }
  ];

  /* ---------------- helpers ---------------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function inline(s) { // escape then apply **bold**
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }
  function gradientOf(p) { return GRADIENTS[p && p.gradient] || GRADIENTS.blue; }
  function iconOf(p) { return ICONS[p && p.icon] || ICONS.database; }
  function postUrl(slug) { return POST_BASE + 'post.html?slug=' + encodeURIComponent(slug); }

  function slugify(s) {
    return String(s || '').toLowerCase().trim()
      .replace(/['"]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
  }

  /* render markdown-lite body to HTML */
  function renderBody(md) {
    var lines = String(md || '').split(/\r?\n/);
    var html = '', listOpen = false;
    function closeList() { if (listOpen) { html += '</ul>'; listOpen = false; } }
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) { closeList(); continue; }
      if (line.indexOf('## ') === 0) { closeList(); html += '<h2>' + inline(line.slice(3)) + '</h2>'; }
      else if (line.indexOf('### ') === 0) { closeList(); html += '<h3>' + inline(line.slice(4)) + '</h3>'; }
      else if (line.indexOf('> ') === 0) { closeList(); html += '<blockquote class="bd-quote"><p>' + inline(line.slice(2)) + '</p></blockquote>'; }
      else if (line.indexOf('- ') === 0) { if (!listOpen) { html += '<ul>'; listOpen = true; } html += '<li>' + inline(line.slice(2)) + '</li>'; }
      else { closeList(); html += '<p>' + inline(line) + '</p>'; }
    }
    closeList();
    return html;
  }

  /* a blog card (used on listing + homepage + related) */
  function cardHTML(p) {
    var artContent = p.heroImage
      ? '<img src="' + esc(p.heroImage) + '" alt="' + esc(p.title) + '" class="blog-art-img" loading="lazy">'
      : '<div class="blog-art-ico"><svg viewBox="0 0 24 24">' + iconOf(p) + '</svg></div>';
    var artStyle = p.heroImage ? '' : ' style="background:' + gradientOf(p) + ';"';
    return '' +
      '<a href="' + postUrl(p.slug) + '" class="blog-card">' +
        '<div class="blog-art"' + artStyle + '>' +
          artContent +
        '</div>' +
        '<div class="blog-body">' +
          '<span class="blog-cat">' + esc(p.category) + '</span>' +
          '<h3 class="blog-title">' + esc(p.title) + '</h3>' +
          '<p class="blog-exc">' + esc(p.excerpt) + '</p>' +
          '<div class="blog-foot">' +
            '<span class="blog-date">' + esc(p.date) + '</span>' +
            '<span class="blog-read">Read more <svg viewBox="0 0 14 14"><path d="M1 7h12M7 1l6 6-6 6"/></svg></span>' +
          '</div>' +
        '</div>' +
      '</a>';
  }

  /* small sidebar "popular post" row */
  function popHTML(p) {
    return '' +
      '<a href="' + postUrl(p.slug) + '" class="pp">' +
        '<div class="pp-thumb" style="background:' + gradientOf(p) + ';"><svg viewBox="0 0 24 24">' + iconOf(p) + '</svg></div>' +
        '<div><span class="pp-cat">' + esc(p.category) + '</span><div class="pp-t">' + esc(p.title) + '</div></div>' +
      '</a>';
  }

  /* -------- data loading -------- */
  function fetchPublished() {
    // Prefer inline data (window.BLOGS_DATA from data/blogs-data.js) — works
    // even when the page is opened directly via file:// where fetch() of
    // local JSON is blocked by the browser.
    if (Array.isArray(global.BLOGS_DATA) && global.BLOGS_DATA.length) {
      return Promise.resolve(global.BLOGS_DATA);
    }

    // Try Sanity first if available
    if (global.SanityClient && global.SanityClient.fetchPublished) {
      return global.SanityClient.fetchPublished()
        .then(function (data) {
          if (Array.isArray(data) && data.length) return data;
          // Fall back to local JSON if Sanity returns empty
          return fetch(BLOGS_PATH, { cache: 'no-store' })
            .then(function (r) { if (!r.ok) throw new Error('no file'); return r.json(); })
            .then(function (d) { return (Array.isArray(d) && d.length) ? d : DEFAULT_BLOGS.slice(); })
            .catch(function () { return DEFAULT_BLOGS.slice(); });
        })
        .catch(function () {
          // Fall back to local JSON if Sanity fails
          return fetch(BLOGS_PATH, { cache: 'no-store' })
            .then(function (r) { if (!r.ok) throw new Error('no file'); return r.json(); })
            .then(function (data) { return (Array.isArray(data) && data.length) ? data : DEFAULT_BLOGS.slice(); })
            .catch(function () { return DEFAULT_BLOGS.slice(); });
        });
    }

    // Fall back to local JSON if Sanity client not loaded
    return fetch(BLOGS_PATH, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('no file'); return r.json(); })
      .then(function (data) { return (Array.isArray(data) && data.length) ? data : DEFAULT_BLOGS.slice(); })
      .catch(function () { return DEFAULT_BLOGS.slice(); });
  }

  /* admin working copy (localStorage) */
  function loadWorking() {
    try { var s = localStorage.getItem(LS_KEY); if (s) return JSON.parse(s); } catch (e) {}
    return null;
  }
  function saveWorking(arr) { try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch (e) {} }
  function clearWorking() { try { localStorage.removeItem(LS_KEY); } catch (e) {} }

  global.BlogStore = {
    GRADIENTS: GRADIENTS,
    ICONS: ICONS,
    DEFAULT_BLOGS: DEFAULT_BLOGS,
    esc: esc,
    slugify: slugify,
    gradientOf: gradientOf,
    iconOf: iconOf,
    postUrl: postUrl,
    renderBody: renderBody,
    cardHTML: cardHTML,
    popHTML: popHTML,
    fetchPublished: fetchPublished,
    loadWorking: loadWorking,
    saveWorking: saveWorking,
    clearWorking: clearWorking
  };
})(window);
