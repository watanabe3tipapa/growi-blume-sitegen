import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { loadConfig } from "./config.js";
import { buildPageIndex } from "./transform/buildPageIndex.js";
import { buildAssetIndex } from "./transform/buildAssetIndex.js";
import { transformMdxToGrowi } from "./transform/transformMdxToGrowi.js";

export const uploadGrowi = async (configPath?: string): Promise<void> => {
  const config = loadConfig(configPath);

  const pagesDir = resolve(config.pagesDir);
  const assetsDir = resolve(config.assetsDir);
  const outDir = resolve("content/.generated/growi");

  if (!existsSync(pagesDir)) {
    throw new Error(`Pages directory not found: ${pagesDir}`);
  }

  console.log("[upload] Building page index...");
  const pageIndex = await buildPageIndex(
    config.pagesDir,
    config.growi.parentPagePath,
  );
  console.log(`[upload] Found ${pageIndex.size} page(s)`);

  console.log("[upload] Building asset index...");
  const assetIndex = await buildAssetIndex(config.assetsDir);
  console.log(`[upload] Found ${assetIndex.size} asset key(s)`);

  console.log("[upload] Transforming MDX → GROWI Markdown...");
  mkdirSync(outDir, { recursive: true });

  const allReferencedAssets = new Set<string>();

  for (const [sourceRel] of pageIndex) {
    const mdxPath = resolve(pagesDir, `${sourceRel}.mdx`);

    if (!existsSync(mdxPath)) {
      console.warn(`[upload] Skipping ${sourceRel}: file not found`);
      continue;
    }

    const mdxText = readFileSync(mdxPath, "utf-8");
    const result = transformMdxToGrowi(
      mdxText,
      sourceRel,
      pageIndex,
      assetIndex,
    );

    const outPath = resolve(outDir, `${sourceRel}.md`);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, result.markdown, "utf-8");

    for (const ref of result.referencedAssets) {
      allReferencedAssets.add(ref);
    }
  }

  console.log(`[upload] Copying ${allReferencedAssets.size} referenced asset(s)...`);

  for (const assetKey of allReferencedAssets) {
    const cleanKey = assetKey.replace(/^\/?assets\//, "");
    const srcPath = resolve(assetsDir, cleanKey);

    if (!existsSync(srcPath)) {
      console.warn(`[upload] Asset not found: ${srcPath}`);
      continue;
    }

    const pageName = basename(assetKey, `.${basename(assetKey).split(".").pop() || ""}`)
      .replace(/^assets\//, "");
    const outPath = resolve(outDir, `${pageName}_attachment_${basename(srcPath)}`);

    mkdirSync(dirname(outPath), { recursive: true });
    copyFileSync(srcPath, outPath);
    console.log(`  ${assetKey} → ${outPath}`);
  }

  console.log("[upload] Creating temporary growi-uploader config...");
  const uploaderConfig = {
    url: config.growi.baseUrl.replace(/\/+$/, ""),
    token: config.growi.apiToken,
    basePath: config.growi.parentPagePath,
    update: true,
  };

  const tmpConfigPath = resolve(outDir, "growi-uploader.json");
  writeFileSync(tmpConfigPath, JSON.stringify(uploaderConfig, null, 2));

  console.log("[upload] Running growi-uploader...");
  try {
    execSync(`npx @onozaty/growi-uploader ${outDir} -c ${tmpConfigPath}`, {
      stdio: "inherit",
    });
  } catch (error) {
    console.error("[upload] growi-uploader failed");
    throw error;
  }

  console.log("[upload] Done.");
};
