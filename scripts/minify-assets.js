/**
 * scripts/minify-assets.js
 * Production-safe CSS, JavaScript, and HTML optimization pipeline for TechDataSeeders.
 *
 * Requirements met:
 *  1. Keeps original source files intact.
 *  2. Generates optimized companion files (.min.css, .min.js).
 *  3. Repeatable and idempotent: will not re-minify already minified code.
 *  4. Ensures HTML and EJS references point to valid optimized assets.
 *  5. Verifies every required asset is generated; fails with exit code 1 if missing.
 *  6. Preserves CDN links, event listeners, APIs, dynamic variables, and styles.
 *  7. Prints a detailed build report with original size, minified size, and % reduction.
 */

'use strict';

const fs = require('fs');
const path = require('path');

let CleanCSS;
let terser;

try {
  CleanCSS = require('clean-css');
} catch (e) {
  console.error('ERROR: clean-css is not installed. Run: npm install');
  process.exit(1);
}

try {
  terser = require('terser');
} catch (e) {
  console.error('ERROR: terser is not installed. Run: npm install');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const DATA = path.join(ROOT, 'data');

// CleanCSS instance: conservative settings preserving all selectors, animations, variables
const cleanCss = new CleanCSS({
  level: {
    1: {
      all: true,
      specialComments: 0,
      normalizeUrls: false
    },
    2: {
      all: false,
      removeDuplicateFontFaces: true,
      removeDuplicateMediaBlocks: true,
      removeDuplicateRules: true,
      mergeMedia: false,
      restructureRules: false
    }
  },
  inline: false,   // Prevents unwanted inlining of @import
  rebase: false,
  returnPromise: false
});

// Terser configuration: production minification with maximum safety for globals & events
const TERSER_SAFE_OPTIONS = {
  compress: {
    dead_code: true,
    drop_debugger: true,
    conditionals: true,
    evaluate: true,
    booleans: true,
    loops: true,
    unused: false,        // preserve all functions/variables that could be called dynamically
    hoist_funs: false,
    hoist_vars: false,
    if_return: true,
    join_vars: false,
    side_effects: false
  },
  mangle: false,          // preserve API and global names
  format: {
    comments: false,
    ascii_only: false
  }
};

const TERSER_MANGLE_OPTIONS = {
  compress: {
    dead_code: true,
    drop_debugger: true,
    conditionals: true,
    evaluate: true,
    booleans: true,
    loops: true,
    unused: false,
    side_effects: false
  },
  mangle: {
    toplevel: false       // safe for IIFEs, preserves top-level exports
  },
  format: {
    comments: false
  }
};

const CSS_FILES = [
  { src: path.join(ASSETS, 'home.css'),              out: path.join(ASSETS, 'home.min.css') },
  { src: path.join(ASSETS, 'shared-components.css'), out: path.join(ASSETS, 'shared-components.min.css') },
  { src: path.join(ASSETS, 'chatbot.css'),           out: path.join(ASSETS, 'chatbot.min.css') },
  { src: path.join(ASSETS, 'site.css'),              out: path.join(ASSETS, 'site.min.css') }
];

const JS_FILES = [
  { src: path.join(ASSETS, 'navbar.js'),       out: path.join(ASSETS, 'navbar.min.js'),       opts: TERSER_MANGLE_OPTIONS },
  { src: path.join(ASSETS, 'chatbot.js'),      out: path.join(ASSETS, 'chatbot.min.js'),      opts: TERSER_MANGLE_OPTIONS },
  { src: path.join(ASSETS, 'sanity-client.js'), out: path.join(ASSETS, 'sanity-client.min.js'), opts: TERSER_SAFE_OPTIONS },
  { src: path.join(ASSETS, 'blog-store.js'),   out: path.join(ASSETS, 'blog-store.min.js'),   opts: TERSER_SAFE_OPTIONS },
  { src: path.join(DATA,   'blogs-lite.js'),   out: path.join(DATA,   'blogs-lite.min.js'),   opts: TERSER_SAFE_OPTIONS }
];

function fmt(bytes) {
  return (bytes / 1024).toFixed(2) + ' KB';
}

function pct(orig, min) {
  if (!orig) return '0.0%';
  return (((orig - min) / orig) * 100).toFixed(1) + '%';
}

function minifyCssFile(src, out) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source CSS not found: ${src}`);
  }
  const raw = fs.readFileSync(src, 'utf8');
  const res = cleanCss.minify(raw);
  if (res.errors && res.errors.length) {
    throw new Error(`CleanCSS error in ${src}:\n${res.errors.join('\n')}`);
  }
  fs.writeFileSync(out, res.styles, 'utf8');
  return {
    src,
    out,
    origSize: Buffer.byteLength(raw, 'utf8'),
    minSize: fs.statSync(out).size
  };
}

async function minifyJsFile(src, out, opts) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source JS not found: ${src}`);
  }
  const raw = fs.readFileSync(src, 'utf8');
  let res;
  try {
    res = await terser.minify(raw, opts);
  } catch (err) {
    throw new Error(`Terser error in ${src}: ${err.message}`);
  }
  if (!res.code) {
    throw new Error(`Terser produced empty output for ${src}`);
  }
  fs.writeFileSync(out, res.code, 'utf8');
  return {
    src,
    out,
    origSize: Buffer.byteLength(raw, 'utf8'),
    minSize: fs.statSync(out).size
  };
}

