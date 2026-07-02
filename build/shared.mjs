import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

/** The single source of truth: shared specifier -> vendor file name. */
export const SHARED = JSON.parse(
  readFileSync(resolve(here, "..", "shared.json"), "utf8"),
);

/**
 * Bare specifiers the host provides as shared ESM modules through its import
 * map. Host and plugin builds mark these external so they aren't bundled.
 */
export const SHARED_EXTERNALS = Object.keys(SHARED);

/**
 * Vite/Rolldown plugin that marks the shared libraries external at resolve time
 * — reliable even when a library is reached through a CJS `require(...)` inside
 * a bundled dependency (which `rollupOptions.external` alone can miss).
 *
 * @param {string[]} [ids] specifiers to externalize (defaults to all shared)
 */
export function forceExternal(ids = SHARED_EXTERNALS) {
  const set = new Set(ids);
  return {
    name: "th-force-external",
    enforce: "pre",
    resolveId(source) {
      return set.has(source) ? { id: source, external: true } : null;
    },
  };
}
