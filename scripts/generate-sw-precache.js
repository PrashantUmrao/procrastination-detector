/* eslint-disable */
const fs = require("fs");
const path = require("path");

const WORKSPACE_DIR = path.resolve(__dirname, "..");
const NEXT_STATIC_DIR = path.join(WORKSPACE_DIR, ".next", "static");
const PUBLIC_DIR = path.join(WORKSPACE_DIR, "public");
const SW_TEMPLATE_PATH = path.join(WORKSPACE_DIR, "scripts", "sw.template.js");
const SW_PATH = path.join(PUBLIC_DIR, "sw.js");

// Recursive file scanner
function getFilesRecursively(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getFilesRecursively(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function generatePrecache() {
  console.log("Generating Service Worker precache list...");

  // 1. Scan .next/static directory
  const nextStaticFiles = getFilesRecursively(NEXT_STATIC_DIR)
    .map(file => {
      // Get the relative path from .next/static and format it to forward slashes for URLs
      const relative = path.relative(NEXT_STATIC_DIR, file).replace(/\\/g, "/");
      return `/_next/static/${relative}`;
    })
    // Filter out map files or unnecessary development builds
    .filter(file => !file.endsWith(".map") && !file.includes("/development/"));

  // 2. Scan public directory (only specific types of static files, avoiding duplicate registrations)
  const publicFiles = getFilesRecursively(PUBLIC_DIR)
    .map(file => {
      const relative = path.relative(PUBLIC_DIR, file).replace(/\\/g, "/");
      return `/${relative}`;
    })
    .filter(file => {
      // Exclude service worker, manifest, and icons that are already statically precached
      const alreadyPrecached = [
        "/sw.js",
        "/manifest.webmanifest",
        "/favicon.ico",
        "/icon.png",
        "/apple-touch-icon.png",
        "/android-chrome-192x192.png",
        "/android-chrome-512x512.png",
        "/maskable-icon-192.png",
        "/maskable-icon-512.png",
        "/screenshot.png"
      ];
      if (alreadyPrecached.includes(file)) return false;

      // Only include specific static extensions like jpg, png, svg, fonts (woff, woff2, ttf), etc.
      return file.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|otf|json)$/i);
    });

  // Combine both sets
  const allAssets = [...nextStaticFiles, ...publicFiles];
  console.log(`Found ${allAssets.length} static assets to precache.`);

  // 3. Update public/sw.js from template
  if (!fs.existsSync(SW_TEMPLATE_PATH)) {
    console.error(`Error: Service worker template file not found at ${SW_TEMPLATE_PATH}`);
    process.exit(1);
  }

  let swContent = fs.readFileSync(SW_TEMPLATE_PATH, "utf8");

  // Format assets array content
  const assetsString = allAssets.map(asset => `  "${asset}",`).join("\n");

  // Replace placeholder
  const placeholder = "/* GENERATED_PRECACHE_ASSETS */";
  if (swContent.includes(placeholder)) {
    swContent = swContent.replace(placeholder, assetsString);
    fs.writeFileSync(SW_PATH, swContent, "utf8");
    console.log("Service Worker precache list generated successfully!");
  } else {
    console.warn("Warning: Could not find precache placeholder /* GENERATED_PRECACHE_ASSETS */ in sw.template.js.");
  }
}

generatePrecache();
