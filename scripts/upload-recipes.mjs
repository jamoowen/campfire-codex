import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv.includes("--local") ? "local" : "remote";

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(process.execPath, ["scripts/build-recipes.mjs"]);
run("pnpm", [
  "exec",
  "wrangler",
  "r2",
  "object",
  "put",
  "campfire-codex-recipes/catalog/v1.json",
  "--file=.recipe-build/catalog-v1.json",
  "--content-type=application/json",
  "--cache-control=no-store",
  mode === "local" ? "--local" : "--remote",
  ...(mode === "local" ? ["--persist-to=.wrangler/state"] : []),
]);

console.log(
  mode === "local"
    ? "Local R2 seeded. Start the app with: pnpm dev"
    : "Private recipe catalogue uploaded to R2. The Worker will refresh it within about 60 seconds.",
);
