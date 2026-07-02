import { defineConfig } from "vite";

// Build @thinking-home/ui itself into a single "vendor" bundle.
//
// The host loads this bundle first. As a side effect (see src/index.ts) it
// publishes React and friends onto `window` (window.thReact, ...), and as a UMD
// library it publishes its own exports as `window.ThinkingHomeUi`. Plugins,
// built later, don't bundle these libraries — they read them from those globals
// (see build/window-externals.mjs).
export default defineConfig({
  // Vite lib mode does NOT inline `process.env.NODE_ENV` (it leaves that to the
  // consuming bundler). But this vendor bundle is loaded directly by a browser
  // via <script>, where `process` is undefined — so React/react-router's
  // `process.env.NODE_ENV` checks would throw. Bake in the production value.
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    // react-router flag for framework/SSR build mode — this is a plain SPA.
    "process.env.IS_RR_BUILD_REQUEST": "false",
  },
  esbuild: {
    jsx: "transform",
    jsxFactory: "React.createElement",
    jsxFragment: "React.Fragment",
  },
  build: {
    target: "es2020",
    // Rolldown's built-in minifier (Vite 8 defaults to esbuild, which we don't
    // install as it's now an optional peer).
    minify: "oxc",
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
