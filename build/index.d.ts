import type { InlineConfig, Plugin } from "vite";

export declare const WINDOW_GLOBALS: Record<string, string>;

export declare function createPluginConfig(options: {
  root: string;
  name: string;
  entry: string;
  outDir: string;
  mode?: "production" | "development";
}): InlineConfig;

export declare function resolveEntries(root: string): Record<string, string>;

export declare function windowExternals(globals: Record<string, string>): Plugin;

export declare function cssInject(): Plugin;

export declare function runBuild(argv?: string[]): Promise<void>;
