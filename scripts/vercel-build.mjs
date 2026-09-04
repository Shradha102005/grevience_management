/**
 * vercel-build.mjs
 * Custom build script for Vercel deployment.
 * Runs the TanStack Start build, then creates .vercel/output/
 * using the Vercel Build Output API so Vercel can serve the app as a SPA.
 */
import { execSync } from "child_process";
import {
  readFileSync,
  mkdirSync,
  writeFileSync,
  cpSync,
  existsSync,
  readdirSync,
} from "fs";

// ── Step 1: Run the normal build ─────────────────────────────────────────────
console.log("🔨 Running npm run build...");
execSync("npm run build", { stdio: "inherit" });

// ── Step 2: Find client entry & CSS assets ───────────────────────────────────
let mainJs = null;
const cssFiles = new Set();

// 2A. Try reading Vite manifest if present
const manifestPaths = [
  "dist/client/.vite/manifest.json",
  "dist/client/manifest.json",
];
const foundManifest = manifestPaths.find((p) => existsSync(p));

if (foundManifest) {
  try {
    console.log(`📄 Found manifest at ${foundManifest}`);
    const manifest = JSON.parse(readFileSync(foundManifest, "utf-8"));
    for (const [, value] of Object.entries(manifest)) {
      if (value.isEntry && value.file) {
        mainJs = value.file.startsWith("/") ? value.file.slice(1) : value.file;
      }
      for (const css of value.css ?? []) {
        cssFiles.add(css.startsWith("/") ? css.slice(1) : css);
      }
    }
  } catch (err) {
    console.warn("⚠️ Error parsing manifest, falling back to directory scan:", err.message);
  }
}

// 2B. If not found via manifest, scan dist/client/assets/ directly
const assetsDir = "dist/client/assets";
if (existsSync(assetsDir)) {
  const files = readdirSync(assetsDir);
  console.log("📂 Files found in dist/client/assets:", files);

  // Collect all CSS bundles
  for (const file of files) {
    if (file.endsWith(".css")) {
      cssFiles.add(`assets/${file}`);
    }
  }

  // Find main JS entry (TanStack Start client bundle: index-<hash>.js)
  if (!mainJs) {
    const indexJs = files.find((f) => /^index[-._].*\.js$/.test(f));
    const clientJs = files.find((f) => /^client[-._].*\.js$/.test(f));
    const anyIndex = files.find((f) => f.includes("index") && f.endsWith(".js"));
    const anyJs = files.find((f) => f.endsWith(".js"));

    const chosen = indexJs || clientJs || anyIndex || anyJs;
    if (chosen) {
      mainJs = `assets/${chosen}`;
    }
  }
} else {
  console.warn("⚠️ dist/client/assets directory does not exist. Checking dist/client root...");
  if (existsSync("dist/client")) {
    const rootFiles = readdirSync("dist/client");
    console.log("📂 Files in dist/client:", rootFiles);
  }
}

console.log("📦 Resolved main JS entry:", mainJs);
console.log("🎨 Resolved CSS files:", [...cssFiles]);

if (!mainJs) {
  console.error("❌ Could not determine main JS entry file in dist/client!");
  process.exit(1);
}

// ── Step 3: Create .vercel/output/ structure ─────────────────────────────────
console.log("📁 Creating .vercel/output/...");
mkdirSync(".vercel/output/static", { recursive: true });

// ── Step 4: Copy all dist/client assets and public assets to .vercel/output/static/ ──
cpSync("dist/client", ".vercel/output/static", { recursive: true });

if (existsSync("public")) {
  console.log("📋 Copying public/ assets to .vercel/output/static...");
  cpSync("public", ".vercel/output/static", { recursive: true });
}

// ── Step 5: Generate index.html shell ────────────────────────────────────────
const cssLinks = [...cssFiles]
  .map((css) => `    <link rel="stylesheet" href="/${css}" />`)
  .join("\n");

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CivicSaathi — AI-Powered Citizen Governance Platform</title>
    <meta name="description" content="CivicSaathi is a unified, AI-powered platform for citizen schemes, grievances, emergency response, municipal services, and governance automation." />
    <meta property="og:title" content="CivicSaathi — AI-Powered Citizen Governance Platform" />
    <meta property="og:type" content="website" />
    <link rel="icon" type="image/png" href="/logo.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap" />
${cssLinks}
    <script>
      // Hydration shim for TanStack Router/Start in client SPA mode
      (function() {
        var emptyRoute = { preloads: [], scripts: [], css: [] };
        var routesProxy = typeof Proxy !== "undefined"
          ? new Proxy({ __root__: emptyRoute }, {
              get: function(target, prop) {
                return target[prop] || emptyRoute;
              }
            })
          : { __root__: emptyRoute };

        window.$_TSR = window.$_TSR || {
          h: function() { this.hydrated = true; },
          e: function() { this.streamEnded = true; },
          c: function() {},
          p: function(s) { typeof s === "function" && s(); },
          buffer: [],
          initialized: true,
          router: {
            matches: [],
            manifest: {
              routes: routesProxy
            },
            dehydratedData: {},
            lastMatchId: ""
          }
        };
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    ${mainJs ? `<script type="module" src="/${mainJs}"></script>` : "<!-- ERROR: main entry not found -->"}
  </body>
</html>`;

writeFileSync(".vercel/output/static/index.html", html);
console.log("✅ index.html written");

// ── Step 6: Write Vercel config with SPA catch-all routing ───────────────────
const config = {
  version: 3,
  routes: [
    { handle: "filesystem" },           // serve real files first
    { src: "/(.*)", dest: "/index.html" }, // SPA fallback for all routes
  ],
};
writeFileSync(".vercel/output/config.json", JSON.stringify(config, null, 2));

console.log("🚀 .vercel/output/ is ready!");
