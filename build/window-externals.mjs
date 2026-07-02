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
 *     export default value;            // -> React
 *     // useState resolves to value.useState  (via syntheticNamedExports)
 *
 * @param {Record<string, string>} globals map of module id -> window global name
 */
export function windowExternals(globals) {
  const PREFIX = "\0th-window-external:";

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

      return {
        // The default export is the whole library object read from window.
        // `syntheticNamedExports: true` makes any named import (e.g. useState)
        // resolve to a property of that default export at runtime.
        code: `const value = window[${JSON.stringify(globalName)}];\nexport default value;\n`,
        syntheticNamedExports: true,
        moduleSideEffects: false,
      };
    },
  };
}
