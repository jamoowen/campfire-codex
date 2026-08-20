import { rm } from 'node:fs/promises';

for (const directory of [
  'dist',
  '.recipe-build',
  '.wrangler/state',
  'node_modules/.tmp',
]) {
  await rm(directory, { force: true, recursive: true });
}
console.log('Ashes swept. Generated files removed.');
