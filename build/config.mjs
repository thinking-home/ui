import { cssInject } from "./css-inject.mjs";
import { SHARED_EXTERNALS, forceExternal } from "./shared.mjs";

/**
 * Build the Vite inline config for a single plugin entry point. Each entry is
 * built on its own into one self-contained ESM file (`<name>.js`) so it can be
 * loaded with `import(url)`.
 *
 * The shared libraries (react, react-router, @thinking-home/ui, …) are left as
 * bare imports for the host's import map to resolve at runtime — they are NOT
 * bundled into the plugin.
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
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    esbuild: {
      // Classic JSX transform: entry/component files must `import React`.
      jsx: "transform",
      jsxFactory: "React.createElement",
      jsxFragment: "React.Fragment",
    },
    plugins: [forceExternal(), cssInject()],
    build: {
      outDir,
      // We clean the dir once up front and build entries one by one into it.
      emptyOutDir: false,
      target: "es2020",
      minify: isProduction ? "oxc" : false,
      sourcemap: isProduction ? false : "inline",
      lib: {
        entry,
        formats: ["es"],
        fileName: () => `${name}.js`,
      },
      rollupOptions: {
        external: SHARED_EXTERNALS,
        output: { codeSplitting: false },
      },
    },
  };
}
