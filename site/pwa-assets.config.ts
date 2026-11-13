// Генерация PNG-иконок для PWA из одного SVG:  npx pwa-assets-generator
// Результат (pwa-*.png, maskable-icon-*.png, apple-touch-icon-*.png, favicon.ico) кладётся в public/ и коммитится.
import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset,
  images: ['public/favicon.svg'],
})
