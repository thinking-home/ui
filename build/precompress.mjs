import { compressAssets, writeManifest } from "./compress.mjs";

/**
 * Vite-плагин: сжимает файлы, которые выдала сборка, и пишет манифест.
 *
 * Нужен для сборок, которые описаны конфигом и не имеют обёртки вокруг vite
 * (например, main.js веб-интерфейса). Сборки через th-build вызывают
 * compressAssets напрямую — они собирают несколько точек входа отдельными
 * вызовами build() в один каталог, и манифест там пишется один раз после всех.
 *
 * Сжимаются только файлы этой сборки: в выходном каталоге может лежать чужая
 * статика (например, скопированные вендорные модули со своим манифестом).
 */
export function precompress() {
  let outDir;
  const fileNames = [];

  return {
    name: "th-precompress",
    apply: "build",
    enforce: "post",

    configResolved(config) {
      outDir = config.build.outDir;
    },

    writeBundle(_options, bundle) {
      fileNames.push(...Object.keys(bundle));
    },

    closeBundle() {
      writeManifest(outDir, compressAssets(outDir, fileNames));
    },
  };
}
