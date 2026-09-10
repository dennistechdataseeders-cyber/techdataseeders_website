// Server-side case studies data with category images enriched
const CASE_STUDIES = [
  {
    "category": "Healthcare",
    "href": "./case-studies/pharma-data-extraction-services.html",
    "client": "Pharmaceutical Manufacturer & Distributor",
    "title": "Streamlining Business Processes & Boosting Profitability for a Pharma Company with Data Extraction Services",
    "desc": "A USA-based pharmaceutical manufacturer and distributor partnered with Dataseeders to extract real-time competitor pricing, regulatory, and product data   cutting manual research time by 90%.",
    "gradient": "linear-gradient(135deg,#0d1840 0%,#162050 60%,#2563FF 100%)",
    "icon": "<ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\"/><path d=\"M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12\"/><path d=\"M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5\"/>",
    "metrics": [
      {
        "v": "90%",
        "l": "Manual Research Time Reduced"
      },
      {
        "v": "5",
        "l": "Custom Solutions Delivered"
      },
      {
        "v": "Multi-Region",
        "l": "Pricing & Stock Coverage"
      }
    ],
    "image": "/./images/optimized/healthcare_under700kb.webp"
  },
  {
    "category": "Retail",
    "href": "./case-studies/retail-automated-product-matching.html",
    "client": "Omnichannel Retail Company",
    "title": "Enhancing Retail Efficiency with Automated Product Matching",
    "desc": "An omnichannel US retailer turned to Dataseeders' AI-driven product matching engine to unify a sprawling catalog   reaching 96% matching accuracy across 100,000+ SKUs.",
    "gradient": "linear-gradient(135deg,#7c2d12 0%,#ea580c 50%,#fb923c 100%)",
    "icon": "<circle cx=\"9\" cy=\"21\" r=\"1.5\"/><circle cx=\"19\" cy=\"21\" r=\"1.5\"/><path d=\"M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6\"/>",
    "metrics": [
      {
        "v": "96%",
        "l": "Product Matching Accuracy"
      },
      {
        "v": "83%",
        "l": "Reduction in Duplicate Listings"
      },
      {
        "v": "150+",
        "l": "Hours Saved per Month"
      }
    ],
    "image": "/./images/optimized/ecommerce_under700kb.webp"
  },
  {
    "category": "Food Delivery",
    "href": "./case-studies/food-delivery-competitive-intelligence.html",
    "client": "Food Delivery Aggregator",
    "title": "Helping a Leading Food Delivery Business Outrank Competitors & Expand Market Reach",
    "desc": "A leading food delivery aggregator partnered with Dataseeders for competitive menu monitoring and sentiment analysis, expanding its consumer base by 22% in underpenetrated regions.",
    "gradient": "linear-gradient(135deg,#1a4d3d 0%,#2d9d6e 50%,#52b788 100%)",
    "icon": "<path d=\"M3 2v7a3 3 0 0 0 6 0V2M6 9v13\"/><path d=\"M16 2c-2 0-3 2-3 5s1 5 3 5v10\"/>",
    "metrics": [
      {
        "v": "22%",
        "l": "Consumer Base Growth"
      },
      {
        "v": "5",
        "l": "Data-Driven Solutions Delivered"
      },
      {
        "v": "Multi-Region",
        "l": "Competitive Intelligence Coverage"
      }
    ],
    "image": "/./images/optimized/food.webp"
  },
  {
    "category": "Finance",
    "href": "./case-studies/finance-real-time-alternative-data-scraping.html",
    "client": "Financial Services Organization",
    "title": "Helping Finance Organization with Real-Time & Alternative Data Scraping for Market Dominance",
    "desc": "A mid-sized financial services firm used Dataseeders' real-time and alternative data scraping to grow platform traffic by 45% and cut manual research hours by 80%.",
    "gradient": "linear-gradient(135deg,#2e1065 0%,#5b21b6 50%,#7c3aed 100%)",
    "icon": "<path d=\"M3 21h18\"/><path d=\"M7 21V10\"/><path d=\"M12 21V4\"/><path d=\"M17 21v-7\"/>",
    "metrics": [
      {
        "v": "45%",
        "l": "Platform Traffic Growth"
      },
      {
        "v": "80%",
        "l": "Reduction in Manual Research Hours"
      },
      {
        "v": "210+",
        "l": "New Alternative Data Sources"
      }
    ],
    "image": "/./images/optimized/advertised.webp"
  },
  {
    "category": "Real Estate",
    "href": "./case-studies/real-estate-aggregator-growth.html",
    "client": "Real Estate Aggregator Platform",
    "title": "Powering a Real Estate Aggregator's Growth with Data Scraping & Analytics Solutions",
    "desc": "An emerging real estate aggregator used Dataseeders' listing scraping and analytics to grow active listings by 75% across 100+ cities and cut onboarding time by 70%.",
    "gradient": "linear-gradient(135deg,#064e3b 0%,#059669 50%,#10b981 100%)",
    "icon": "<path d=\"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/><path d=\"M9 22V12h6v10\"/>",
    "metrics": [
      {
        "v": "75%",
        "l": "Increase in Active Listings"
      },
      {
        "v": "70%",
        "l": "Reduction in Listing Onboarding Time"
      },
      {
        "v": "310+",
        "l": "New Realtor Partnerships"
      }
    ],
    "image": "/./images/optimized/realestate_under700kb.webp"
  },
  {
    "category": "Travel",
    "href": "./case-studies/car-rental-pricing-intelligence.html",
    "client": "Europe-Based Car Rental Company",
    "title": "Real-Time Competitor Pricing Intelligence Solution for Global Car Rental Company",
    "desc": "A Europe-based car rental company used Dataseeders' weekly pricing intelligence to benchmark rates across 6 countries and cut manual tracking hours by 90%.",
    "gradient": "linear-gradient(135deg,#083344 0%,#0e7490 50%,#22d3ee 100%)",
    "icon": "<path d=\"M17.8 19.2L16 11l5-5a2.1 2.1 0 0 0-3-3l-5 5-8.2-1.8a.5.5 0 0 0-.5.8l4.7 3.2-3 3H3l-1 1 4 2 2 4 1-1v-3l3-3 3.2 4.7a.5.5 0 0 0 .8-.5z\"/>",
    "metrics": [
      {
        "v": "6",
        "l": "Countries Benchmarked"
      },
      {
        "v": "90%",
        "l": "Reduction in Manual Tracking Hours"
      },
      {
        "v": "24%",
        "l": "Growth in New Bookings"
      }
    ],
    "image": "/./images/optimized/travel.webp"
  },
  {
    "category": "Events",
    "href": "./case-studies/event-ticket-booking-data-extraction.html",
    "client": "Online Ticket Booking Platform",
    "title": "Real-Time Data Extraction for Event Ticket Booking Platform",
    "desc": "A growing North American ticket booking platform used Dataseeders' real-time extraction to lift conversion rate by 27% and outrank 4 major competitors.",
    "gradient": "linear-gradient(135deg,#4d1a3d 0%,#9d4edd 50%,#c77dff 100%)",
    "icon": "<circle cx=\"18\" cy=\"5\" r=\"3\"/><circle cx=\"6\" cy=\"12\" r=\"3\"/><circle cx=\"18\" cy=\"19\" r=\"3\"/><line x1=\"8.6\" y1=\"13.5\" x2=\"15.4\" y2=\"17.5\"/><line x1=\"15.4\" y1=\"6.5\" x2=\"8.6\" y2=\"10.5\"/>",
    "metrics": [
      {
        "v": "27%",
        "l": "Growth in Conversion Rate"
      },
      {
        "v": "18%",
        "l": "Increase in Organic Traffic"
      },
      {
        "v": "4",
        "l": "Major Competitors Outranked"
      }
    ],
    "image": "/./images/optimized/social.webp"
  },
  {
    "category": "E-commerce",
    "href": "./case-studies/ecommerce-pricing-intelligence.html",
    "client": "Multi-Category eCommerce Platform",
    "title": "Empowering an eCommerce Marketplace with Real-Time Pricing Intelligence",
    "desc": "A fast-growing Southeast Asian eCommerce marketplace used Dataseeders' real-time pricing intelligence to win 23% more Buy Box placements and cut pricing errors by 85%.",
    "gradient": "linear-gradient(135deg,#0d1b4b 0%,#1a4fd6 50%,#2563FF 100%)",
    "icon": "<circle cx=\"9\" cy=\"21\" r=\"1.5\"/><circle cx=\"19\" cy=\"21\" r=\"1.5\"/><path d=\"M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6\"/>",
    "metrics": [
      {
        "v": "23%",
        "l": "Increase in Buy Box Wins"
      },
      {
        "v": "85%",
        "l": "Reduction in Pricing Errors"
      },
      {
        "v": "12%",
        "l": "Increase in Gross Margin"
      }
    ],
    "image": "/./images/optimized/ecommerce_under700kb.webp"
  }
];

module.exports = { CASE_STUDIES };
