import type { InlineConfig, Plugin } from "vite";

export declare const SHARED: Record<string, string>;
export declare const SHARED_EXTERNALS: string[];

export declare function forceExternal(ids?: string[]): Plugin;

export declare function createPluginConfig(options: {
  root: string;
  name: string;
  entry: string;
  outDir: string;
  mode?: "production" | "development";
}): InlineConfig;

export declare function resolveEntries(root: string): Record<string, string>;

export declare function cssInject(): Plugin;

/** Имя файла манифеста собранной статики. */
export declare const MANIFEST_FILE: string;

/**
 * Кладёт рядом с каждым файлом предсжатые копии (.br и .gz)
 * и возвращает их описание: файл -> { кодировка: имя файла }.
 */
export declare function compressAssets(
  dir: string,
  fileNames: string[],
): Record<string, Record<string, string>>;

/** Записывает манифест собранной статики целиком. */
export declare function writeManifest(
  dir: string,
  files: Record<string, Record<string, string>>,
): void;

/** Сжимает файлы сборки и пишет манифест. Для сборок, описанных конфигом. */
export declare function precompress(): Plugin;

export declare function runBuild(argv?: string[]): Promise<void>;
