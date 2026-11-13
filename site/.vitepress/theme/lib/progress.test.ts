// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEY, enhanceChecklists, exportJson, load, parseImport, rememberLast, sectionOf, slugOf, stats, toggle } from './progress'

function page(): Document {
  document.body.innerHTML = `
    <div class="vp-doc">
      <h1>Глава</h1>
      <h2 id="a">Задачи<a class="header-anchor" href="#a">​</a></h2>
      <ol><li>первая</li><li>вторая</li><li>третья</li></ol>
      <h2>Самопроверка</h2>
      <ul><li>вопрос 1</li><li>вопрос 2</li></ul>
      <h2>Другое</h2><ul><li>не считать</li></ul>
    </div>`
  return document
}

beforeEach(() => localStorage.clear())

describe('распознавание разделов', () => {
  it('Задачи / Самопроверка / Финальная самопроверка', () => {
    expect(sectionOf('Задачи​')).toBe('tasks')
    expect(sectionOf(' Самопроверка ')).toBe('check')
    expect(sectionOf('Финальная самопроверка')).toBe('check')
    expect(sectionOf('Теория')).toBeNull()
  })
  it('slugOf', () => {
    expect(slugOf('/05-konkurentnost')).toBe('05-konkurentnost')
    expect(slugOf('/05-konkurentnost.html')).toBe('05-konkurentnost')
    expect(slugOf('/')).toBe('index')
  })
})

describe('чекбоксы в DOM', () => {
  it('ставит по чекбоксу на пункты только нужных разделов и показывает счётчик', () => {
    const doc = page()
    enhanceChecklists(doc, '05-x')
    expect(doc.querySelectorAll('.gb-check')).toHaveLength(5)
    expect(doc.querySelectorAll('.gb-summary')).toHaveLength(2)
    expect(doc.querySelector('.gb-summary .gb-text')!.textContent).toBe('Выполнено 0 из 3')
  })

  it('отметка сохраняется и восстанавливается при повторном открытии страницы', () => {
    let doc = page()
    enhanceChecklists(doc, '05-x')
    const first = doc.querySelector('.gb-check') as HTMLInputElement
    first.checked = true
    first.dispatchEvent(new Event('change'))
    expect(doc.querySelector('.gb-summary .gb-text')!.textContent).toBe('Выполнено 1 из 3')
    expect(load().items['05-x|tasks|0']).toBe(true)
    expect(load().totals['05-x|tasks']).toBe(3)

    doc = page() // «перезагрузка»: новый DOM, то же хранилище
    enhanceChecklists(doc, '05-x')
    expect((doc.querySelector('.gb-check') as HTMLInputElement).checked).toBe(true)
    expect(doc.querySelector('li')!.classList.contains('gb-done')).toBe(true)
  })

  it('повторный вызов не дублирует чекбоксы', () => {
    const doc = page()
    enhanceChecklists(doc, '05-x')
    enhanceChecklists(doc, '05-x')
    expect(doc.querySelectorAll('.gb-check')).toHaveLength(5)
  })

  it('строки таблиц тоже считаются пунктами', () => {
    document.body.innerHTML = `<div class="vp-doc"><h2>Задачи</h2><table><thead><tr><th>№</th></tr></thead><tbody><tr><td>1</td></tr><tr><td>2</td></tr></tbody></table></div>`
    enhanceChecklists(document, '07-x')
    expect(document.querySelectorAll('.gb-check')).toHaveLength(2)
  })
})

describe('хранилище, статистика и импорт', () => {
  it('toggle/stats', () => {
    let d = load()
    d = toggle(d, 'a|tasks|0', true)
    d = toggle(d, 'a|tasks|2', true)
    d = { ...d, totals: { 'a|tasks': 5 } }
    expect(stats(d, 'a', 'tasks')).toEqual({ done: 2, total: 5 })
    expect(stats(toggle(d, 'a|tasks|0', false), 'a', 'tasks').done).toBe(1)
  })

  it('экспорт → импорт возвращает те же данные', () => {
    const d = { items: { 'a|tasks|1': true as const }, totals: { 'a|tasks': 3 }, last: '/a' }
    const back = parseImport(exportJson(d))!
    expect(back.items).toEqual(d.items)
    expect(back.totals).toEqual(d.totals)
    expect(back.last).toBe('/a')
  })

  it('мусорный и вредоносный ввод отвергается или очищается', () => {
    expect(parseImport('не json')).toBeNull()
    expect(parseImport('{"items":1,"totals":{}}')).toBeNull()
    const cleaned = parseImport('{"items":{"ok|tasks|1":true,"../evil":true,"x|tasks|1":"yes"},"totals":{"ok|tasks":2,"bad":9,"n|tasks":-1}}')!
    expect(cleaned.items).toEqual({ 'ok|tasks|1': true })
    expect(cleaned.totals).toEqual({ 'ok|tasks': 2 })
  })

  it('«продолжить»: запоминает главу, но не главную и не страницу прогресса', () => {
    rememberLast('/05-konkurentnost')
    expect(load().last).toBe('/05-konkurentnost')
    rememberLast('/')
    rememberLast('/progress')
    expect(load().last).toBe('/05-konkurentnost')
    expect(localStorage.getItem(STORAGE_KEY)).toContain('05-konkurentnost')
  })
})
