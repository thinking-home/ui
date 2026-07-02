import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const MANIFEST_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "externals-manifest.json",
);

function loadManifest() {
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  } catch {
    return {};
  }
}

/**
 * Rollup/Vite plugin that replaces imports of shared libraries with reads from
 * `window` globals, instead of bundling them into every plugin.
 *
 * This is the Vite equivalent of webpack's `externals` + `externalsType: "window"`.
 * The vendor bundle (@thinking-home/ui) publishes these globals once; each plugin
 * then reuses the host's single instance of React, react-router, etc.
 *
 * `import React, { useState } from "react"` compiles to:
 *     const value = window["thReact"];
 *     export default value;                          // -> React
 *     export const useState = value["useState"], ...; // named exports
 *
 * Named exports are listed EXPLICITLY (from externals-manifest.json) rather than
 * via Rollup's `syntheticNamedExports`, which Rolldown (Vite 8) does not support.
 * If the manifest is missing we fall back to syntheticNamedExports (Rollup only).
 *
 * @param {Record<string, string>} globals map of module id -> window global name
 */
export function windowExternals(globals) {
  const PREFIX = "\0th-window-external:";
  const manifest = loadManifest();

  return {
    name: "th-window-externals",
    enforce: "pre",

    resolveId(source) {
      if (Object.prototype.hasOwnProperty.call(globals, source)) {
        return PREFIX + source;
      }
      return null;
    },

    load(id) {
      if (!id.startsWith(PREFIX)) {
        return null;
      }

      const source = id.slice(PREFIX.length);
      const globalName = globals[source];
      const names = manifest[source] || [];

      let code =
        `const value = window[${JSON.stringify(globalName)}];\n` +
        `const pick = (key) => value[key];\n` +
        `export default value;\n`;

      if (names.length > 0) {
        // `/*#__PURE__*/` marks each read as side-effect-free so the bundler can
        // tree-shake the named exports the importer doesn't actually use.
        code += names
          .map(
            (name) =>
              `export const ${name} = /*#__PURE__*/ pick(${JSON.stringify(name)});`,
          )
          .join("\n");
        code += "\n";
        return { code, moduleSideEffects: false };
      }

      // No manifest entry: rely on syntheticNamedExports (works on Rollup only).
      return { code, syntheticNamedExports: true, moduleSideEffects: false };
    },
  };
}
