// Token bucket и circuit breaker — порт Go-кода из главы 17 (там же проверенный вывод) на управляемое время.
// Время — функция now() в миллисекундах: «перематываем» часы без ожидания.

export type Clock = () => number

export class TokenBucket {
  tokens: number
  private last: number
  constructor(public capacity: number, public ratePerSec: number, private now: Clock) {
    this.tokens = capacity
    this.last = now()
  }
  /** Долить накопленное за прошедшее время (без списания). */
  refill() {
    const t = this.now()
    this.tokens = Math.min(this.capacity, this.tokens + ((t - this.last) / 1000) * this.ratePerSec)
    this.last = t
  }
  allow(): boolean {
    this.refill()
    if (this.tokens >= 1) {
      this.tokens--
      return true
    }
    return false
  }
}

export type State = 'closed' | 'open' | 'half-open'
export type CallResult = 'ok' | 'fail' | 'rejected'

export class Breaker {
  state: State = 'closed'
  failures = 0
  openedAt = 0
  constructor(public threshold: number, public cooldownMs: number, private now: Clock) {}

  /** Вызывает fn (true — успех). Возвращает, чем закончился вызов. */
  do(fn: () => boolean): CallResult {
    if (this.state === 'open') {
      if (this.now() - this.openedAt < this.cooldownMs) return 'rejected'
      this.state = 'half-open' // кулдаун прошёл: пропускаем ОДИН пробный вызов
    } else if (this.state === 'half-open') {
      return 'rejected'
    }
    const ok = fn()
    if (ok) {
      this.failures = 0
      this.state = 'closed'
      return 'ok'
    }
    this.failures++
    if (this.state === 'half-open' || this.failures >= this.threshold) {
      this.state = 'open'
      this.openedAt = this.now()
    }
    return 'fail'
  }
}
