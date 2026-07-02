import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve, extname, basename } from "node:path";

const ENTRY_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

/**
 * Figure out a plugin's entry points. Two ways to declare them:
 *
 * 1. Explicit map in package.json (full control over names and paths):
 *
 *      "thPlugin": {
 *        "entries": {
 *          "widget":   "src/widget.tsx",
 *          "settings": "src/settings.tsx"
 *        }
 *      }
 *
 * 2. Convention (zero config): every file in `src/entries/` becomes an entry,
 *    named after the file. `src/entries/widget.tsx` -> `dist/widget.js`.
 *
 * The explicit map wins when both are present.
 *
 * @param {string} root absolute path of the plugin project
 * @returns {Record<string, string>} bundle name -> absolute entry path
 */
export function resolveEntries(root) {
  const pkgPath = join(root, "package.json");
  const pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, "utf8")) : {};

  const configured = pkg.thPlugin && pkg.thPlugin.entries;
  if (configured && typeof configured === "object") {
    const entries = {};
    for (const [name, relPath] of Object.entries(configured)) {
      entries[name] = resolve(root, relPath);
    }
    if (Object.keys(entries).length > 0) {
      return entries;
    }
  }

  const dir = join(root, "src", "entries");
  if (existsSync(dir)) {
    const entries = {};
    for (const file of readdirSync(dir)) {
      const ext = extname(file);
      if (ENTRY_EXTENSIONS.has(ext)) {
        entries[basename(file, ext)] = join(dir, file);
      }
    }
    if (Object.keys(entries).length > 0) {
      return entries;
    }
  }

  throw new Error(
    "No plugin entries found.\n" +
      'Declare them in package.json ("thPlugin": { "entries": { "<name>": "<path>" } })\n' +
      "or create entry files in src/entries/*.{ts,tsx}.",
  );
}
