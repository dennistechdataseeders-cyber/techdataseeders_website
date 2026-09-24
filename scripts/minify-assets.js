const fs = require('fs');

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

function minifyJs(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}();,=+\-<>|&!?:])\s*/g, '$1')
    .trim();
}

const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<style>\s*(:root \{[\s\S]*?)\s*<\/style>\s*<\/head>/);
if (!m) {
  console.error('Could not find critical style block in index.html');
  process.exit(1);
}

fs.writeFileSync('assets/home-critical.css', m[1]);
fs.writeFileSync('assets/home-critical.min.css', minifyCss(m[1]));

for (const f of ['assets/home.css', 'assets/shared-components.css']) {
  const raw = fs.readFileSync(f, 'utf8');
  const out = f.replace(/\.css$/, '.min.css');
  fs.writeFileSync(out, minifyCss(raw));
  console.log(f, raw.length, '->', out, fs.statSync(out).size);
}

console.log('critical', m[1].length, '->', fs.statSync('assets/home-critical.min.css').size);

module.exports = { minifyCss, minifyJs };
