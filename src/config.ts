import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";

export interface GrowiConfig {
  baseUrl: string;
  apiToken: string;
  parentPagePath: string;
}

export interface Config {
  contentDir: string;
  pagesDir: string;
  assetsDir: string;
  growi: GrowiConfig;
}

const DEFAULTS = {
  contentDir: "content",
  pagesDir: "content/pages",
  assetsDir: "content/assets",
  parentPagePath: "/",
};

export const loadConfig = (configPath?: string): Config => {
  const fullPath = resolve(configPath || "growi-blume-sitegen.config.yml");

  let input: Record<string, unknown>;
  try {
    const content = readFileSync(fullPath, "utf-8");
    input = parse(content) as Record<string, unknown>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.warn(`Config file not found: ${fullPath}, using defaults`);
      input = {};
    } else {
      throw error;
    }
  }

  const contentDir = (input.contentDir as string) || DEFAULTS.contentDir;
  const pagesDir = (input.pagesDir as string) || DEFAULTS.pagesDir;
  const assetsDir = (input.assetsDir as string) || DEFAULTS.assetsDir;

  const growiInput = (input.growi || {}) as Partial<GrowiConfig>;

  if (!growiInput.baseUrl || !growiInput.apiToken) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("growi.baseUrl and growi.apiToken are required in production");
    }
  }

  const growi: GrowiConfig = {
    baseUrl: growiInput.baseUrl || "",
    apiToken: growiInput.apiToken || "",
    parentPagePath: growiInput.parentPagePath || DEFAULTS.parentPagePath,
  };

  return { contentDir, pagesDir, assetsDir, growi };
};
