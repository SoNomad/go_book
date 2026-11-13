// Собирает site/content/ из корневых *.md учебника.
//
// Корневые Markdown-файлы остаются ЕДИНСТВЕННЫМ источником правды. Скрипт:
//   1. проверяет исходные ссылки (на файлы репозитория) — битая ссылка = ошибка;
//   2. ловит то, что сломает Vue-компилятор VitePress: «голые» {{ }} и HTML-теги в прозе;
//   3. README.md -> index.md (главная с hero), остальным добавляет frontmatter;
//   4. переписывает ссылки на tasks/, solutions/, labs/ -> GitHub (там лежит код);
//   5. превращает маркер <!-- viz:Имя --> в компонент <Имя />.
//
// Запуск вручную: node scripts/sync-content.mjs      (в сборке вызывается из config.mts)

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const SITE_DIR = path.resolve(here, '..')
export const REPO_ROOT = path.resolve(SITE_DIR, '..')
const OUT_DIR = path.join(SITE_DIR, 'content')

export function repoUrl() {
  if (process.env.REPO_URL) return process.env.REPO_URL.replace(/\/$/, '')
  if (process.env.GITHUB_REPOSITORY) return `https://github.com/${process.env.GITHUB_REPOSITORY}`
  return 'https://github.com/OWNER/REPO' // подставьте свой после создания репозитория (или задайте REPO_URL)
}

// HTML-теги, которые допустимы в прозе (остальное считаем ошибкой: Vue попытается их скомпилировать)
const ALLOWED_TAGS = new Set(['details', 'summary', 'br', 'kbd', 'sup', 'sub'])

/** Делит текст на сегменты: ограждённые блоки кода и «проза». */
function splitSegments(text) {
  const lines = text.split(/\r?\n/)
  const segs = []
  let cur = { fence: false, lines: [], start: 1 }
  let marker = null
  const push = () => {
    if (cur.lines.length) segs.push(cur)
  }
  lines.forEach((line, i) => {
    const open = line.match(/^\s*(`{3,}|~{3,})/)
    if (!marker) {
      if (open) {
        push()
        cur = { fence: true, lines: [line], start: i + 1 }
        marker = open[1]
      } else cur.lines.push(line)
    } else {
      cur.lines.push(line)
      const close = line.match(/^\s*(`{3,}|~{3,})\s*$/)
      if (close && close[1][0] === marker[0] && close[1].length >= marker.length) {
        segs.push(cur)
        cur = { fence: false, lines: [], start: i + 2 }
        marker = null
      }
    }
  })
  push()
  return segs
}

const maskInlineCode = (line) => line.replace(/`[^`]*`/g, (m) => ' '.repeat(m.length))

function normalizeLink(href, ctx) {
  if (/^(https?:|mailto:|tel:|#)/i.test(href)) return href
  const [rawPath, hash] = href.split('#')
  const p = decodeURIComponent(rawPath).replace(/^\.\//, '')
  const suffix = hash ? `#${hash}` : ''

  if (!fs.existsSync(path.join(REPO_ROOT, p))) {
    ctx.errors.push(`${ctx.file}:${ctx.line}: ссылка на несуществующий файл «${href}»`)
    return href
  }
  if (p === 'README.md') return `index.md${suffix}`
  if (p.endsWith('.md') && !p.includes('/')) return href // другая глава — VitePress разрешит сам

  // всё остальное (код, лабы, решения) живёт в репозитории на GitHub
  const isDir = p.endsWith('/') || !path.extname(p)
  ctx.rewritten++
  return `${repoUrl()}/${isDir ? 'tree' : 'blob'}/main/${p.replace(/\/$/, '')}${suffix}`
}

