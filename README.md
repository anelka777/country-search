# Country Search

Живой поиск стран по имени (countries.dev) с отменой устаревших запросов через `AbortController`.

- Деплой: [country-searchhh.netlify.app](https://country-searchhh.netlify.app/)
- Архитектура и обоснования: [DESIGN.md](./DESIGN.md)

## Запуск

    npm install
    npm run build
    npx serve .

## Скрипты

- `npm run build`: компиляция TypeScript в `dist`
- `npm test`: тесты (Vitest)
- `npm run lint`, `npm run format`: ESLint и Prettier
