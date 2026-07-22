import { execSync } from "node:child_process";
import { existsSync, mkdirSync, symlinkSync, unlinkSync } from "node:fs";
import { resolve, relative } from "node:path";
import { loadConfig } from "./config.js";

export const buildSite = async (configPath?: string): Promise<void> => {
  const config = loadConfig(configPath);

  const assetsDir = resolve(config.assetsDir);
  const publicAssetsDir = resolve("public/assets");

  mkdirSync(assetsDir, { recursive: true });
  mkdirSync("public", { recursive: true });

  if (existsSync(publicAssetsDir)) {
    unlinkSync(publicAssetsDir);
  }

  const relPath = relative(resolve("public"), assetsDir);
  symlinkSync(relPath, publicAssetsDir);
  console.log(`[build] Linked ${relPath} → public/assets`);

  console.log("[build] Running blume build...");
  execSync("npx blume build", { stdio: "inherit" });
  console.log("[build] Site built successfully → dist/");
};
