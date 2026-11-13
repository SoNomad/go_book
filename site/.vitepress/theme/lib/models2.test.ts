import { describe, expect, it } from 'vitest'
import { compare, btreeHeight, indexPages, REAL, seqPages } from './index-model'
import { join, ORDERS, USERS } from './join-model'
import { Breaker, TokenBucket } from './limiters'
import { trace } from './middleware-model'

describe('JOIN на данных лабы (результаты сверены с PostgreSQL, глава 7)', () => {
  it('INNER: 8 строк — по строке на каждый заказ', () => expect(join('inner')).toHaveLength(ORDERS.length))
  it('LEFT: 10 строк, и у Eve и Frank заказа нет', () => {
    const rows = join('left')
    expect(rows).toHaveLength(10)
    expect(rows.filter((r) => r.order === null).map((r) => r.user!.name)).toEqual(['Eve', 'Frank'])
  })
  it('антиджойн: «пользователи без заказов» = Eve, Frank (задача 11)', () =>
    expect(join('anti').map((r) => r.user!.name)).toEqual(['Eve', 'Frank']))
  it('RIGHT и FULL совпадают с INNER/LEFT из-за внешнего ключа', () => {
    expect(join('right')).toHaveLength(8)
    expect(join('full')).toHaveLength(10)
  })
  it('в seed 6 пользователей и 8 заказов', () => {
    expect(USERS).toHaveLength(6)
    expect(ORDERS).toHaveLength(8)
  })
})

describe('стоимость поиска (калибровка по реальному EXPLAIN)', () => {
  it('на реальной таблице модель воспроизводит измеренное число страниц', () => {
    expect(seqPages(REAL.rows)).toBe(10_368)
    expect(indexPages(REAL.rows, REAL.matches)).toBe(103)
    expect(btreeHeight(REAL.rows)).toBe(3)
  })
  it('Seq Scan растёт линейно, индекс — почти не растёт', () => {
    const a = compare(1_000, 10)
    const b = compare(10_000_000, 10)
    expect(b.seq / a.seq).toBeGreaterThan(9000)
    expect(b.idx / a.idx).toBeLessThan(2)
  })
})

describe('token bucket и circuit breaker — вывод из главы 17', () => {
  it('всплеск 3, затем 1 запрос/с: true true true false false … через 2 с: true true false', () => {
    let t = 0
    const tb = new TokenBucket(3, 1, () => t)
    expect([0, 1, 2, 3, 4].map(() => tb.allow())).toEqual([true, true, true, false, false])
    t += 2000
    expect([0, 1, 2].map(() => tb.allow())).toEqual([true, true, false])
  })

  it('breaker: 3 сбоя → open, затем быстрые отказы, после кулдауна успешная проба → closed', () => {
    let t = 0
    const br = new Breaker(3, 10_000, () => t)
    const seen: string[] = []
    for (let i = 0; i < 5; i++) seen.push(`${br.do(() => false)}/${br.state}`)
    expect(seen).toEqual(['fail/closed', 'fail/closed', 'fail/open', 'rejected/open', 'rejected/open'])
    t += 11_000
    expect(br.do(() => true)).toBe('ok')
    expect(br.state).toBe('closed')
  })

  it('проваленная проба в half-open снова открывает цепь', () => {
    let t = 0
    const br = new Breaker(1, 5000, () => t)
    br.do(() => false)
    t += 6000
    expect(br.do(() => false)).toBe('fail')
    expect(br.state).toBe('open')
  })
})

describe('порядок middleware', () => {
  it('Recover ВНУТРИ Logging: паника превращается в 500 и попадает в лог', () => {
    const r = trace(['RequestID', 'Logging', 'Recover', 'CORS'], 'panic')
    expect(r.status).toBe(500)
    expect(r.logged).toBe('status=500')
  })
  it('Recover СНАРУЖИ Logging: клиент получит 500, но в логе ПУСТО', () => {
    const r = trace(['Recover', 'Logging', 'CORS'], 'panic')
    expect(r.status).toBe(500)
    expect(r.logged).toBeNull()
  })
  it('без Recover паника обрывает соединение', () => {
    expect(trace(['Logging', 'CORS'], 'panic').status).toBe(0)
  })
  it('Auth возвращает 401 и не вызывает handler', () => {
    const r = trace(['Logging', 'Auth'], 'unauthorized')
    expect(r.status).toBe(401)
    expect(r.lines.some((l) => l.startsWith('handler:'))).toBe(false) // handler не вызывался
    expect(r.logged).toBe('status=401')
  })
})
