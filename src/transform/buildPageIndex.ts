import { glob } from "glob";
import { resolve, relative } from "node:path";

export interface PageIndex {
  sourceRel: string;
  growiPath: string;
}

export const buildPageIndex = async (
  pagesDir: string,
  parentPagePath: string,
): Promise<Map<string, PageIndex>> => {
  const absolutePagesDir = resolve(pagesDir);
  const mdxFiles = await glob("**/*.mdx", { cwd: absolutePagesDir });
  mdxFiles.sort();

  const index = new Map<string, PageIndex>();

  for (const file of mdxFiles) {
    const sourceRel = file.replace(/\.mdx$/, "");
    const growiPath = `${parentPagePath.replace(/\/$/, "")}/${sourceRel}`;
    index.set(sourceRel, { sourceRel, growiPath });
  }

  return index;
};

export const resolveSourceRel = (
  fromFile: string,
  targetRel: string,
  pageIndex: Map<string, PageIndex>,
): string | null => {
  const fromDir = fromFile.replace(/\/?[^/]+$/, "");
  const resolved = resolve("/", fromDir, targetRel).replace(/^\//, "");

  if (pageIndex.has(resolved)) {
    return resolved;
  }

  const withoutMdx = targetRel.replace(/\.mdx?$/i, "");
  const resolvedNoExt = resolve("/", fromDir, withoutMdx).replace(/^\//, "");
  if (pageIndex.has(resolvedNoExt)) {
    return resolvedNoExt;
  }

  return null;
};
