#!/usr/bin/env node
// Runnable entry for building a plugin. A plugin project runs this (via the
// `th-build` bin or `npx th-build`) — it discovers the entry points, generates
// a Vite config and runs Vite. No need to add Vite to the plugin's deps.
import { runBuild } from "../build/index.mjs";

runBuild(process.argv.slice(2)).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
