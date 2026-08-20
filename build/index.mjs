import { rmSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import parse from "minimist";
import { build } from "vite";
import { resolveEntries } from "./entries.mjs";
import { createPluginConfig } from "./config.mjs";
import { compressAssets, writeManifest } from "./compress.mjs";

export { createPluginConfig } from "./config.mjs";
export { SHARED, SHARED_EXTERNALS, forceExternal } from "./shared.mjs";
export { resolveEntries } from "./entries.mjs";
export { cssInject } from "./css-inject.mjs";
export { compressAssets, writeManifest, MANIFEST_FILE } from "./compress.mjs";
export { precompress } from "./precompress.mjs";

/**
 * Discover a plugin's entry points, then build each one into its own
 * self-contained ESM bundle. This is what the `th-build` bin runs.
 *
 * Flags: --mode <production|development>, --root <dir>, --outDir <dir>
 *
 * @param {string[]} argv process.argv.slice(2)
 */
export async function runBuild(argv = []) {
  const args = parse(argv, { string: ["mode", "root", "outDir"] });

  const root = args.root ? resolve(process.cwd(), args.root) : process.cwd();
  const mode = args.mode === "development" ? "development" : "production";
  const outDir = resolve(root, args.outDir || "dist");

  const entries = resolveEntries(root);
  const names = Object.keys(entries);

  console.log(
    `[th-build] building ${names.length} bundle(s) in ${mode} mode: ${names.join(", ")}`,
  );

  // Clean once, then let each entry write into the shared dist directory.
  rmSync(outDir, { recursive: true, force: true });

  // Имена берём из результата сборки: каталог общий для всех точек входа,
  // и определять содержимое сборки его просмотром было бы ненадёжно.
  const fileNames = [];

  for (const [name, entry] of Object.entries(entries)) {
    const result = await build(createPluginConfig({ root, name, entry, outDir, mode }));

    for (const output of [result].flat()) {
      fileNames.push(...output.output.map((chunk) => chunk.fileName));
    }

    console.log(`[th-build] ✓ ${name} → ${join(relative(root, outDir) || ".", name + ".js")}`);
  }

  // Манифест пишется один раз и целиком, когда собраны все точки входа.
  writeManifest(outDir, compressAssets(outDir, fileNames));

  console.log("[th-build] done.");
}
