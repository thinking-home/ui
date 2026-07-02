// Generates build/externals-manifest.json: for every window-externalized
// library, the list of its named exports. Run during th-ui's own build, when
// the real libraries (react, react-router, ...) are present as devDependencies.
//
// windowExternals uses this to emit EXPLICIT named exports (`export const
// useState = window.thReact.useState`) instead of relying on Rollup's
// `syntheticNamedExports`, which Rolldown (Vite 8) does not support.
//
// The exports enumerated here match the runtime `window.*` objects, because the
// vendor bundle publishes the very same library builds this script imports.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { WINDOW_GLOBALS } from "./config.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SELF_DIST = resolve(here, "../dist/index.js");

const IDENT = /^[A-Za-z_$][\w$]*$/;
const RESERVED = new Set([
  "default", "do", "if", "in", "for", "let", "new", "try", "var", "case",
  "else", "enum", "eval", "null", "this", "true", "void", "with", "await",
  "break", "catch", "class", "const", "false", "super", "throw", "while",
  "yield", "delete", "export", "import", "return", "static", "switch",
  "typeof", "extends", "finally", "continue", "debugger", "function",
  "arguments", "interface", "protected", "implements", "instanceof",
  "package", "private", "public", "abstract", "boolean",
]);

const manifest = {};

for (const id of Object.keys(WINDOW_GLOBALS)) {
  // "@thinking-home/ui" is this package itself — import the built dist so we
  // enumerate exactly what it exports (window writes are guarded for Node).
  const spec = id === "@thinking-home/ui" ? SELF_DIST : id;
  const ns = await import(spec);
  manifest[id] = Object.keys(ns)
    .filter((k) => k !== "default" && IDENT.test(k) && !RESERVED.has(k))
    .sort();
}

writeFileSync(
  resolve(here, "externals-manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);

const summary = Object.entries(manifest)
  .map(([id, names]) => `${id}: ${names.length}`)
  .join(", ");
console.log(`[th-ui] wrote externals-manifest.json (${summary})`);
