# Private recipe files

This directory is the pantry. Do not put it in the shop window.

The application expects:

- `private/recipes.json` — the source recipe dataset.
- `private/schema-and-tags.json` — optional companion schema/facet notes.

Both JSON files are ignored by Git. The supplied starter ZIP already contains the owner's 300-recipe source data, but a normal `git add .` will not add it to a public repository.

Run `pnpm recipes:build` to validate and convert the source file. The generated `.recipe-build/catalog-v1.json` is also ignored by Git.
