import { buildSite } from "../src/build-site.js";

const main = async () => {
  const args = process.argv.slice(2);
  const configIndex = args.indexOf("-c");
  const configPath =
    configIndex !== -1 ? args[configIndex + 1] : undefined;
  await buildSite(configPath);
};

main().catch((err) => {
  console.error("[build] Error:", err.message);
  process.exit(1);
});
