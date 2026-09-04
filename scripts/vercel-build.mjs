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
} from "fs";

// ── Step 1: Run the normal build ─────────────────────────────────────────────
console.log("🔨 Running npm run build...");
execSync("npm run build", { stdio: "inherit" });

// ── Step 2: Read Vite manifest to find hashed asset names ────────────────────
const manifestPath = "dist/client/.vite/manifest.json";
if (!existsSync(manifestPath)) {
  // Some Vite configs write manifest to dist/client/manifest.json
  const alt = "dist/client/manifest.json";
  if (!existsSync(alt)) {
    console.error("❌ Vite manifest not found. Checked:", manifestPath, alt);
    process.exit(1);
  }
}
const manifest = JSON.parse(
  readFileSync(existsSync(manifestPath) ? manifestPath : "dist/client/manifest.json", "utf-8")
);

// Find the main JS entry and all CSS files
let mainJs = null;
const cssFiles = new Set();

for (const [, value] of Object.entries(manifest)) {
  if (value.isEntry) {
    mainJs = value.file;
  }
  for (const css of value.css ?? []) {
    cssFiles.add(css);
  }
}

if (!mainJs) {
  // Fallback: find the largest JS file that looks like an entry
  for (const [, value] of Object.entries(manifest)) {
    if (value.file?.startsWith("assets/index")) {
      mainJs = value.file;
      break;
    }
  }
}

console.log("📦 Main JS entry:", mainJs);
console.log("🎨 CSS files:", [...cssFiles]);

// ── Step 3: Create .vercel/output/ structure ─────────────────────────────────
console.log("📁 Creating .vercel/output/...");
mkdirSync(".vercel/output/static", { recursive: true });

// ── Step 4: Copy all dist/client assets to .vercel/output/static/ ────────────
cpSync("dist/client", ".vercel/output/static", { recursive: true });

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
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap" />
${cssLinks}
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
