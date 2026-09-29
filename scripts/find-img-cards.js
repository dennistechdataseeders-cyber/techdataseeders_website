const fs = require('fs');

const pages = [
  'services/mobile-app-scraping.html',
  'services/enterprise-web-scraping.html',
  'services/custom-data-api.html',
  'services/data-analytics-intelligence.html'
];

pages.forEach(p => {
  const content = fs.readFileSync(p, 'utf8');
  console.log('=== ' + p + ' ===');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('svc-img-card')) {
      console.log(`Line ${i+1}: ${l}`);
      for (let j = 1; j <= 3; j++) {
        if (lines[i+j]) console.log(`  +${j}: ${lines[i+j]}`);
      }
    }
  });
});
