import type { PageIndex } from "./buildPageIndex.js";
import type { AssetIndex } from "./buildAssetIndex.js";

const PAGE_LINK_PATTERN = /\[([^\]]*?)\]\(([^)]*?)\)/g;

const ASSET_PATTERN = /(\/?)assets\/([^\s")]+)/g;

export interface TransformResult {
  markdown: string;
  referencedAssets: string[];
}

export const transformMdxToGrowi = (
  mdxText: string,
  sourceRel: string,
  pageIndex: Map<string, PageIndex>,
  assetIndex: Map<string, AssetIndex>,
): TransformResult => {
  let markdown = mdxText;
  const referencedAssets: string[] = [];

  markdown = replacePageLinks(markdown, sourceRel, pageIndex);

  const assetResult = replaceAssetLinks(markdown, assetIndex);
  markdown = assetResult.text;
  referencedAssets.push(...assetResult.referencedAssets);

  markdown = stripMdxSyntax(markdown);

  return { markdown, referencedAssets };
};

const replacePageLinks = (
  text: string,
  sourceRel: string,
  pageIndex: Map<string, PageIndex>,
): string => {
  return text.replace(PAGE_LINK_PATTERN, (match, displayText, url) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return match;
    }

    const fromDir = sourceRel.replace(/\/?[^/]*$/, "");
    const resolved = url.startsWith("/")
      ? url.slice(1)
      : url.startsWith("./")
        ? `${fromDir ? fromDir + "/" : ""}${url.slice(2)}`
        : url.startsWith("../")
          ? resolveRelativePath(fromDir, url)
          : `${fromDir ? fromDir + "/" : ""}${url}`;

    const cleanRel = resolved.replace(/\.mdx?$/i, "");

    const entry = pageIndex.get(cleanRel);
    if (entry) {
      return `[${displayText}](${entry.growiPath})`;
    }

    return match;
  });
};

const resolveRelativePath = (fromDir: string, url: string): string => {
  const parts = fromDir ? fromDir.split("/") : [];
  const segments = url.split("/");
  for (const seg of segments) {
    if (seg === "..") {
      if (parts.length > 0) parts.pop();
    } else if (seg !== ".") {
      parts.push(seg);
    }
  }
  return parts.join("/");
};

const replaceAssetLinks = (
  text: string,
  assetIndex: Map<string, AssetIndex>,
): { text: string; referencedAssets: string[] } => {
  const referencedAssets: string[] = [];
  let current = text;

  current = current.replace(ASSET_PATTERN, (match, leadingSlash, path) => {
    const assetKey = leadingSlash ? match.slice(1) : match;
    const entry = assetIndex.get(assetKey);

    if (entry) {
      referencedAssets.push(entry.assetKey);
      return `<ASSET_REF:${entry.assetKey}>`;
    }

    return match;
  });

  return { text: current, referencedAssets };
};

const stripMdxSyntax = (text: string): string => {
  const lines = text.split("\n");
  const result: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    if (/^```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      result.push(line);
      continue;
    }

    if (inCodeBlock) {
      result.push(line);
      continue;
    }

    if (/^import\s+.*?\s+from\s+['"].*?['"];?\s*$/.test(line.trim())) {
      continue;
    }
    if (/^export\s+/.test(line.trim())) {
      continue;
    }

    result.push(line);
  }

  return result.join("\n").replace(/^---[\s\S]*?---\n*/m, "").trim();
};
