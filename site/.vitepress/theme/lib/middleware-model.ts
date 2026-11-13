// Порядок middleware меняет поведение. Модель цепочки func(http.Handler) http.Handler:
// первый в списке — САМЫЙ ВНЕШНИЙ. «Код после next» не выполняется, если handler паникует
// (мы моделируем простую реализацию без defer — как в учебном Logging из главы 6).

export type Mw = 'RequestID' | 'Logging' | 'Recover' | 'CORS' | 'Auth'
export type Scenario = 'ok' | 'panic' | 'unauthorized'

export interface Trace {
  lines: string[]
  status: number // 0 — клиент не получил ответа (панику никто не поймал)
  logged: string | null // что записал Logging (null — не записал ничего)
}

class Panic extends Error {}

export function trace(order: Mw[], scenario: Scenario): Trace {
  const lines: string[] = []
  let status = 200
  let logged: string | null = null

  const run = (i: number): void => {
    if (i === order.length) {
      if (scenario === 'panic') {
        lines.push('handler: паника!')
        throw new Panic()
      }
      lines.push('handler: отвечает 200')
      return
    }
    const mw = order[i]
    lines.push(`→ ${mw}: до handler`)
    switch (mw) {
      case 'Auth':
        if (scenario === 'unauthorized') {
          status = 401
          lines.push('Auth: нет сессии → 401, дальше не идём')
          return
        }
        run(i + 1)
        lines.push('← Auth: после')
        return
      case 'Recover':
        try {
          run(i + 1)
        } catch (e) {
          if (!(e instanceof Panic)) throw e
          status = 500
          lines.push('Recover: поймал панику → отвечает 500')
        }
        lines.push('← Recover: после')
        return
      case 'Logging':
        run(i + 1) // если дальше паника — этот код ниже НЕ выполнится
        logged = `status=${status}`
        lines.push(`← Logging: после — пишет в лог (${logged})`)
        return
      default:
        run(i + 1)
        lines.push(`← ${mw}: после`)
    }
  }

  try {
    run(0)
  } catch (e) {
    if (!(e instanceof Panic)) throw e
    status = 0
    lines.push('⚠ паника дошла до net/http: соединение оборвано, клиент не получил ответа')
  }
  return { lines, status, logged }
}
