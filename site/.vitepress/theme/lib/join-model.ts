// Данные учебной БД «магазин» (labs/sql/init/02_seed.sql) и вычисление JOIN для визуализатора JoinViz.

export interface User { id: number; name: string; country: string }
export interface Order { id: number; user_id: number; status: string }
export interface Row { user: User | null; order: Order | null }
export type JoinKind = 'inner' | 'left' | 'right' | 'full' | 'anti'

export const USERS: User[] = [
  { id: 1, name: 'Anna', country: 'RU' },
  { id: 2, name: 'Boris', country: 'RU' },
  { id: 3, name: 'Chen', country: 'CN' },
  { id: 4, name: 'Dana', country: 'DE' },
  { id: 5, name: 'Eve', country: 'DE' },
  { id: 6, name: 'Frank', country: 'US' },
]

export const ORDERS: Order[] = [
  { id: 1, user_id: 1, status: 'paid' },
  { id: 2, user_id: 1, status: 'shipped' },
  { id: 3, user_id: 2, status: 'new' },
  { id: 4, user_id: 3, status: 'paid' },
  { id: 5, user_id: 3, status: 'cancelled' },
  { id: 6, user_id: 4, status: 'shipped' },
  { id: 7, user_id: 1, status: 'paid' },
  { id: 8, user_id: 2, status: 'paid' },
]

export const SQL: Record<JoinKind, string> = {
  inner: 'SELECT u.name, o.id\nFROM users u\nJOIN orders o ON o.user_id = u.id',
  left: 'SELECT u.name, o.id\nFROM users u\nLEFT JOIN orders o ON o.user_id = u.id',
  right: 'SELECT u.name, o.id\nFROM users u\nRIGHT JOIN orders o ON o.user_id = u.id',
  full: 'SELECT u.name, o.id\nFROM users u\nFULL JOIN orders o ON o.user_id = u.id',
  anti: 'SELECT u.name\nFROM users u\nLEFT JOIN orders o ON o.user_id = u.id\nWHERE o.id IS NULL',
}

export const EXPLAIN: Record<JoinKind, string> = {
  inner: 'Только строки, у которых есть пара в обеих таблицах.',
  left: 'ВСЕ пользователи; у тех, кто ничего не заказывал, справа NULL.',
  right: 'ВСЕ заказы. Из-за внешнего ключа у каждого заказа есть пользователь — результат совпал с INNER.',
  full: 'Все строки обеих таблиц. Здесь совпадает с LEFT — «висячих» заказов в базе быть не может (FOREIGN KEY).',
  anti: '«Антиджойн»: LEFT JOIN + фильтр «пары нет». Так ищут «кто ни разу не…».',
}

export function join(kind: JoinKind): Row[] {
  const matched: Row[] = []
  for (const u of USERS) for (const o of ORDERS) if (o.user_id === u.id) matched.push({ user: u, order: o })
  matched.sort((a, b) => a.user!.id - b.user!.id || a.order!.id - b.order!.id)

  const lonelyUsers: Row[] = USERS.filter((u) => !ORDERS.some((o) => o.user_id === u.id)).map((user) => ({ user, order: null }))
  const lonelyOrders: Row[] = ORDERS.filter((o) => !USERS.some((u) => u.id === o.user_id)).map((order) => ({ user: null, order }))

  switch (kind) {
    case 'inner': return matched
    case 'left': return [...matched, ...lonelyUsers].sort((a, b) => a.user!.id - b.user!.id || (a.order?.id ?? 0) - (b.order?.id ?? 0))
    case 'right': return [...matched, ...lonelyOrders]
    case 'full': return [...matched, ...lonelyUsers, ...lonelyOrders].sort((a, b) => (a.user?.id ?? 99) - (b.user?.id ?? 99) || (a.order?.id ?? 0) - (b.order?.id ?? 0))
    case 'anti': return lonelyUsers
  }
}
