import { uploadGrowi } from "../src/upload-growi.js";
import { loadConfig } from "../src/config.js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildPageIndex } from "../src/transform/buildPageIndex.js";
import { buildAssetIndex } from "../src/transform/buildAssetIndex.js";
import { transformMdxToGrowi } from "../src/transform/transformMdxToGrowi.js";

const main = async () => {
  const args = process.argv.slice(2);
  const configIndex = args.indexOf("-c");
  const configPath =
    configIndex !== -1 ? args[configIndex + 1] : undefined;
  const isDryRun = args.includes("--dry-run");

  if (isDryRun) {
    await dryRun(configPath);
  } else {
    await uploadGrowi(configPath);
  }
};

const dryRun = async (configPath?: string): Promise<void> => {
  const config = loadConfig(configPath);
  const pagesDir = resolve(config.pagesDir);

  console.log("[dry-run] Building page index...");
  const pageIndex = await buildPageIndex(
    config.pagesDir,
    config.growi.parentPagePath,
  );
  console.log(`[dry-run] Found ${pageIndex.size} page(s)`);

  console.log("[dry-run] Building asset index...");
  const assetIndex = await buildAssetIndex(config.assetsDir);
  console.log(`[dry-run] Found ${assetIndex.size} asset key(s)`);

  console.log("\n[dry-run] Transform results:");
  console.log("=".repeat(60));

  for (const [sourceRel] of pageIndex) {
    const mdxPath = resolve(pagesDir, `${sourceRel}.mdx`);
    if (!existsSync(mdxPath)) {
      console.warn(`Skipping ${sourceRel}: file not found`);
      continue;
    }

    const mdxText = readFileSync(mdxPath, "utf-8");
    const result = transformMdxToGrowi(
      mdxText,
      sourceRel,
      pageIndex,
      assetIndex,
    );

    console.log(`\n--- ${sourceRel} ---`);
    console.log(result.markdown);
    if (result.referencedAssets.length > 0) {
      console.log(`  Referenced assets: ${result.referencedAssets.join(", ")}`);
    }
  }

  console.log("\n[dry-run] No files were written. Use without --dry-run to execute.");
};

main().catch((err) => {
  console.error("[upload] Error:", err.message);
  process.exit(1);
});
