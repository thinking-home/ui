import { windowExternals } from "./window-externals.mjs";
import { cssInject } from "./css-inject.mjs";

/**
 * Libraries the host provides via `window` globals. Plugins reuse these instead
 * of bundling their own copies. Keep this in sync with the assignments in
 * src/index.ts (the vendor bundle) and the UMD name in vite.config.ts.
 */
export const WINDOW_GLOBALS = {
  react: "thReact",
  "react-dom/client": "thReactDOMClient",
  "react-router": "thReactRouter",
  "react-router-dom": "thReactRouterDOM",
  history: "thHistory",
  "@thinking-home/i18n": "thI18n",
  "@thinking-home/ui": "ThinkingHomeUi",
};

/**
 * Build the Vite inline config for a single plugin entry point. Each entry is
 * built on its own into one self-contained ESM file (`<name>.js`) so it can be
 * loaded with `import(url)`.
 *
 * @param {object} options
 * @param {string} options.root    absolute path of the plugin project
 * @param {string} options.name    bundle name (without extension)
 * @param {string} options.entry   absolute path to the entry file
 * @param {string} options.outDir  absolute output directory
 * @param {"production"|"development"} [options.mode]
 * @returns {import("vite").InlineConfig}
 */
export function createPluginConfig({ root, name, entry, outDir, mode = "production" }) {
  const isProduction = mode === "production";

  return {
    root,
    // Never pick up a stray vite.config from the plugin project.
    configFile: false,
    logLevel: "warn",
    mode,
    // Vite lib mode doesn't inline this, but a plugin may bundle a third-party
    // library that branches on `process.env.NODE_ENV`; bake it in so the bundle
    // doesn't reference `process` (undefined in the browser).
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    esbuild: {
      // Classic JSX transform: entry/component files must `import React`.
      jsx: "transform",
      jsxFactory: "React.createElement",
      jsxFragment: "React.Fragment",
    },
    plugins: [windowExternals(WINDOW_GLOBALS), cssInject()],
    build: {
      outDir,
      // We clean the dir once up front and build entries one by one into it.
      emptyOutDir: false,
      target: "es2020",
      // Rolldown's built-in minifier (Vite 8 defaults to esbuild, an optional peer).
      minify: isProduction ? "oxc" : false,
      sourcemap: isProduction ? false : "inline",
      lib: {
        entry,
        formats: ["es"],
        fileName: () => `${name}.js`,
      },
      rollupOptions: {
        // Keep each entry a single self-contained file (no code splitting).
        output: { codeSplitting: false },
      },
    },
  };
}
