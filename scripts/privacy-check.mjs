import { readdir, readFile, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const execFileAsync = promisify(execFile);
const skipped = new Set([
  '.git',
  '.recipe-build',
  '.wrangler',
  'dist',
  'node_modules',
  'private',
]);
const textExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);
const privateMarkers = [
  'amFtaWUtMDAx',
  'Q2hpY2tlbiAmIE11c2hyb29tIEJha2U=',
  'MzAwIEFjY2Vzc2libGUgUmVjaXBlcyBmcm9tIFJlcHV0YWJsZSBDaGVmcyBhbmQgQ29va2Jvb2sgQXV0aG9ycw==',
  'Y2hlZl9jb29rYm9va18zMDBfcmVjaXBlcw==',
].map((value) => Buffer.from(value, 'base64').toString('utf8'));

const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (skipped.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (textExtensions.has(path.extname(entry.name))) files.push(full);
  }
}
await walk(root);

const leaks = [];
const forbiddenTrackedPath = (file) =>
  (file.startsWith('private/') && file !== 'private/README.md') ||
  (file.startsWith('.recipe-build/') && file !== '.recipe-build/.gitkeep') ||
  file.startsWith('.wrangler/');

try {
  const { stdout } = await execFileAsync('git', ['ls-files', '--cached'], {
    cwd: root,
  });
  for (const file of stdout.split('\n').filter(Boolean)) {
    if (forbiddenTrackedPath(file))
      leaks.push(
        `${file} is tracked or staged despite repository privacy rules`,
      );
  }
} catch (error) {
  console.error("Unable to inspect Git's staged/tracked file list.", error);
  process.exit(1);
}

for (const file of files) {
  if ((await stat(file)).size > 2_000_000) continue;
  const text = await readFile(file, 'utf8');
  for (const marker of privateMarkers) {
    if (text.includes(marker))
      leaks.push(`${path.relative(root, file)} contains ${marker}`);
  }
}

if (leaks.length > 0) {
  console.error('Private recipe data leaked outside ignored directories:');
  for (const leak of leaks) console.error(`- ${leak}`);
  process.exit(1);
}
console.log(
  `Privacy check passed across ${files.length} public/source text files.`,
);
