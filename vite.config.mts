import { defineConfig } from "vite";

// Build @thinking-home/ui itself into a single "vendor" bundle.
//
// The host loads this bundle first. As a side effect (see src/index.ts) it
// publishes React and friends onto `window` (window.thReact, ...), and as a UMD
// library it publishes its own exports as `window.ThinkingHomeUi`. Plugins,
// built later, don't bundle these libraries — they read them from those globals
// (see build/window-externals.mjs).
export default defineConfig({
  esbuild: {
    jsx: "transform",
    jsxFactory: "React.createElement",
    jsxFragment: "React.Fragment",
  },
  build: {
    target: "es2020",
    minify: true,
    // vendor.js is emitted here; `tsc` later adds the .d.ts / CJS files.
    emptyOutDir: false,
    lib: {
      entry: "src/index.ts",
      name: "ThinkingHomeUi",
      formats: ["umd"],
      fileName: () => "vendor.js",
    },
  },
});