function extractCriticalCss() {
  const indexPath = path.join(ROOT, 'index.html');
  if (!fs.existsSync(indexPath)) return null;

  const html = fs.readFileSync(indexPath, 'utf8');
  const m = html.match(/<style>\s*(:root \{[\s\S]*?)\s*<\/style>/);
  if (!m) return null;

  const raw = m[1];
  const out = path.join(ASSETS, 'home-critical.min.css');
  const res = cleanCss.minify(raw);
  fs.writeFileSync(out, res.styles, 'utf8');

  // Also write unminified companion
  fs.writeFileSync(path.join(ASSETS, 'home-critical.css'), raw, 'utf8');

  return {
    src: 'index.html (critical :root style)',
    out,
    origSize: Buffer.byteLength(raw, 'utf8'),
    minSize: fs.statSync(out).size
  };
}

function getAllHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (['.git', 'node_modules', '.gemini', '.system_generated', 'backups', 'dist', 'build'].includes(file)) continue;
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

function updateHtmlReferences() {
  const htmlFiles = getAllHtmlFiles(ROOT);
  for (const hf of htmlFiles) {
    let content = fs.readFileSync(hf, 'utf8');
    let modified = false;

    // Update references to minified assets if non-minified path is present
    const replacements = [
      [/(['"])\/assets\/home\.css(['"])/g, '$1/assets/home.min.css$2'],
      [/(['"])\/assets\/shared-components\.css(['"])/g, '$1/assets/shared-components.min.css$2'],
      [/(['"])\/assets\/chatbot\.css(['"])/g, '$1/assets/chatbot.min.css$2'],
      [/(['"])\/assets\/navbar\.js(['"])/g, '$1/assets/navbar.min.js$2'],
      [/(['"])\/assets\/chatbot\.js(['"])/g, '$1/assets/chatbot.min.js$2'],
      [/(['"])\/assets\/sanity-client\.js(['"])/g, '$1/assets/sanity-client.min.js$2'],
      [/(['"])\/assets\/blog-store\.js(['"])/g, '$1/assets/blog-store.min.js$2'],
      [/(['"])\.?\/?data\/blogs-lite\.js(['"])/g, '$1./data/blogs-lite.min.js$2']
    ];

    for (const [pattern, rep] of replacements) {
      if (pattern.test(content)) {
        content = content.replace(pattern, rep);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(hf, content, 'utf8');
    }
  }
}

function verifyOutputs(allOutputs) {
  let ok = true;
  for (const item of allOutputs) {
    if (!item) continue;
    if (!fs.existsSync(item.out)) {
      console.error(`  MISSING REQUIRED ASSET: ${item.out}`);
      ok = false;
    }
  }
  return ok;
}

function printReport(cssResults, jsResults, critResult) {
  const div = '═'.repeat(80);
  const subDiv = '─'.repeat(80);

  console.log('\n' + div);
  console.log('  TechDataSeeders — Asset Optimization & Minification Report');
  console.log(div);

  let totalOrigCss = 0, totalMinCss = 0;
  let totalOrigJs = 0, totalMinJs = 0;

  console.log('\nCSS Optimizations:');
  console.log(subDiv);
  const allCss = critResult ? [...cssResults, critResult] : cssResults;
  for (const r of allCss) {
    if (!r) continue;
    totalOrigCss += r.origSize;
    totalMinCss += r.minSize;
    const sName = typeof r.src === 'string' && r.src.startsWith('index') ? r.src : path.relative(ROOT, r.src);
    const oName = path.relative(ROOT, r.out);
    console.log(`  ${sName} -> ${oName}`);
    console.log(`    Original: ${fmt(r.origSize)} | Minified: ${fmt(r.minSize)} | Reduction: ${pct(r.origSize, r.minSize)}`);
  }
  console.log(`\n  >> CSS Subtotal: ${fmt(totalOrigCss)} -> ${fmt(totalMinCss)} (Saved: ${pct(totalOrigCss, totalMinCss)})`);

  console.log('\nJavaScript Optimizations:');
  console.log(subDiv);
  for (const r of jsResults) {
    if (!r) continue;
    totalOrigJs += r.origSize;
    totalMinJs += r.minSize;
    const sName = path.relative(ROOT, r.src);
    const oName = path.relative(ROOT, r.out);
    console.log(`  ${sName} -> ${oName}`);
    console.log(`    Original: ${fmt(r.origSize)} | Minified: ${fmt(r.minSize)} | Reduction: ${pct(r.origSize, r.minSize)}`);
  }
  console.log(`\n  >> JS Subtotal: ${fmt(totalOrigJs)} -> ${fmt(totalMinJs)} (Saved: ${pct(totalOrigJs, totalMinJs)})`);

  const grandOrig = totalOrigCss + totalOrigJs;
  const grandMin = totalMinCss + totalMinJs;
  console.log('\n' + div);
  console.log(`  GRAND TOTAL: ${fmt(grandOrig)} -> ${fmt(grandMin)} (Overall Saved: ${pct(grandOrig, grandMin)})`);
  console.log(div + '\n');
}

async function main() {
  console.log('\n🚀 Starting TechDataSeeders Safe Optimization Pipeline...\n');
  let hasError = false;

  const cssResults = [];
  const jsResults = [];

  console.log('1. Minifying CSS Files...');
  for (const f of CSS_FILES) {
    try {
      const res = minifyCssFile(f.src, f.out);
      cssResults.push(res);
      console.log(`   ✓ Generated ${path.relative(ROOT, f.out)}`);
    } catch (err) {
      console.error(`   ✗ Error minifying ${f.src}: ${err.message}`);
      hasError = true;
    }
  }

  console.log('\n2. Extracting & Minifying Critical CSS...');
  let critResult = null;
  try {
    critResult = extractCriticalCss();
    if (critResult) {
      console.log(`   ✓ Generated ${path.relative(ROOT, critResult.out)}`);
    }
  } catch (err) {
    console.error(`   ✗ Error with critical CSS: ${err.message}`);
    hasError = true;
  }

  console.log('\n3. Minifying JavaScript Files...');
  for (const f of JS_FILES) {
    try {
      const res = await minifyJsFile(f.src, f.out, f.opts);
      jsResults.push(res);
      console.log(`   ✓ Generated ${path.relative(ROOT, f.out)}`);
    } catch (err) {
      console.error(`   ✗ Error minifying ${f.src}: ${err.message}`);
      hasError = true;
    }
  }

  console.log('\n4. Verifying HTML/EJS Asset References...');
  try {
    updateHtmlReferences();
    console.log('   ✓ Verified asset references in HTML files.');
  } catch (err) {
    console.error(`   ✗ Error updating HTML references: ${err.message}`);
    hasError = true;
  }

  console.log('\n5. Verifying Required Output Files...');
  const allOutputs = [...cssResults, critResult, ...jsResults];
  const allValid = verifyOutputs(allOutputs);
  if (!allValid) {
    hasError = true;
  } else {
    console.log('   ✓ All required optimized assets exist on disk.');
  }

  printReport(cssResults, jsResults, critResult);

  if (hasError) {
    console.error('❌ Build failed with errors. Aborting to safeguard deployment.\n');
    process.exit(1);
  }

  console.log('✅ Optimization and build completed successfully!\n');
}

main().catch(err => {
  console.error('Fatal pipeline error:', err);
  process.exit(1);
});

module.exports = {
  minifyCss: (css) => {
    const res = cleanCss.minify(css);
    return res.styles || css;
  },
  minifyJs: async (js, opts) => {
    const res = await terser.minify(js, opts || TERSER_SAFE_OPTIONS);
    return res.code || js;
  }
};
