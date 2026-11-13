import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vitepress'
import { withPwa } from '@vite-pwa/vitepress'
import type { Plugin } from 'vite'
import { PARTS } from '../scripts/chapters.mjs'
import { REPO_ROOT, SITE_DIR, repoUrl, sync } from '../scripts/sync-content.mjs'
import { ruTerm } from './theme/lib/ru-stem'

// base: на GitHub Pages сайт лежит в /<имя-репозитория>/; локально — в корне.
// Принимаем «go-backend-book», «/go-backend-book» и «/go-backend-book/».
function resolveBase(raw: string | undefined): string {
  const value = (raw ?? '').trim()
  if (/^[A-Za-z]:[\\/]/.test(value)) {
    // Git Bash на Windows превращает «/x/» в «C:/Program Files/Git/x/», когда передаёт значение программе
    throw new Error(
      `BASE="${value}" похоже на путь Windows (Git Bash преобразовал значение). ` +
        'Задайте BASE=имя-репозитория (без слэшей) или запустите с MSYS_NO_PATHCONV=1.',
    )
  }
  const trimmed = value.replace(/^\/+|\/+$/g, '')
  return trimmed ? `/${trimmed}/` : '/'
}
const base = resolveBase(process.env.BASE)
const repo = repoUrl()

// Корневые *.md -> site/content/ ДО того, как VitePress просканирует страницы.
sync()

/** В dev-режиме пересобирает content/ при правке корневых глав. */
function bookSync(): Plugin {
  return {
    name: 'book-sync',
    configureServer(server) {
      // Явный список файлов, а не glob: chokidar на Windows не понимает glob с обратными слэшами.
      const norm = (p: string) => p.replace(/\\/g, '/')
      const root = norm(REPO_ROOT)
      const chapters = fs.readdirSync(REPO_ROOT).filter((n) => n.endsWith('.md')).map((n) => `${root}/${n}`)
      server.watcher.add(chapters)
      server.watcher.on('change', (file) => {
        const f = norm(file)
        if (path.posix.dirname(f) === root && f.endsWith('.md')) {
          try {
            sync({ quiet: true, clean: false })
          } catch (e) {
            console.error((e as Error).message)
          }
        }
      })
    },
  }
}

// Якоря как на GitHub: «5.2. Гонки данных и `sync`» -> «52-гонки-данных-и-sync»,
// чтобы ссылки из исходных Markdown-файлов работали и на GitHub, и на сайте.
const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-')

