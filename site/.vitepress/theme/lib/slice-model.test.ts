import { describe, expect, it } from 'vitest'
import { append, growCap, initialWorld, reslice, setAt, viewers } from './slice-model'

describe('growCap — совпадает с реальным выводом Go', () => {
  // Получено запуском настоящей Go-программы: make([]int, c, c); append(x, 0); cap(x)
  const real: [number, number][] = [
    [1, 2], [2, 4], [3, 6], [4, 8], [5, 10], [6, 12], [7, 14], [9, 18],
    [100, 224], [255, 512], [256, 512], [300, 608], [512, 848], [1000, 1536],
  ]
  it.each(real)('cap %i → %i', (from, to) => {
    expect(growCap(from, from + 1)).toBe(to)
  })

  it('последовательность роста от 4 (как в реальном Go): 4 8 16 … 512 848 1280 1792 2560 3408 5120', () => {
    const seq = [4]
    for (let len = 5; len <= 5000; len++) {
      const last = seq[seq.length - 1]
      if (len > last) seq.push(growCap(last, len))
    }
    expect(seq).toEqual([4, 8, 16, 32, 64, 128, 256, 512, 848, 1280, 1792, 2560, 3408, 5120])
  })
})

describe('ловушка из главы 2', () => {
  it('append в подслайс затирает общий массив, а после реаллокации — нет', () => {
    let w = initialWorld() // a := []int{1, 2, 3}
    w = reslice(w, 'b', 'a', 0, 2).world // b := a[:2] (len 2, cap 3)
    expect(w.slices.find((s) => s.name === 'b')).toMatchObject({ len: 2, cap: 3 })

    const r1 = append(w, 'b', 99)
    w = r1.world
    expect(w.arrays[0].cells).toEqual([1, 2, 99]) // a[2] затёрт
    expect(r1.message).toContain('видят')
    expect(viewers(w, 1, 2)).toEqual(['a', 'b'])

    const r2 = append(w, 'b', 100)
    w = r2.world
    const b = w.slices.find((s) => s.name === 'b')!
    expect(b).toMatchObject({ len: 4, cap: 6, off: 0 })
    expect(b.arr).not.toBe(1)
    expect(r2.message).toContain('НОВЫЙ')

    w = setAt(w, 'b', 0, -1).world
    expect(w.arrays[0].cells).toEqual([1, 2, 99]) // старый массив не тронут
  })

  it('append к a при len == cap выделяет массив cap 6', () => {
    const w = append(initialWorld(), 'a', 4).world
    expect(w.slices[0]).toMatchObject({ len: 4, cap: 6 })
  })

  it('reslice не принимает границы за пределами cap', () => {
    const w = initialWorld()
    expect(reslice(w, 'b', 'a', 0, 4).message).toContain('Недопустимые')
    expect(reslice(w, 'b', 'a', 1, 3).world.slices.find((s) => s.name === 'b')).toMatchObject({ off: 1, len: 2, cap: 2 })
  })
})
