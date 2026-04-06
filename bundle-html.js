const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const outPath = path.join(__dirname, 'RTK-Racket-Circle.html');

// Read the index.html
let html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');

// Find and inline the JS bundle
const jsMatch = html.match(/src="(\/_expo\/static\/js\/web\/[^"]+)"/);
if (jsMatch) {
  const jsPath = path.join(distDir, jsMatch[1]);
  let jsContent = fs.readFileSync(jsPath, 'utf8');

  // Find all asset files recursively
  const assetDir = path.join(distDir, 'assets');
  const assetFiles = [];
  function findFiles(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) findFiles(full);
      else assetFiles.push(full);
    }
  }
  findFiles(assetDir);

  // Replace asset paths in JS with base64 data URIs
  for (const file of assetFiles) {
    const relPath = '/' + path.relative(distDir, file);
    const ext = path.extname(file).toLowerCase();
    let mime = 'application/octet-stream';
    if (ext === '.png') mime = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
    else if (ext === '.ttf') mime = 'font/ttf';
    else if (ext === '.otf') mime = 'font/otf';
    else if (ext === '.svg') mime = 'image/svg+xml';

    const b64 = fs.readFileSync(file).toString('base64');
    const dataUri = 'data:' + mime + ';base64,' + b64;
    jsContent = jsContent.split(relPath).join(dataUri);
  }

  // --- Patch JS for file:// protocol support ---

  // Helper functions prepended to the bundle
  // __so() = safe origin: returns "http://localhost" instead of "null" on file://
  // __sp() = safe pathname: returns "/" instead of the full file path on file://
  const helpers =
    'var __so=function(){return location.origin==="null"?"http://localhost":location.origin};' +
    'var __sp=function(){return location.protocol==="file:"?"/":location.pathname};';

  // Patch history methods to not throw on file://
  const historyPatch =
    '(function(){if(location.protocol==="file:"){' +
    'var _p=history.pushState,_r=history.replaceState;' +
    'history.pushState=function(s,t,u){try{_p.call(history,s,t,u)}catch(e){}};' +
    'history.replaceState=function(s,t,u){try{_r.call(history,s,t,u)}catch(e){}};' +
    'try{_r.call(history,null,"","/")}catch(e){}}})();';

  jsContent = helpers + historyPatch + jsContent;

  // Step 1: Replace the combined pattern (only standalone location.pathname usage)
  jsContent = jsContent.replace(/location\.origin\+location\.pathname/g, '__so()+__sp()');

  // Step 2: Replace window.location.origin (must come before standalone location.origin)
  jsContent = jsContent.replace(/window\.location\.origin/g, '__so()');

  // Step 3: Replace remaining standalone location.origin
  // Use negative lookbehind to skip patterns like s.location.origin (preceded by word+dot)
  jsContent = jsContent.replace(/(?<!\w\.)location\.origin/g, '__so()');

  // Note: s.location.pathname (router internal state) is NOT touched — only the combined
  // pattern in step 1 was replaced, and that was standalone location.pathname

  // Escape all </ sequences to prevent premature script tag closing
  jsContent = jsContent.replace(/<\//g, '<\\/');

  // Use function callback to avoid $& and $' special replacement patterns
  html = html.replace(
    /<script[^>]*src="\/_expo\/static\/js\/web\/[^"]+\"[^>]*><\/script>/,
    () => '<script>' + jsContent + '</script>'
  );
}

// Inline favicon
const faviconPath = path.join(distDir, 'favicon.ico');
if (fs.existsSync(faviconPath)) {
  const favB64 = fs.readFileSync(faviconPath).toString('base64');
  html = html.replace(
    /href="\/favicon.ico"/,
    'href="data:image/x-icon;base64,' + favB64 + '"'
  );
}

fs.writeFileSync(outPath, html);
const size = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
console.log('Created: RTK-Racket-Circle.html (' + size + ' MB)');