export default withPwa(defineConfig({
    lang: 'ru-RU',
    title: 'Go и бэкенд для фронтендера',
    description: 'Учебник по Go и бэкенд-разработке для Angular-разработчика: теория, задачи с автотестами, SQL-лаба, Docker, продакшен.',
    base,
    srcDir: './content',
    cleanUrls: true,
    lastUpdated: false,

    head: [
      ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }],
      ['meta', { name: 'theme-color', content: '#00849e' }],
      ['link', { rel: 'apple-touch-icon', href: `${base}apple-touch-icon-180x180.png` }],
    ],

    // Офлайн и установка на экран телефона. Что кэшируется:
    //   precache  — оболочка сайта и ВСЕ страницы глав (текст читается без сети после первого визита);
    //   runtime   — тяжёлые «ленивые» чанки (диаграммы Mermaid, визуализаторы): кладутся в кэш при первом показе.
    pwa: {
      base,
      scope: base,
      // srcDir вынесен в content/, а плагин считает outDir от него — указываем настоящий каталог сборки VitePress
      outDir: path.join(SITE_DIR, '.vitepress', 'dist'),
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Go и бэкенд для фронтендера',
        short_name: 'Go для фронтендера',
        description: 'Учебник по Go и бэкенд-разработке для Angular-разработчика',
        lang: 'ru',
        theme_color: '#00849e',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{css,js,html,svg,png,ico,woff2,json}'],
        // В precache попадает всё, что нужно КНИГЕ офлайн: ядро Mermaid и 4 используемых типа диаграмм
        // (flowchart, sequence, ER, state). Не кэшируем то, что книга не запросит никогда:
        // редкие типы диаграмм (+ cytoscape, katex) и неиспользуемые шрифтовые поднаборы Inter.
        globIgnores: [
          'assets/chunks/{architecture,c4,gantt,xychart,block,venn,sankey,quadrant,requirement,gitGraph,wardley,journey,ishikawa,cynefin,pie,railroad,peg,ebnf,abnf,class,info}Diagram*',
          'assets/chunks/{swimlanes,cose-bilkent,cytoscape.esm,katex,cynefin-,kanban-definition,mindmap-definition,timeline-definition,treemap,radar,packet}*',
          'assets/inter-*-{greek,greek-ext,vietnamese,cyrillic-ext,latin-ext}.*',
        ],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.includes('/assets/chunks/'),
            handler: 'CacheFirst',
            options: { cacheName: 'lazy-chunks', expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 90 } },
          },
        ],
      },
    },

    markdown: {
      theme: { light: 'github-light', dark: 'github-dark' },
      anchor: { slugify },
      codeCopyButtonTitle: 'Скопировать',
      // ```mermaid -> <MermaidDiagram> (ленивая загрузка Mermaid, см. theme/components/MermaidDiagram.vue).
      // Исходник кодируется encodeURIComponent: в атрибуте нет ни кавычек, ни «{{».
      config(md) {
        const fence = md.renderer.rules.fence!
        md.renderer.rules.fence = (tokens, idx, options, env, self) => {
          const token = tokens[idx]
          if (token.info.trim() === 'mermaid') {
            return `<MermaidDiagram code="${encodeURIComponent(token.content)}" />\n`
          }
          return fence(tokens, idx, options, env, self)
        }
      },
    },

    vite: {
      plugins: [bookSync()],
    },

    themeConfig: {
      logo: '/logo.svg',
      siteTitle: 'Go для фронтендера',
      nav: [
        { text: 'Дорожная карта', link: '/' },
        { text: 'Мой прогресс', link: '/progress' },
        { text: 'Шпаргалка', link: '/cheatsheet' },
      ],
      sidebar: PARTS.map((part) => ({
        text: part.text,
        collapsed: false,
        items: part.items.map(([slug, text]) => ({ text, link: slug === 'index' ? '/' : `/${slug}` })),
      })),
      socialLinks: [{ icon: 'github', link: repo }],
      editLink: {
        // строка, а не функция: функции сериализуются в клиентский код и теряют замыкания
        pattern: `${repo}/edit/main/:path`,
        text: 'Предложить правку',
      },
      outline: { level: [2, 3], label: 'На этой странице' },
      docFooter: { prev: 'Назад', next: 'Далее' },
      returnToTopLabel: 'Наверх',
      sidebarMenuLabel: 'Меню',
      darkModeSwitchLabel: 'Тема',
      lightModeSwitchTitle: 'Светлая тема',
      darkModeSwitchTitle: 'Тёмная тема',
      langMenuLabel: 'Язык',

      search: {
        provider: 'local',
        options: {
          translations: {
            button: { buttonText: 'Поиск', buttonAriaLabel: 'Поиск' },
            modal: {
              displayDetails: 'Показать подробности',
              resetButtonTitle: 'Сбросить',
              backButtonTitle: 'Закрыть',
              noResultsText: 'Ничего не найдено по запросу',
              footer: {
                selectText: 'выбрать',
                navigateText: 'перейти',
                closeText: 'закрыть',
              },
            },
          },
          // processTerm применяется при построении индекса (здесь) и при запросе (см. theme/index.ts)
          miniSearch: {
            options: { processTerm: ruTerm },
            searchOptions: { fuzzy: 0.2, prefix: true },
          },
        },
      },
    },
}))
