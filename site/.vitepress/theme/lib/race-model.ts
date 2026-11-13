// Модель гонки данных: две горутины делают counter++ как три «машинных» шага LOAD → ADD → STORE.
// Порядок шагов задаёт расписание (планировщик). С мьютексом добавляются LOCK/UNLOCK.

export type Op = 'LOCK' | 'LOAD' | 'ADD' | 'STORE' | 'UNLOCK'
export type G = 0 | 1

export interface Frame {
  g: G
  op: Op
  blocked: boolean // true — горутина попыталась взять занятый мьютекс и ждёт
  counter: number
  regs: [number | null, number | null]
  lockHolder: G | null
}

export const program = (withMutex: boolean): Op[] =>
  withMutex ? ['LOCK', 'LOAD', 'ADD', 'STORE', 'UNLOCK'] : ['LOAD', 'ADD', 'STORE']

/** Выполняет расписание; пропускает шаги завершившихся горутин. Возвращает только «значимые» кадры. */
export function simulate(schedule: G[], withMutex: boolean): { frames: Frame[]; final: number; completed: boolean } {
  const prog = program(withMutex)
  const pc: [number, number] = [0, 0]
  const regs: [number | null, number | null] = [null, null]
  let counter = 0
  let holder: G | null = null
  const frames: Frame[] = []

  for (const g of schedule) {
    if (pc[g] >= prog.length) continue
    const op = prog[pc[g]]
    let blocked = false
    switch (op) {
      case 'LOCK':
        if (holder === null) holder = g
        else blocked = true
        break
      case 'LOAD': regs[g] = counter; break
      case 'ADD': regs[g] = (regs[g] ?? 0) + 1; break
      case 'STORE': counter = regs[g] ?? counter; break
      case 'UNLOCK': holder = null; break
    }
    if (!blocked) pc[g]++
    frames.push({ g, op, blocked, counter, regs: [...regs] as [number | null, number | null], lockHolder: holder })
  }
  // completed — обе горутины дошли до конца своей программы (иначе итог нельзя сравнивать с «ожидаемым»)
  return { frames, final: counter, completed: pc[0] >= prog.length && pc[1] >= prog.length }
}

/** Готовые расписания для демонстрации. */
export const SCHEDULES = {
  /** G0 и G1 читают одно и то же значение, затем обе пишут — обновление потеряно. */
  lost: [0, 1, 0, 1, 0, 1] as G[],
  /** Горутины случайно не пересеклись — результат верный (поэтому гонку так трудно поймать). */
  lucky: [0, 0, 0, 1, 1, 1] as G[],
  /** Те же попытки чередоваться, но с мьютексом: вторая ждёт UNLOCK первой. */
  mutex: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1] as G[],
}
