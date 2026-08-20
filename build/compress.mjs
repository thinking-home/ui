import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync, brotliCompressSync, constants } from "node:zlib";

/**
 * Файл манифеста, который описывает собранную статику: какие сжатые варианты
 * созданы для каждого файла. Хост берёт имена файлов оттуда и не составляет их
 * сам — иначе схема имён дублировалась бы в сборке и в коде, который её отдаёт.
 */
export const MANIFEST_FILE = "manifest.json";

/**
 * Кладёт рядом с каждым файлом предсжатые копии (.br и .gz) и возвращает их
 * описание: имя файла -> { кодировка: имя сжатого файла }.
 *
 * Хост отдаёт готовый файл по Accept-Encoding: сжатие не пересчитывается на
 * каждый запрос и имеет максимальное качество. gzip обязателен и используется
 * на практике — браузеры анонсируют brotli только в защищённом контексте
 * (HTTPS или localhost), а веб-интерфейс открывают по http в локальной сети.
 *
 * @param {string} dir каталог со сборкой
 * @param {string[]} fileNames файлы, которые выдала сборка
 * @returns {Record<string, Record<string, string>>}
 */
export function compressAssets(dir, fileNames) {
  const files = {};

  for (const fileName of fileNames) {
    const path = resolve(dir, fileName);
    const source = readFileSync(path);

    const brotli = brotliCompressSync(source, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
        [constants.BROTLI_PARAM_SIZE_HINT]: source.length,
      },
    });

    const gzip = gzipSync(source, { level: constants.Z_BEST_COMPRESSION });

    writeFileSync(`${path}.br`, brotli);
    writeFileSync(`${path}.gz`, gzip);

    files[fileName] = { br: `${fileName}.br`, gzip: `${fileName}.gz` };

    console.log(
      `[th-ui] ${fileName} ${kb(source.length)} → gzip ${kb(gzip.length)}, brotli ${kb(brotli.length)}`,
    );
  }

  return files;
}

/**
 * Записывает манифест собранной статики целиком. Манифест всегда пишется одним
 * вызовом за сборку: если дописывать его по частям, в нём накапливались бы
 * записи о файлах, которых в сборке уже нет.
 *
 * @param {string} dir каталог со сборкой
 * @param {Record<string, Record<string, string>>} files
 */
export function writeManifest(dir, files) {
  writeFileSync(resolve(dir, MANIFEST_FILE), JSON.stringify({ files }, null, 2));
}

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
