import { spawnSync } from "node:child_process";
import process from "node:process";

const bucket = "campfire-codex-recipes";

function wrangler(args, { allowFailure = false } = {}) {
  const result = spawnSync("pnpm", ["exec", "wrangler", ...args], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (!allowFailure && result.status !== 0) process.exit(result.status ?? 1);
  return result.status ?? 1;
}

console.log("\n1/3 Checking the active Cloudflare login…\n");
wrangler(["whoami"]);

console.log(`\n2/3 Checking private R2 bucket: ${bucket}\n`);
const exists = wrangler(["r2", "bucket", "info", bucket], { allowFailure: true }) === 0;
if (!exists) {
  console.log(`\nThe bucket was not found. Creating ${bucket}…\n`);
  wrangler(["r2", "bucket", "create", bucket]);
}

console.log("\n3/3 Building and uploading the private recipe catalogue…\n");
const upload = spawnSync(process.execPath, ["scripts/upload-recipes.mjs", "--remote"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (upload.error) throw upload.error;
if (upload.status !== 0) process.exit(upload.status ?? 1);

console.log("\nCloudflare storage is ready. Deploy the site with: pnpm deploy\n");
