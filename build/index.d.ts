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

export declare function runBuild(argv?: string[]): Promise<void>;
