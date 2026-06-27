import fs from "fs";
import path from "path";

function buildManifest() {
  const imagesDir = path.join(process.cwd(), "public", "images");
  const manifest: Record<string, string[]> = {};

  if (!fs.existsSync(imagesDir)) {
    console.error("No images directory found!");
    return;
  }

  const shifts = fs.readdirSync(imagesDir);
  for (const shift of shifts) {
    if (shift.startsWith(".") || shift === "fallbacks") continue;
    
    const shiftDir = path.join(imagesDir, shift);
    const stat = fs.statSync(shiftDir);
    
    if (stat.isDirectory()) {
      const files = fs.readdirSync(shiftDir);
      manifest[shift] = files.filter(f => f.endsWith(".png") || f.endsWith(".jpg"));
    }
  }

  fs.writeFileSync(
    path.join(process.cwd(), "public", "data", "image-manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  console.log("Image manifest generated.");
}

buildManifest();
