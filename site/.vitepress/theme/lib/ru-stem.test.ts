import { describe, expect, it } from 'vitest'
import { ruTerm, stemRu } from './ru-stem'

describe('ruTerm', () => {
  it('склеивает формы одного слова', () => {
    const forms = ['горутина', 'горутины', 'горутину', 'горутинами', 'горутине']
    expect(new Set(forms.map(ruTerm)).size).toBe(1)
  })

  it('канал / каналы / каналов', () => {
    expect(new Set(['канал', 'каналы', 'каналов'].map(ruTerm)).size).toBe(1)
  })

  it('не трогает латиницу и короткие слова, приводит к нижнему регистру', () => {
    expect(ruTerm('Context')).toBe('context')
    expect(ruTerm('select')).toBe('select')
    expect(ruTerm('Go')).toBe('go')
    expect(stemRu('код')).toBe('код')
  })

  it('не отрезает основу короче трёх букв', () => {
    expect(stemRu('мыши').length).toBeGreaterThanOrEqual(3)
  })
})
