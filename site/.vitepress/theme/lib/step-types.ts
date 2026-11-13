export interface Step {
  /** индекс актёра-отправителя */
  from: number
  /** индекс актёра-получателя (from === to — действие «внутри» актёра) */
  to: number
  text: string
  detail?: string
  risk?: string
  /** значения, которые показываются «чипами» под шагом (например, stock = 5) */
  state?: Record<string, string | number>
  note?: 'ok' | 'bad'
}
