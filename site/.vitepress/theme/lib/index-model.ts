// Стоимость поиска: Seq Scan против индекса B-tree. Модель откалибрована по РЕАЛЬНОМУ EXPLAIN (глава 7):
// таблица events на 1 000 000 строк, WHERE user_id = 4242 -> 100 строк.

/** Реальный замер из главы 7 (PostgreSQL, 1 000 000 строк, 100 совпадений). */
export const REAL = {
  rows: 1_000_000,
  matches: 100,
  seqMs: 123.046, // Seq Scan: Buffers hit=2304 read=8064
  idxMs: 2.906, //   Bitmap Heap Scan: Buffers hit=26 read=77
  seqPages: 2304 + 8064, // 10 368 страниц по 8 КиБ
  idxPages: 26 + 77, //   103 страницы
}

/** Сколько строк помещается на странице 8 КиБ — выведено из того же замера. */
export const ROWS_PER_PAGE = REAL.rows / REAL.seqPages

/** Seq Scan читает ВСЕ страницы таблицы. */
export const seqPages = (rows: number) => Math.ceil(rows / ROWS_PER_PAGE)

/** Высота B-tree: каждая страница индекса вмещает ~300 ключей (ветвление). */
export const btreeHeight = (rows: number, fanout = 300) => Math.max(1, Math.ceil(Math.log(rows) / Math.log(fanout)))

/** Индекс: спуск по дереву + по странице на каждое совпадение (худший случай — все в разных страницах). */
export const indexPages = (rows: number, matches: number) => btreeHeight(rows) + matches

export function compare(rows: number, matches: number) {
  const seq = seqPages(rows)
  const idx = indexPages(rows, matches)
  return { seq, idx, height: btreeHeight(rows), ratio: seq / idx }
}
