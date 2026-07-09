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
// `@thinking-home/ui` is built from its own source (src/index.ts). When another
// library shares its output file (e.g. `@thinking-home/i18n`), the source
// module's exports are re-exported alongside that library's — the merged file
// then answers the import map for every specifier in the group.
import { rmSync, mkdirSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { build } from "vite";
import { SHARED, forceExternal } from "./shared.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const vendorDir = resolve(root, "vendor");

const SELF = "@thinking-home/ui";
const SELF_ENTRY = resolve(root, "src/index.ts");
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

// In-memory entry that re-exports every library in the group. Third-party
// libraries are re-exported by their enumerated named exports (deduplicated
// across the group — e.g. `version` exists in both react and react-dom); the
// primary library's namespace is exposed as the default export. When the group
// includes `@thinking-home/ui`, its source module is re-exported wholesale with
// `export *` (ESM, so the star sees its named exports) and no default is added.
function virtualEntry(specsInGroup) {
  const includesSelf = specsInGroup.includes(SELF);
  const others = specsInGroup.filter((s) => s !== SELF);
  return {
    name: "th-vendor-entry",
    resolveId(source) {
      return source === VIRTUAL ? RESOLVED : null;
    },
    load(id) {
      if (id !== RESOLVED) return null;
      const seen = new Set();
      const lines = [];
      // `@thinking-home/ui`: pull in the whole source module. Explicit named
      // re-exports below shadow any same-named star export, so no conflict.
      if (includesSelf) {
        lines.push(`export * from ${JSON.stringify(SELF_ENTRY)};`);
      }
      for (const spec of others) {
        const fresh = namesBySpec[spec].filter((n) => !seen.has(n));
        fresh.forEach((n) => seen.add(n));
        if (fresh.length) {
          lines.push(`export { ${fresh.join(", ")} } from ${JSON.stringify(spec)};`);
        }
      }
      // Default = the primary library's namespace (e.g. `import React from …`).
      // The self source has no default export, so groups with it get none.
      if (!includesSelf) {
        lines.push(`import * as __primary from ${JSON.stringify(others[0])};`);
        lines.push(`export default __primary;`);
      }
      return lines.join("\n") + "\n";
    },
  };
}

rmSync(vendorDir, { recursive: true, force: true });
mkdirSync(vendorDir, { recursive: true });

for (const [filename, specsInGroup] of Object.entries(groups)) {
  const external = Object.keys(SHARED).filter((s) => !specsInGroup.includes(s));

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
    plugins: [forceExternal(external), virtualEntry(specsInGroup)],
    build: {
      outDir: vendorDir,
      emptyOutDir: false,
      target: "es2020",
      minify: "oxc",
      rollupOptions: {
        input: VIRTUAL,
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
