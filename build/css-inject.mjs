/**
 * Rollup/Vite plugin that inlines the bundle's CSS into the JS bundle instead
 * of emitting a separate .css file. This keeps every plugin a single
 * self-contained file that can be loaded with a bare `import(url)` — the styles
 * are injected into <head> when the module is imported.
 *
 * Replaces the webpack `style-loader` + `css-loader` behaviour.
 */
export function cssInject() {
  return {
    name: "th-css-inject",
    apply: "build",
    enforce: "post",

    generateBundle(_options, bundle) {
      let css = "";

      // Collect and remove every emitted CSS asset.
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === "asset" && fileName.endsWith(".css")) {
          css += typeof chunk.source === "string" ? chunk.source : chunk.source.toString();
          delete bundle[fileName];
        }
      }

      if (!css) {
        return;
      }

      // Prepend a tiny injector to the entry chunk.
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === "chunk" && chunk.isEntry) {
          const injector =
            `(function(){try{` +
            `var s=document.createElement("style");` +
            `s.setAttribute("data-th-plugin","");` +
            `s.textContent=${JSON.stringify(css)};` +
            `document.head.appendChild(s);` +
            `}catch(e){console.error(e);}})();\n`;
          chunk.code = injector + chunk.code;
          break;
        }
      }
    },
  };
}
