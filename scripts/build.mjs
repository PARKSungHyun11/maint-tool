import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

const webAssets = [
  "index.html",
  "manifest.json",
  "privacy.html",
  "sw.js",
  "icon-192.png",
  "icon-512.png",
  "config.js",
];

await build({
  entryPoints: ["app.jsx"],
  outfile: "app.js",
  bundle: true,
  minify: true,
  format: "iife",
  target: ["safari15", "chrome89"],
  external: ["firebase", "firebase/*"],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp("app.js", "dist/app.js");
await Promise.all(webAssets.map(async (asset) => {
  try {
    await cp(asset, `dist/${asset}`);
  } catch (error) {
    if (asset !== "config.js") throw error;
    await cp("config.example.js", "dist/config.js");
  }
}));
