#!/usr/bin/env node

import { Command } from "commander";
import { buildSite } from "./build-site.js";
import { uploadGrowi } from "./upload-growi.js";

const program = new Command();

program
  .name("growi-blume-sitegen")
  .description("Blume × GROWI ハイブリッドサイトジェネレーター")
  .version("0.1.0");

program
  .command("build")
  .description("Build static site with Blume")
  .option("-c, --config <path>", "Path to config file")
  .action(async (options: { config?: string }) => {
    await buildSite(options.config);
  });

program
  .command("upload")
  .description("Upload pages and assets to GROWI")
  .option("-c, --config <path>", "Path to config file")
  .action(async (options: { config?: string }) => {
    await uploadGrowi(options.config);
  });

program
  .command("release")
  .description("Build site then upload to GROWI")
  .option("-c, --config <path>", "Path to config file")
  .action(async (options: { config?: string }) => {
    await buildSite(options.config);
    await uploadGrowi(options.config);
  });

program.parse();
