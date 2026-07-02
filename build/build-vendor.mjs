// Builds the shared libraries into self-contained ESM modules in `vendor/`,
// driven entirely by shared.json (the single source of truth).
//
// Multiple specifiers may map to the same output file (e.g. react, react-dom and
// react-dom/client all -> react.js). Specifiers sharing a file are bundled
// TOGETHER — this matters for React's CJS packages, where externalizing `react`
// out of `react-dom` would leave a runtime `require("react")` that crashes in
// the browser. Everything NOT in the current file's group is external (a bare
// ESM import the host's import map resolves at runtime), so each library stays a
// single shared instance.
//
// React's packages are CJS, so `export *` cannot see their named exports. We
// enumerate each library's exports here (in Node, where they're installed) and
// re-export them EXPLICITLY, which Rolldown resolves via cjs-module-lexer.
//
// `@thinking-home/ui` is built from its own source (src/index.ts).
import { rmSync, mkdirSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { build } from "vite";
import { SHARED, forceExternal } from "./shared.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const vendorDir = resolve(root, "vendor");

const SELF = "@thinking-home/ui";
const VIRTUAL = "virtual:vendor-entry";
const RESOLVED = "\0" + VIRTUAL;
const IDENT = /^[A-Za-z_$][\w$]*$/;

// Group specifiers by their output filename.
const groups = {};
for (const [spec, file] of Object.entries(SHARED)) {
  (groups[file] ??= []).push(spec);
}

// Enumerate the named exports of every (non-self) specifier.
const namesBySpec = {};
for (const spec of Object.keys(SHARED)) {
  if (spec === SELF) continue;
  const ns = await import(spec);
  namesBySpec[spec] = Object.keys(ns).filter(
    (k) => k !== "default" && k !== "__esModule" && IDENT.test(k),
  );
}

// In-memory entry that explicitly re-exports every library in the group
// (deduplicated across the group — e.g. `version` exists in both react and
// react-dom), plus the primary library's namespace as the default export.
function virtualEntry(specsInGroup) {
  return {
    name: "th-vendor-entry",
    resolveId(source) {
      return source === VIRTUAL ? RESOLVED : null;
    },
    load(id) {
      if (id !== RESOLVED) return null;
      const seen = new Set();
      const lines = [];
      for (const spec of specsInGroup) {
        const fresh = namesBySpec[spec].filter((n) => !seen.has(n));
        fresh.forEach((n) => seen.add(n));
        if (fresh.length) {
          lines.push(`export { ${fresh.join(", ")} } from ${JSON.stringify(spec)};`);
        }
      }
      lines.push(`import * as __primary from ${JSON.stringify(specsInGroup[0])};`);
      lines.push(`export default __primary;`);
      return lines.join("\n") + "\n";
    },
  };
}

rmSync(vendorDir, { recursive: true, force: true });
mkdirSync(vendorDir, { recursive: true });

for (const [filename, specsInGroup] of Object.entries(groups)) {
  const external = Object.keys(SHARED).filter((s) => !specsInGroup.includes(s));
  const isSelf = specsInGroup.includes(SELF);
  const input = isSelf ? resolve(root, "src/index.ts") : VIRTUAL;

  await build({
    root,
    configFile: false,
    logLevel: "warn",
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    esbuild: {
      jsx: "transform",
      jsxFactory: "React.createElement",
      jsxFragment: "React.Fragment",
    },
    plugins: [forceExternal(external), ...(isSelf ? [] : [virtualEntry(specsInGroup)])],
    build: {
      outDir: vendorDir,
      emptyOutDir: false,
      target: "es2020",
      minify: "oxc",
      rollupOptions: {
        input,
        external,
        // Keep ALL of the entry's re-exports (this is a library, not an app).
        preserveEntrySignatures: "strict",
        output: {
          format: "es",
          entryFileNames: filename,
          codeSplitting: false,
        },
      },
    },
  });

  console.log(`[th-ui] vendor: ${specsInGroup.join(", ")} → vendor/${filename}`);
}

copyFileSync(resolve(root, "shared.json"), resolve(vendorDir, "shared.json"));
console.log("[th-ui] vendor built.");
