import { describe, expect, it } from 'vitest'
import { SCHEDULES, simulate } from './race-model'

describe('гонка данных', () => {
  it('«потерянное обновление»: две горутины, а счётчик = 1', () => {
    const { final, frames } = simulate(SCHEDULES.lost, false)
    expect(final).toBe(1)
    expect(frames).toHaveLength(6)
    expect(frames[1].regs).toEqual([0, 0]) // обе прочитали 0
  })

  it('«повезло»: расписание без пересечения даёт 2 — вот почему «у меня работает» ничего не доказывает', () => {
    expect(simulate(SCHEDULES.lucky, false).final).toBe(2)
  })

  it('с мьютексом результат 2 при ЛЮБОМ чередовании, а вторая горутина ждёт', () => {
    const { final, frames } = simulate(SCHEDULES.mutex, true)
    expect(final).toBe(2)
    expect(frames.some((f) => f.blocked)).toBe(true)
    // критическая секция не пересекается: между LOCK и UNLOCK одной горутины другая не делает LOAD/ADD/STORE
    let holder: number | null = null
    for (const f of frames) {
      if (f.blocked) continue
      if (f.op === 'LOCK') holder = f.g
      else if (f.op === 'UNLOCK') holder = null
      else expect(holder).toBe(f.g)
    }
  })

  it('перебор всех чередований из 6 шагов: без мьютекса бывает 1, с мьютексом всегда 2', () => {
    const results = new Set<number>()
    const gen = (n0: number, n1: number, cur: (0 | 1)[], out: (0 | 1)[][]) => {
      if (!n0 && !n1) return out.push(cur)
      if (n0) gen(n0 - 1, n1, [...cur, 0], out)
      if (n1) gen(n0, n1 - 1, [...cur, 1], out)
    }
    const plain: (0 | 1)[][] = []
    gen(3, 3, [], plain)
    plain.forEach((s) => results.add(simulate(s, false).final))
    expect([...results].sort()).toEqual([1, 2])

    const withLock: (0 | 1)[][] = []
    gen(8, 8, [], withLock) // с запасом шагов на ожидание
    // берём только расписания, где обе горутины ДОШЛИ до конца (иначе вторая могла просто не успеть выполнить инкремент)
    const done = withLock.map((s) => simulate(s, true)).filter((r) => r.completed)
    expect(done.length).toBeGreaterThan(1000)
    expect(new Set(done.map((r) => r.final))).toEqual(new Set([2]))
  })
})