function processProse(lines, startLine, ctx) {
  return lines.map((line, i) => {
    ctx.line = startLine + i

    // маркер интерактивного компонента
    const viz = line.match(/^\s*<!--\s*viz:([A-Za-z][\w]*)(\s+[^>]*?)?\s*-->\s*$/)
    if (viz) {
      ctx.viz++
      return `\n<${viz[1]}${viz[2] ? ' ' + viz[2].trim() : ''} />\n`
    }

    // линт: то, что ломает Vue-компилятор
    const masked = maskInlineCode(line)
    if (/\{\{|\}\}/.test(masked)) {
      ctx.errors.push(`${ctx.file}:${ctx.line}: «{{ }}» вне блока кода — Vue воспримет как интерполяцию. Оберните в обратные кавычки блока кода или уберите.`)
    }
    for (const m of masked.matchAll(/<\/?([A-Za-z][\w-]*)(\s[^>]*)?\/?>/g)) {
      if (!ALLOWED_TAGS.has(m[1].toLowerCase())) {
        ctx.errors.push(`${ctx.file}:${ctx.line}: «${m[0]}» в прозе похоже на HTML-тег — Vue попытается его скомпилировать. Оберните в обратные кавычки.`)
      }
    }

    // Vue не защищает ИНЛАЙН-код (только блоки): `{{...}}` внутри обратных кавычек
    // обернём в <span v-pre> — исходник на GitHub остаётся обычным кодом.
    const safe = line.replace(/`[^`]*`/g, (m) => (/\{\{|\}\}/.test(m) ? `<span v-pre>${m}</span>` : m))

    // ссылки
    return safe.replace(/\]\(([^)\s]+)((?:\s+"[^"]*")?)\)/g, (_all, href, title) => `](${normalizeLink(href, ctx)}${title})`)
  })
}

function processFile(name, ctx) {
  ctx.file = name
  const text = fs.readFileSync(path.join(REPO_ROOT, name), 'utf8')
  const body = splitSegments(text)
    .map((seg) => (seg.fence ? seg.lines.join('\n') : processProse(seg.lines, seg.start, ctx).join('\n')))
    .join('\n')
  return body
}

const HOME_FRONTMATTER = `---
layout: home
title: Go и бэкенд для фронтендера
titleTemplate: false
hero:
  name: Go и бэкенд
  text: для фронтендера на Angular
  tagline: От «hello world» до задеплоенного сервиса с базой данных, кэшем, очередями, тестами и мониторингом.
  actions:
    - theme: brand
      text: Начать с главы 0
      link: /00-podgotovka
    - theme: alt
      text: Дорожная карта
      link: '#дорожная-карта'
features:
  - icon: 🔁
    title: Переводим с Angular
    details: Каждая тема привязана к знакомому — интерцепторы ↔ middleware, RxJS ↔ каналы, DI ↔ конструкторы.
  - icon: 🧪
    title: Задачи с автотестами
    details: 18 задач в стиле «красный → зелёный» и эталонные решения. Теория без практики — иллюзия понимания.
  - icon: 🗄️
    title: SQL с нуля
    details: Учебная база «магазин», 26 задач с проверенными ответами, транзакции, индексы, EXPLAIN.
  - icon: 🚀
    title: До продакшена
    details: Docker, авторизация, кэш, очереди, метрики, CI/CD, HTTPS-деплой и проектирование систем.
  - icon: ✅
    title: Проверено запуском
    details: Примеры компилируются, вывод сверен с реальным, SQL выполнен на настоящем движке PostgreSQL.
  - icon: 🏁
    title: Итоговый проект
    details: «Tasker» — трекер задач с Go-бэкендом и вашим Angular-фронтендом, на сервере с HTTPS.
---
`

/** Пишет файл только если содержимое изменилось (не дёргаем HMR зря). */
function writeIfChanged(file, content) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return
  fs.writeFileSync(file, content)
}

/** clean=true — пересоздать каталог (сборка); false — обновить на месте (watch в dev). */
export function sync({ quiet = false, clean = true } = {}) {
  const ctx = { errors: [], rewritten: 0, viz: 0, file: '', line: 0 }

  if (clean) fs.rmSync(OUT_DIR, { recursive: true, force: true })
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const files = fs.readdirSync(REPO_ROOT).filter((n) => n.endsWith('.md')).sort()
  for (const name of files) {
    let body = processFile(name, ctx)
    let out
    if (name === 'README.md') {
      body = body.replace(/^# .*\r?\n/, '') // заголовок заменяет hero
      out = HOME_FRONTMATTER + '\n' + body
      writeIfChanged(path.join(OUT_DIR, 'index.md'), out)
    } else {
      out = `---\noutline: [2, 3]\n---\n\n${body}`
      writeIfChanged(path.join(OUT_DIR, name), out)
    }
  }

  // служебные страницы сайта (не главы книги): site/extra/*.md копируются как есть (в них допустимы Vue-компоненты)
  const extra = path.join(SITE_DIR, 'extra')
  if (fs.existsSync(extra)) {
    for (const n of fs.readdirSync(extra).filter((f) => f.endsWith('.md'))) {
      writeIfChanged(path.join(OUT_DIR, n), fs.readFileSync(path.join(extra, n), 'utf8'))
    }
  }

  const pub = path.join(SITE_DIR, 'public')
  if (fs.existsSync(pub)) fs.cpSync(pub, path.join(OUT_DIR, 'public'), { recursive: true })

  if (ctx.errors.length) {
    throw new Error(`[sync] найдено проблем: ${ctx.errors.length}\n  - ${ctx.errors.join('\n  - ')}`)
  }
  if (!quiet) {
    const warn = repoUrl().includes('OWNER/REPO') ? ' (ВНИМАНИЕ: задайте REPO_URL — ссылки на код ведут на заглушку)' : ''
    console.log(`[sync] ${files.length} файлов, ссылок на GitHub: ${ctx.rewritten}, компонентов: ${ctx.viz}${warn}`)
  }
  return { files: files.length, rewritten: ctx.rewritten, viz: ctx.viz }
}

// запуск как скрипта: node scripts/sync-content.mjs
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    sync()
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
}
