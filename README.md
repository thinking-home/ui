# @thinking-home/ui

Базовая библиотека для разработки плагинов [ThinkingHome System](https://github.com/thinking-home/system).

- общие интерфейсы и API для хоста и плагинов;
- сборка плагинов в самодостаточные ESM-бандлы (Vite), которые хост загружает
  через `import(url)`.

## Как это работает

1. **Vendor-бандл.** `@thinking-home/ui` собирается Vite в `dist/vendor.js`
   (UMD). Хост загружает его первым: как side-effect он публикует React и
   соседние библиотеки в `window` (`window.thReact`, `window.thReactDOMClient`,
   …), а свои экспорты — как `window.ThinkingHomeUi`.
2. **Плагины.** Плагин не бандлит React и т. п. — при сборке эти импорты
   заменяются на чтение из соответствующих `window`-глобалей
   (см. `build/window-externals.mjs`). Поэтому все плагины используют один
   инстанс React, который дал хост.

## Сборка плагина

Разработчику плагина **не нужно** добавлять Vite или конфиги — всё внутри
`@thinking-home/ui`. Достаточно раннера `th-build`.

```bash
npm init -y
npm install @thinking-home/ui
```

Опиши точки входа — любым из двух способов:

**A. По соглашению (без конфига):** каждый файл в `src/entries/` — это точка
входа, имя бандла совпадает с именем файла.

```
src/entries/widget.tsx      ->  dist/widget.js
src/entries/settings.tsx    ->  dist/settings.js
```

**B. Явно, в `package.json`** (полный контроль над именами и путями):

```json
{
  "thPlugin": {
    "entries": {
      "widget": "src/widget.tsx",
      "settings": "src/panels/settings.tsx"
    }
  }
}
```

Каждая точка входа экспортирует экземпляр плагина как `default`:

```tsx
import React from "react";
import { createModule } from "@thinking-home/ui";

function Widget() {
  return <div>hello</div>;
}

export default createModule(Widget);
```

Собери:

```json
{
  "scripts": {
    "build": "th-build"
  }
}
```

```bash
npm run build          # -> dist/widget.js, dist/settings.js (по одному на точку входа)
npm run build -- --mode development   # dev-сборка с sourcemap
```

В `dist/` появится по одному самодостаточному ESM-бандлу на каждую точку входа —
их можно грузить через `import(url)`.

## Экспорт хелперов

Если нужен собственный `vite.config`, базовый конфиг доступен отдельно:

```js
import { createPluginConfig, resolveEntries } from "@thinking-home/ui/build";
```
