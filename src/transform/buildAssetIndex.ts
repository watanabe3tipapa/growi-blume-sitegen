import { glob } from "glob";
import { resolve, basename } from "node:path";

export interface AssetIndex {
  assetKey: string;
  fileName: string;
}

export const buildAssetIndex = async (
  assetsDir: string,
): Promise<Map<string, AssetIndex>> => {
  const absoluteAssetsDir = resolve(assetsDir);
  const files = await glob("**/*", {
    cwd: absoluteAssetsDir,
    nodir: true,
  });

  const index = new Map<string, AssetIndex>();

  for (const file of files) {
    const assetKey = `assets/${file}`;
    index.set(assetKey, { assetKey, fileName: basename(file) });
    index.set(`/${assetKey}`, { assetKey, fileName: basename(file) });
  }

  return index;
};
