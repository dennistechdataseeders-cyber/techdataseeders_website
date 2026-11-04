const fs = require('fs');
const path = require('path');
const CleanCSS = require('clean-css');
const { minify } = require('terser');

const cssCleaner = new CleanCSS({
  level: {
    1: {
      all: true,
      normalizeUrls: false // preserve exact url quoting
    }
  },
  inline: false,
  rebase: false,
  compatibility: '*'
});

// Configure terser for external libraries
const terserOptionsSafe = {
  compress: {
    drop_debugger: true,
    dead_code: true
  },
  mangle: false, // don't mangle public API / store
  format: {
    comments: false
  }
};

const terserOptionsMangle = {
  compress: {
    drop_debugger: true,
    dead_code: true
  },
  mangle: {
    toplevel: false // safe for IIFE
  },
  format: {
    comments: false
  }
};

async function buildExternalAssets() {
  console.log('--- MINIFYING EXTERNAL CSS ASSETS ---');
  const cssFiles = [
    'assets/home.css',
    'assets/shared-components.css',
    'assets/chatbot.css',
    'assets/site.css'
  ];

  for (const f of cssFiles) {
    if (!fs.existsSync(f)) continue;
    const raw = fs.readFileSync(f, 'utf8');
    const res = cssCleaner.minify(raw);
    const minPath = f.replace(/\.css$/, '.min.css');
    fs.writeFileSync(minPath, res.styles);
    const pct = ((1 - res.styles.length / raw.length) * 100).toFixed(1);
    console.log(`  ${f}: ${raw.length} B -> ${minPath}: ${res.styles.length} B (-${pct}%)`);
  }

  // Handle critical CSS extracted from index.html
  const html = fs.readFileSync('index.html', 'utf8');
  const m = html.match(/<style>\s*(:root \{[\s\S]*?)\s*<\/style>\s*<\/head>/);
  if (m) {
    fs.writeFileSync('assets/home-critical.css', m[1]);
    const critRes = cssCleaner.minify(m[1]);
    fs.writeFileSync('assets/home-critical.min.css', critRes.styles);
    console.log(`  assets/home-critical.min.css: ${m[1].length} B -> ${critRes.styles.length} B (-${((1 - critRes.styles.length/m[1].length)*100).toFixed(1)}%)`);
  }

  console.log('\n--- MINIFYING EXTERNAL JS ASSETS ---');
  const jsFiles = [
    { src: 'assets/navbar.js', opts: terserOptionsMangle },
    { src: 'assets/chatbot.js', opts: terserOptionsMangle },
    { src: 'assets/sanity-client.js', opts: terserOptionsSafe },
    { src: 'assets/blog-store.js', opts: terserOptionsSafe },
    { src: 'data/blogs-lite.js', opts: terserOptionsSafe }
  ];

  for (const item of jsFiles) {
    if (!fs.existsSync(item.src)) continue;
    const raw = fs.readFileSync(item.src, 'utf8');
    const res = await minify(raw, item.opts);
    const minPath = item.src.replace(/\.js$/, '.min.js');
    fs.writeFileSync(minPath, res.code);
    const pct = ((1 - res.code.length / raw.length) * 100).toFixed(1);
    console.log(`  ${item.src}: ${raw.length} B -> ${minPath}: ${res.code.length} B (-${pct}%)`);
  }
}

function getAllHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (['.git', 'node_modules', '.gemini', 'anti_gravity', '.system_generated'].includes(file)) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllHtmlFiles(fullPath));
    } else if (file.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

async function minifyHtmlFiles() {
  console.log('\n--- MINIFYING INLINE ASSETS & UPDATING HTML REFERENCES ---');
  const htmlFiles = getAllHtmlFiles('.');
  let totalOrig = 0;
  let totalNew = 0;

  for (const hf of htmlFiles) {
    let content = fs.readFileSync(hf, 'utf8');
    const origLen = content.length;
    totalOrig += origLen;

    // 1. Update external asset references to .min.css and .min.js
    content = content.replace(/(['"])\/assets\/home\.css(['"])/g, '$1/assets/home.min.css$2');
    content = content.replace(/(['"])\/assets\/shared-components\.css(['"])/g, '$1/assets/shared-components.min.css$2');
    content = content.replace(/(['"])\/assets\/chatbot\.css(['"])/g, '$1/assets/chatbot.min.css$2');
    content = content.replace(/(['"])\/assets\/navbar\.js(['"])/g, '$1/assets/navbar.min.js$2');
    content = content.replace(/(['"])\/assets\/chatbot\.js(['"])/g, '$1/assets/chatbot.min.js$2');
    content = content.replace(/(['"])\/assets\/sanity-client\.js(['"])/g, '$1/assets/sanity-client.min.js$2');
    content = content.replace(/(['"])\/assets\/blog-store\.js(['"])/g, '$1/assets/blog-store.min.js$2');
    content = content.replace(/(['"])\.?\/?data\/blogs-lite\.js(['"])/g, '$1./data/blogs-lite.min.js$2');

    // 2. Minify inline <style>...</style> blocks
    content = content.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (match, attrs, cssCode) => {
      const res = cssCleaner.minify(cssCode);
      const minCss = res.styles || cssCode.trim();
      return `<style${attrs}>${minCss}</style>`;
    });

    // 3. Minify inline <script>...</script> blocks (excluding src and ld+json)
    const scriptRegex = /<script\b((?![^>]*\bsrc=)(?![^>]*type=[\"']application\/ld\+json[\"'])[^>]*)>([\s\S]*?)<\/script>/gi;
    let newContent = '';
    let lastIndex = 0;
    let match;

    while ((match = scriptRegex.exec(content)) !== null) {
      newContent += content.substring(lastIndex, match.index);
      const attrs = match[1];
      const jsCode = match[2].trim();

      if (jsCode) {
        try {
          const res = await minify(jsCode, {
            compress: {
              drop_debugger: true,
              dead_code: true
            },
            mangle: false, // preserve variable names in inline scripts
            format: {
              comments: false
            }
          });
          newContent += `<script${attrs}>${res.code}</script>`;
        } catch (e) {
          console.warn(`  Warning: Could not minify inline script in ${hf}: ${e.message}`);
          newContent += match[0];
        }
      } else {
        newContent += match[0];
      }
      lastIndex = scriptRegex.lastIndex;
    }
    newContent += content.substring(lastIndex);
    content = newContent;

    fs.writeFileSync(hf, content, 'utf8');
    totalNew += content.length;
    const diff = origLen - content.length;
    const pct = ((diff / origLen) * 100).toFixed(1);
    console.log(`  ${hf}: ${origLen} B -> ${content.length} B (-${pct}%)`);
  }

  console.log(`\nHTML Total: ${totalOrig} B -> ${totalNew} B (-${((1 - totalNew/totalOrig)*100).toFixed(1)}%)`);
}

async function run() {
  await buildExternalAssets();
  await minifyHtmlFiles();
  console.log('\nMinification complete!');
}

run();
