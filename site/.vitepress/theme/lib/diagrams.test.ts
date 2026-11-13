// @vitest-environment jsdom
// Проверяет синтаксис ВСЕХ ```mermaid-диаграмм в корневых главах — быстро, без браузера.
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mermaid from 'mermaid'
import { describe, expect, it } from 'vitest'
import { prepareDiagram } from './mermaid-source'

// (в jsdom глобальный URL подменён, поэтому fileURLToPath получает строку, а не объект URL)
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')

type Block = { file: string; line: number; code: string }

function extractMermaid(file: string): Block[] {
  const lines = readFileSync(path.join(REPO_ROOT, file), 'utf8').split(/\r?\n/)
  const blocks: Block[] = []
  let open: { start: number; marker: string; lang: string; buf: string[] } | null = null
  lines.forEach((line, i) => {
    if (!open) {
      const m = line.match(/^\s*(`{3,}|~{3,})\s*(\S*)/)
      if (m) open = { start: i + 1, marker: m[1], lang: m[2], buf: [] }
    } else if (/^\s*(`{3,}|~{3,})\s*$/.test(line) && line.trim()[0] === open.marker[0]) {
      if (open.lang === 'mermaid') blocks.push({ file, line: open.start, code: open.buf.join('\n') })
      open = null
    } else open.buf.push(line)
  })
  return blocks
}

const files = readdirSync(REPO_ROOT).filter((n) => n.endsWith('.md')).sort()
const blocks = files.flatMap(extractMermaid)

describe('mermaid-диаграммы книги', () => {
  it(`все ${blocks.length} диаграмм синтаксически корректны`, async () => {
    const failures: string[] = []
    for (const b of blocks) {
      try {
        await mermaid.parse(prepareDiagram(b.code))
      } catch (e) {
        failures.push(`${b.file}:${b.line} — ${String((e as Error).message ?? e).split('\n').slice(0, 3).join(' | ')}`)
      }
    }
    expect(failures, `\n${failures.join('\n')}\n`).toEqual([])
  })

  it('контроль: проверка действительно ловит сломанный синтаксис', async () => {
    await expect(mermaid.parse(prepareDiagram('flowchart LR\n  A[Скобка( --> B'))).rejects.toThrow()
    await expect(mermaid.parse(prepareDiagram('sequenceDiagram\n  A->>'))).rejects.toThrow()
  })

  it('в каждой диаграмме нет «голых» HTML-тегов кроме <br/>', () => {
    const bad = blocks.filter((b) => /<(?!br\s*\/?>)[a-z]/i.test(b.code)).map((b) => `${b.file}:${b.line}`)
    expect(bad).toEqual([])
  })
})
