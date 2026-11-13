// Прогресс чтения: чекбоксы в разделах «Задачи» и «Самопроверка», хранение в localStorage.
// ВАЖНО: localStorage — отдельное на каждом устройстве/браузере. Перенос между устройствами — экспорт/импорт JSON.

export type Section = 'tasks' | 'check'

export interface ProgressData {
  /** отмеченные пункты: ключ `глава|раздел|номер` */
  items: Record<string, true>
  /** сколько пунктов в разделе (запоминается при первом открытии главы): ключ `глава|раздел` */
  totals: Record<string, number>
  /** последняя открытая глава (путь без base) */
  last?: string
  updated?: number
}

export const STORAGE_KEY = 'gobook:progress:v1'
const empty = (): ProgressData => ({ items: {}, totals: {} })

export function safeStorage(): Storage | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined
  } catch {
    return undefined // приватный режим / запрет — страница работает без сохранения
  }
}

export function load(storage: Storage | undefined = safeStorage()): ProgressData {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    return raw ? (parseImport(raw) ?? empty()) : empty()
  } catch {
    return empty()
  }
}

export function save(data: ProgressData, storage: Storage | undefined = safeStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify({ ...data, updated: Date.now() }))
  } catch {
    /* переполнение или запрет — не роняем страницу */
  }
}

/** Разбор и ПРОВЕРКА JSON (из localStorage или из импортированного файла). null — если формат неверный. */
export function parseImport(text: string): ProgressData | null {
  try {
    const v = JSON.parse(text)
    if (!v || typeof v !== 'object' || typeof v.items !== 'object' || typeof v.totals !== 'object') return null
    const items: Record<string, true> = {}
    for (const [k, val] of Object.entries(v.items as Record<string, unknown>)) {
      if (val === true && /^[\w-]+\|(tasks|check)\|\d+$/.test(k)) items[k] = true
    }
    const totals: Record<string, number> = {}
    for (const [k, val] of Object.entries(v.totals as Record<string, unknown>)) {
      if (typeof val === 'number' && Number.isFinite(val) && val >= 0 && /^[\w-]+\|(tasks|check)$/.test(k)) totals[k] = val
    }
    return { items, totals, last: typeof v.last === 'string' ? v.last : undefined, updated: typeof v.updated === 'number' ? v.updated : undefined }
  } catch {
    return null
  }
}

export const exportJson = (d: ProgressData) => JSON.stringify({ ...d, updated: Date.now() }, null, 2)

export function toggle(data: ProgressData, key: string, checked: boolean): ProgressData {
  const items = { ...data.items }
  if (checked) items[key] = true
  else delete items[key]
  return { ...data, items }
}

export function stats(data: ProgressData, slug: string, section: Section) {
  const prefix = `${slug}|${section}|`
  const done = Object.keys(data.items).filter((k) => k.startsWith(prefix)).length
  return { done, total: data.totals[`${slug}|${section}`] ?? 0 }
}

/** «Задачи» -> tasks; «Самопроверка» / «Финальная самопроверка» -> check; остальное — null. */
export function sectionOf(headingText: string): Section | null {
  const t = headingText.replace(/[​#]/g, '').trim().toLowerCase()
  if (t === 'задачи') return 'tasks'
  if (t === 'самопроверка' || t === 'финальная самопроверка') return 'check'
  return null
}

export function slugOf(path: string): string {
  const s = path.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '')
  return s || 'index'
}

/** Вставляет чекбоксы в пункты разделов «Задачи»/«Самопроверка» текущей страницы (идемпотентно). */
export function enhanceChecklists(doc: Document, slug: string, storage: Storage | undefined = safeStorage()): void {
  const root = doc.querySelector('.vp-doc')
  if (!root) return
  let data = load(storage)
  let totalsChanged = false

  for (const h of Array.from(root.querySelectorAll('h2'))) {
    const section = sectionOf(h.textContent ?? '')
    if (!section || (h as HTMLElement).dataset.gbDone) continue
    ;(h as HTMLElement).dataset.gbDone = '1'

    // пункты: элементы списков и строки таблиц до следующего h2
    const rows: HTMLElement[] = []
    for (let el = h.nextElementSibling; el && el.tagName !== 'H2'; el = el.nextElementSibling) {
      if (el.tagName === 'OL' || el.tagName === 'UL') {
        rows.push(...(Array.from(el.children).filter((c) => c.tagName === 'LI') as HTMLElement[]))
      } else if (el.tagName === 'TABLE') {
        rows.push(...(Array.from(el.querySelectorAll('tbody tr')) as HTMLElement[]))
      }
    }
    if (!rows.length) continue

    const totalKey = `${slug}|${section}`
    if (data.totals[totalKey] !== rows.length) {
      data = { ...data, totals: { ...data.totals, [totalKey]: rows.length } }
      totalsChanged = true
    }

    const summary = doc.createElement('div')
    summary.className = 'gb-summary'
    summary.innerHTML = '<span class="gb-text"></span><span class="gb-bar"><i></i></span>'
    h.after(summary)

    const refresh = () => {
      const { done } = stats(data, slug, section)
      summary.querySelector('.gb-text')!.textContent = `Выполнено ${done} из ${rows.length}`
      ;(summary.querySelector('.gb-bar i') as HTMLElement).style.width = `${(done / rows.length) * 100}%`
      summary.classList.toggle('gb-complete', done === rows.length)
    }

    rows.forEach((row, i) => {
      const key = `${slug}|${section}|${i}`
      const box = doc.createElement('input')
      box.type = 'checkbox'
      box.className = 'gb-check'
      box.setAttribute('aria-label', 'Отметить выполненным')
      box.checked = !!data.items[key]
      row.classList.toggle('gb-done', box.checked)
      box.addEventListener('change', () => {
        data = toggle(load(storage), key, box.checked) // перечитываем: могла измениться другая вкладка
        data = { ...data, totals: { ...data.totals, [totalKey]: rows.length } }
        save(data, storage)
        row.classList.toggle('gb-done', box.checked)
        refresh()
      })
      const host = row.tagName === 'TR' ? (row.querySelector('td, th') as HTMLElement) : row
      host.prepend(box)
    })
    refresh()
  }
  if (totalsChanged) save(data, storage)
}

/** Запоминает последнюю открытую главу (для «Продолжить»). */
export function rememberLast(path: string, storage: Storage | undefined = safeStorage()): void {
  const slug = slugOf(path)
  if (slug === 'index' || slug === 'progress') return
  save({ ...load(storage), last: path }, storage)
}
