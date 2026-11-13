# Глава 8. Go и базы данных: `pgx`, транзакции, миграции, `sqlc`

**Цели главы:** подключить Go-сервис к PostgreSQL; написать слой доступа к данным (репозиторий) с правильной обработкой ошибок, контекстов и транзакций; защититься от SQL-инъекций; управлять схемой миграциями.

⏱ ~1,5 недели · предыдущая: [Глава 7](07-sql-postgres.md) · следующая: [Глава 9](09-docker.md)

---

## 8.1. Выбор инструментов

В Go есть три уровня работы с БД:

| Уровень | Инструменты | Идея |
|---|---|---|
| **Стандартный** | `database/sql` + драйвер | единый интерфейс для всех СУБД; много ручного кода сканирования |
| **Драйвер напрямую** | **`pgx`** (`pgxpool`) | быстрее, больше возможностей PostgreSQL (типы, `COPY`, `LISTEN/NOTIFY`, пакетные запросы) |
| **Надстройки** | `sqlx`, `squirrel` (билдер), **`sqlc`** (кодогенерация), ORM: `GORM`, `ent`, `bun` | меньше шаблонного кода — ценой «магии» |

**Рекомендация этого учебника:**

1. Освойте **`pgx` + чистый SQL** — вы будете понимать каждый запрос.
2. Для роста — **`sqlc`**: вы пишете SQL, он генерирует типобезопасный Go-код. Нет рантайм-магии, ошибки в запросах ловятся при генерации.
3. ORM (GORM и т. п.) осознанно: они скрывают реальные запросы, провоцируют N+1 (ленивая загрузка), а сложные отчёты всё равно выливаются в «сырой SQL». Зато быстро для CRUD-админок.

> 🔁 **Аналогия с фронтендом:** `database/sql`/`pgx` — это `fetch`; `sqlc` — генерация типизированного клиента из OpenAPI; ORM — как «магический» state-менеджер, который сам решает, когда ходить на сервер.

## 8.2. Подключение и пул соединений

```mermaid
flowchart LR
  subgraph APP["приложение: один pgxpool.Pool на процесс"]
    H1["обработчик 1"]:::service
    H2["обработчик 2"]:::service
    H3["обработчик 3"]:::service
    POOL["пул: MaxConns = 10"]:::data
  end
  DB[("PostgreSQL<br/>max_connections = 100")]:::data
  H1 --> POOL
  H2 --> POOL
  H3 --> POOL
  POOL -- "до 10 соединений" --> DB
```

`sql.DB` и `pgxpool.Pool` — **не одно соединение, а пул**. Создаётся **один раз** на приложение, безопасен для использования из многих горутин, закрывается при завершении.

```bash
mkdir todo && cd todo
go mod init example.com/todo
go get github.com/jackc/pgx/v5
```

DSN (строка подключения) берём из переменной окружения (12-factor, глава 11):

```bash
export DATABASE_URL="postgres://study:study@localhost:5432/todo?sslmode=disable"
```

(Базу `todo` создайте на контейнере из главы 7: `docker compose exec db psql -U study -d shop -c "CREATE DATABASE todo"`.)

### Схема: миграция

```sql
-- migrations/0001_init.sql
-- +goose Up
CREATE TABLE users (
    id         bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email      text        NOT NULL UNIQUE,
    name       text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE todos (
    id         bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    bigint      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title      text        NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
    done       boolean     NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_todos_user_id ON todos (user_id, id);

-- +goose Down
DROP TABLE todos;
DROP TABLE users;
```

## 8.3. Репозиторий на `pgx`

Идиома: структура-репозиторий принимает **`DBTX`** — интерфейс, которому удовлетворяют **и пул, и транзакция**. Благодаря этому один и тот же код работает и сам по себе, и внутри транзакции (так устроен и код, генерируемый `sqlc`).

```go
package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Доменные ошибки: верхние слои не должны знать про pgx.
var (
	ErrNotFound = errors.New("not found")
	ErrConflict = errors.New("conflict")
)

type Todo struct {
	ID        int64     `db:"id"        json:"id"`
	UserID    int64     `db:"user_id"   json:"user_id"`
	Title     string    `db:"title"     json:"title"`
	Done      bool      `db:"done"      json:"done"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

// DBTX удовлетворяют и *pgxpool.Pool, и pgx.Tx.
type DBTX interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

type TodoRepo struct{ db DBTX }

func NewTodoRepo(db DBTX) *TodoRepo { return &TodoRepo{db: db} }

const todoCols = `id, user_id, title, done, created_at`

func (r *TodoRepo) Create(ctx context.Context, userID int64, title string) (Todo, error) {
	rows, err := r.db.Query(ctx,
		`INSERT INTO todos (user_id, title) VALUES ($1, $2) RETURNING `+todoCols, userID, title)
	if err != nil {
		return Todo{}, mapErr("create todo", err)
	}
	t, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[Todo])
	if err != nil {
		return Todo{}, mapErr("create todo", err)
	}
	return t, nil
}

func (r *TodoRepo) Get(ctx context.Context, id int64) (Todo, error) {
	rows, err := r.db.Query(ctx, `SELECT `+todoCols+` FROM todos WHERE id = $1`, id)
	if err != nil {
		return Todo{}, mapErr("get todo", err)
	}
	t, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[Todo])
	if err != nil {
		return Todo{}, mapErr("get todo", err) // pgx.ErrNoRows → ErrNotFound
	}
	return t, nil
}

func (r *TodoRepo) List(ctx context.Context, userID int64, limit int) ([]Todo, error) {
	rows, err := r.db.Query(ctx,
		`SELECT `+todoCols+` FROM todos WHERE user_id = $1 ORDER BY id LIMIT $2`, userID, limit)
	if err != nil {
		return nil, mapErr("list todos", err)
	}
	todos, err := pgx.CollectRows(rows, pgx.RowToStructByName[Todo])
	if err != nil {
		return nil, mapErr("list todos", err)
	}
	return todos, nil
}

func (r *TodoRepo) SetDone(ctx context.Context, id int64, done bool) error {
	tag, err := r.db.Exec(ctx, `UPDATE todos SET done = $2 WHERE id = $1`, id, done)
	if err != nil {
		return mapErr("set done", err)
	}
	if tag.RowsAffected() == 0 { // строки не нашлось — Exec ошибкой это НЕ считает
		return fmt.Errorf("set done: %w", ErrNotFound)
	}
	return nil
}

// mapErr переводит ошибки драйвера в доменные, сохраняя контекст.
func mapErr(op string, err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("%s: %w", op, ErrNotFound)
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" { // unique_violation
		return fmt.Errorf("%s: %w", op, ErrConflict)
	}
	return fmt.Errorf("%s: %w", op, err)
}

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cfg, err := pgxpool.ParseConfig(os.Getenv("DATABASE_URL"))
	if err != nil {
		return fmt.Errorf("parse dsn: %w", err)
	}
	cfg.MaxConns = 10                 // верхняя граница соединений ЭТОГО экземпляра
	cfg.MaxConnLifetime = time.Hour   // периодически пересоздаём соединения
	cfg.MaxConnIdleTime = 15 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return fmt.Errorf("connect: %w", err)
	}
	defer pool.Close()
	if err := pool.Ping(ctx); err != nil {
		return fmt.Errorf("ping: %w", err)
	}

	repo := NewTodoRepo(pool)
	t, err := repo.Create(ctx, 1, "выучить SQL")
	if err != nil {
		return err
	}
	fmt.Printf("создано: %+v\n", t)

	// Тот же репозиторий — внутри транзакции: если fn вернёт ошибку, будет ROLLBACK.
	err = pgx.BeginFunc(ctx, pool, func(tx pgx.Tx) error {
		txRepo := NewTodoRepo(tx)
		if _, err := txRepo.Create(ctx, 1, "первое в транзакции"); err != nil {
			return err
		}
		return txRepo.SetDone(ctx, t.ID, true)
	})
	if err != nil {
		return fmt.Errorf("tx: %w", err)
	}
	return nil
}
```

Что здесь важно:

- **Плейсхолдеры `$1, $2`** — значения передаются **отдельно от текста запроса**. Это и защита от SQL-инъекций, и подготовка запросов.
- **`context` — первый параметр везде.** Если клиент отключился (`r.Context()`) или истёк таймаут — запрос в БД отменяется.
- **`Exec` не возвращает ошибку, если не нашёл строку.** Проверяйте `RowsAffected()`.
- **Преобразуйте ошибки драйвера в доменные** (`ErrNotFound`, `ErrConflict`) — HTTP-слой по ним выберет `404`/`409` и не будет импортировать `pgx`.
- Коды ошибок PostgreSQL (SQLSTATE): `23505` — нарушение уникальности, `23503` — внешний ключ, `23514` — `CHECK`, `40001` — сбой сериализации (повторите транзакцию), `40P01` — deadlock (повторите).

### Работа с `NULL`

Столбец, допускающий `NULL`, сканируется в **указатель**: `var s *string`; `rows.Scan(&s)` → `nil`, если `NULL`. Либо `pgtype.Text`, либо (для `database/sql`) `sql.NullString`. В JSON указатель так же даёт `null`.

### Деньги и `numeric`

В Go нет встроенного десятичного типа. Варианты: хранить **целые минимальные единицы** (`price_cents bigint`) — самый простой и надёжный; либо библиотека `decimal`/`pgtype.Numeric`. Не используйте `float64`.

## 8.4. Транзакции в Go

```mermaid
sequenceDiagram
  participant S as PlaceOrder
  participant T as pgx.BeginFunc
  participant DB as PostgreSQL
  S->>T: старт
  T->>DB: BEGIN
  S->>DB: INSERT orders
  S->>DB: UPDATE products WHERE stock >= n
  alt 0 строк изменено
    S-->>T: return ErrOutOfStock
    T->>DB: ROLLBACK
  else всё успешно
    S-->>T: return nil
    T->>DB: COMMIT
  end
```

Паттерн «заказ + списание остатка», **атомарно** (БД из главы 7):

```go
package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrOutOfStock = errors.New("out of stock")

type Item struct {
	ProductID int
	Quantity  int
}

// PlaceOrder создаёт заказ и списывает остатки. Либо всё, либо ничего.
func PlaceOrder(ctx context.Context, pool *pgxpool.Pool, userID int, items []Item) (orderID int, err error) {
	err = pgx.BeginFunc(ctx, pool, func(tx pgx.Tx) error {
		if err := tx.QueryRow(ctx,
			`INSERT INTO orders (user_id, status) VALUES ($1, 'new') RETURNING id`, userID,
		).Scan(&orderID); err != nil {
			return fmt.Errorf("insert order: %w", err)
		}

		for _, it := range items {
			// Проверка и списание — ОДНА атомарная операция (см. «потерянное обновление», глава 7).
			tag, err := tx.Exec(ctx,
				`UPDATE products SET stock = stock - $2 WHERE id = $1 AND stock >= $2`,
				it.ProductID, it.Quantity)
			if err != nil {
				return fmt.Errorf("decrease stock: %w", err)
			}
			if tag.RowsAffected() == 0 {
				return fmt.Errorf("product %d: %w", it.ProductID, ErrOutOfStock)
			}

			// Цену берём из БД на момент покупки — клиенту доверять нельзя.
			if _, err := tx.Exec(ctx,
				`INSERT INTO order_items (order_id, product_id, quantity, unit_price)
				 SELECT $1::int, id, $2::int, price FROM products WHERE id = $3::int`,
				orderID, it.Quantity, it.ProductID); err != nil {
				return fmt.Errorf("insert item: %w", err)
			}
		}
		return nil // BeginFunc сделает COMMIT; при ошибке — ROLLBACK
	})
	if err != nil {
		return 0, err
	}
	return orderID, nil
}

func main() {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	id, err := PlaceOrder(ctx, pool, 5, []Item{{ProductID: 3, Quantity: 1}, {ProductID: 7, Quantity: 1}})
	switch {
	case errors.Is(err, ErrOutOfStock):
		fmt.Println("товара не хватает, заказ не создан:", err)
	case err != nil:
		log.Fatal(err)
	default:
		fmt.Println("заказ", id)
	}
}
```

Ручной вариант (если нужно больше контроля):

```go
tx, err := pool.Begin(ctx)
if err != nil { return err }
defer tx.Rollback(ctx) // безопасно вызывать и после Commit: вернёт ErrTxClosed, его игнорируем
// ... tx.Exec / tx.QueryRow ...
return tx.Commit(ctx)
```

Правила:
- Внутри транзакции работайте **через `tx`**, а не через `pool` — иначе запрос уйдёт в другое соединение и вне транзакции.
- Транзакции **короткие**: никаких HTTP-вызовов и ожидания пользователя внутри.
- Сбои `40001`/`40P01` — повторяемые: оборачивайте транзакцию в retry с задержкой (задача 10).

## 8.5. SQL-инъекции

```go
// ❌ УЯЗВИМО: ввод пользователя становится частью SQL-кода
q := fmt.Sprintf("SELECT id, name FROM users WHERE email = '%s'", email)
// email = "x' OR '1'='1"         → вернёт ВСЕХ пользователей
// email = "x'; DROP TABLE users; --"  → уничтожит таблицу (если драйвер разрешает несколько команд)

// ✅ ВЕРНО: значение передаётся отдельно и НИКОГДА не интерпретируется как код
row := pool.QueryRow(ctx, "SELECT id, name FROM users WHERE email = $1", email)
```

**Правила:**

1. Значения — только через плейсхолдеры (`$1`). Никаких `Sprintf`/конкатенации с пользовательским вводом.
2. **Плейсхолдеры нельзя использовать для имён таблиц/столбцов и ключевых слов** (`ORDER BY $1` не работает). Для динамической сортировки — **белый список**:
   ```go
   var sortColumns = map[string]string{"title": "title", "created": "created_at"}
   col, ok := sortColumns[r.URL.Query().Get("sort")]
   if !ok { col = "id" }
   q := "SELECT ... ORDER BY " + col   // col взят из НАШЕЙ мапы, не от пользователя
   ```
3. Для `LIKE`-поиска передавайте шаблон как значение: `"%"+term+"%"` → `$1` (и экранируйте `%`/`_`, если нужен буквальный поиск).
4. Права БД-пользователя минимальны: инъекция не должна позволять `DROP`.

## 8.6. Пагинация по ключу (keyset)

`OFFSET 100000` вынуждает БД прочитать и выбросить 100 000 строк. **Keyset-пагинация** запоминает последнюю увиденную строку:

```sql
-- первая страница
SELECT id, title FROM todos WHERE user_id = $1 ORDER BY id LIMIT 21;
-- следующая: курсор — id последней строки
SELECT id, title FROM todos WHERE user_id = $1 AND id > $2 ORDER BY id LIMIT 21;

-- сортировка по времени (id — для уникальности порядка); сравнение «составных значений»:
SELECT id, title, created_at FROM todos
WHERE user_id = $1 AND (created_at, id) < ($2, $3)
ORDER BY created_at DESC, id DESC
LIMIT 21;
```

Запрашиваем `limit+1` строк: лишняя строка — признак, что следующая страница есть. Клиенту отдаём **непрозрачный курсор** (например, base64 от JSON `{"t":"2026-03-01T…","id":42}`). Индекс — `(user_id, created_at DESC, id DESC)`.

## 8.7. Миграции в проекте

```bash
go install github.com/pressly/goose/v3/cmd/goose@latest

goose -dir migrations postgres "$DATABASE_URL" status
goose -dir migrations postgres "$DATABASE_URL" up
goose -dir migrations postgres "$DATABASE_URL" down        # откатить одну
goose -dir migrations create add_todo_due_date sql         # новая миграция
```

Альтернативы: `golang-migrate` (`migrate -path migrations -database "$DATABASE_URL" up`), `atlas`. Миграции можно **встроить в бинарник** (`//go:embed migrations/*.sql`) и применять при старте или отдельной командой `app migrate` — для начала проще **отдельным шагом деплоя** (контейнер-«мигратор» в Compose, глава 9).

## 8.8. `sqlc`: типобезопасный SQL → Go

Вы пишете SQL с аннотациями, `sqlc generate` создаёт Go-код.

```sql
-- queries/todos.sql
-- name: GetTodo :one
SELECT * FROM todos WHERE id = $1;

-- name: ListTodos :many
SELECT * FROM todos WHERE user_id = $1 ORDER BY id LIMIT $2;

-- name: CreateTodo :one
INSERT INTO todos (user_id, title) VALUES ($1, $2) RETURNING *;

-- name: SetTodoDone :execrows
UPDATE todos SET done = $2 WHERE id = $1;
```

```yaml
# sqlc.yaml
version: "2"
sql:
  - engine: "postgresql"
    queries: "queries"
    schema: "migrations"
    gen:
      go:
        package: "db"
        out: "internal/db"
        sql_package: "pgx/v5"
```

```bash
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
sqlc generate
```

Получаете структуры `Todo`, интерфейс `DBTX` и методы `q.GetTodo(ctx, id)`, `q.CreateTodo(ctx, CreateTodoParams{...})`. Опечатка в имени столбца — **ошибка генерации**, а не 500 в продакшене.

## 8.9. `database/sql` — когда нужен

Если библиотека (миграции, `sqlx`) требует `*sql.DB`, используйте драйвер `pgx` через адаптер:

```go
import (
	"database/sql"
	_ "github.com/jackc/pgx/v5/stdlib" // регистрирует драйвер "pgx"
)

db, err := sql.Open("pgx", os.Getenv("DATABASE_URL"))
db.SetMaxOpenConns(10)
db.SetConnMaxLifetime(time.Hour)

var name string
err = db.QueryRowContext(ctx, "SELECT name FROM users WHERE id = $1", id).Scan(&name)
if errors.Is(err, sql.ErrNoRows) { /* не найдено */ }

rows, err := db.QueryContext(ctx, "SELECT id, name FROM users")
if err != nil { return err }
defer rows.Close()           // ОБЯЗАТЕЛЬНО, иначе утечка соединения
for rows.Next() { /* rows.Scan(...) */ }
if err := rows.Err(); err != nil { return err } // ошибка во время итерации
```

## 8.10. Пул соединений и производительность

- Размер пула: `MaxConns × число экземпляров приложения ≤ max_connections` БД (с запасом на миграции и админов). Для начала 10–25 на экземпляр.
- `pool.Stat()` показывает занятые/простаивающие соединения и **время ожидания соединения** (`AcquireDuration`) — если оно растёт, пул мал или запросы слишком долгие.
- **Всегда задавайте таймауты:** `context.WithTimeout` на запрос/обработчик; на стороне БД — `statement_timeout`.
- Не забывайте **закрывать `rows`**: незакрытые строки удерживают соединение.
- Находите N+1 — логируйте запросы (`pgx.QueryTracer`) и считайте их на запрос.
- Пакетные операции: `pgx.Batch` (несколько запросов за один round-trip), `COPY` для массовой вставки.

## 8.11. Тестирование слоя данных

Моки БД ловят мало. Репозиторий тестируют **против настоящего PostgreSQL**: `docker compose` с тестовой БД или библиотека **testcontainers-go** (поднимает контейнер из теста) — подробно в [главе 12](12-testirovanie.md). Изоляция тестов: каждый тест начинает `tx`, работает через `NewTodoRepo(tx)` и в конце делает `ROLLBACK` — данные не накапливаются (именно для этого репозиторий принимает `DBTX`).

---

## Задачи

1. 🟢 **База и миграции.** Создайте БД `todo`, примените миграцию `0001_init.sql` через `goose` (или `golang-migrate`). Проверьте `\d todos` в `psql`. Затем сделайте миграцию `0002`, добавляющую `todos.due_date timestamptz NULL` и частичный индекс; откатите её `down` и накатите снова.
2. 🟡 **`TodoRepo`.** Соберите программу из 8.3, добавьте `Update(title)` и `Delete`. Напишите **интеграционные тесты** (`//go:build integration`) для каждого метода: успех, `ErrNotFound`, `CHECK`-нарушение (пустой заголовок).
3. 🟡 **Подключите к HTTP.** Замените in-memory хранилище вашего TODO API (глава 6) на `TodoRepo`: обработчики получают репозиторий (через интерфейс, определённый в пакете обработчиков), `ErrNotFound` → `404`, `ErrConflict` → `409`. Данные должны переживать перезапуск сервера. Проверьте с Angular-клиентом.
4. 🟡 **Транзакция заказа.** Реализуйте `PlaceOrder` на БД `shop` из главы 7. Тесты: (а) успешный заказ, (б) нехватка остатка → **ничего не изменилось** (ни заказа, ни остатков), (в) **гонка**: 50 горутин одновременно покупают по 1 шт. товара с остатком 10 → ровно 10 успехов, остаток = 0, остальные получили `ErrOutOfStock`. Объясните, какая строка SQL это гарантирует.
5. 🟡 **SQL-инъекция.** Сделайте **намеренно уязвимый** эндпоинт `GET /search?email=` на `fmt.Sprintf`. Выведите через `curl` всю таблицу `users` (`' OR '1'='1`). Затем почините плейсхолдером и добавьте тест, который доказывает, что вредоносная строка больше не работает. (Только на своей локальной учебной БД!)
6. 🟡 **Keyset-пагинация.** `GET /todos?limit=20&cursor=...` с курсором `(created_at, id)`, `next_cursor` в ответе, индексом `(user_id, created_at DESC, id DESC)`. Сравните `EXPLAIN ANALYZE` с `OFFSET` на 1 000 000 строк.
7. 🔴 **`WithTx` и фикстуры.** Помощник `WithTx(ctx, pool, fn)`; тестовый хелпер `newTestTx(t)`, начинающий транзакцию и откатывающий её в `t.Cleanup`. Перепишите тесты репозитория на него; убедитесь, что тесты можно гонять параллельно (`t.Parallel()`) и порядок не важен.
8. 🔴 **Оптимистичная блокировка.** Добавьте `version integer NOT NULL DEFAULT 1`. `PATCH /todos/{id}` принимает версию (`If-Match`/поле) и делает `UPDATE ... SET ..., version = version + 1 WHERE id = $1 AND version = $2`; 0 строк → `409`/`412`. Тест: две горутины правят одну задачу с одинаковой версией — успешна ровно одна.
9. 🟡 **`sqlc`.** Для таблицы `todos` напишите `queries/todos.sql`, сгенерируйте код, замените им ручной репозиторий. Сравните: объём кода, поведение при опечатке в SQL, удобство `NULL`-полей (`due_date`).
10. 🔴 **Retry при сбоях транзакций.** Функция `WithRetry(ctx, attempts, fn)`, повторяющая транзакцию при SQLSTATE `40001`/`40P01` с экспоненциальной задержкой и jitter. Воспроизведите `40001` двумя конкурирующими транзакциями `REPEATABLE READ`/`SERIALIZABLE` и покажите, что с retry обе в итоге успешны.
11. 🟡 **Охота на N+1.** Эндпоинт `GET /todos?expand=user` сначала сделайте «в лоб» (запрос пользователя на каждую задачу). Посчитайте число запросов к БД (счётчик в `pgx.QueryTracer` или лог Postgres `log_statement = all`), замерьте латентность на 100 задачах. Исправьте `JOIN` и сравните.
12. 🔴 **Пул под нагрузкой.** Прогоните нагрузочный тест (`hey`, `vegeta` или `k6`) на эндпоинте с `pg_sleep(0.05)` в запросе при `MaxConns = 2`, `10` и `50`. Снимайте `pool.Stat()`. Как меняются латентность p95 и пропускная способность? Какой размер пула оптимален и почему «больше» ≠ «лучше»?

## Самопроверка

- Что такое `pgxpool.Pool` — одно соединение или пул? Сколько пулов создавать на приложение?
- Как работает защита плейсхолдерами от SQL-инъекций? Что делать, если нужна динамическая сортировка?
- Почему `Exec` с `UPDATE` несуществующей строки не возвращает ошибку? Как это обработать?
- Зачем репозиторию интерфейс `DBTX`? Как запустить репозиторий внутри транзакции?
- Что произойдёт при `return err` внутри `pgx.BeginFunc`? А при успехе?
- Что сделает `defer tx.Rollback(ctx)` после успешного `Commit`?
- Почему нельзя вызывать внешний HTTP-сервис внутри транзакции?
- В чём преимущество `sqlc` перед ORM? Какие у него ограничения?
- Почему keyset-пагинация быстрее `OFFSET`? Что такое непрозрачный курсор?
- Как «безопасно» уменьшить остаток товара при конкурентных заказах?

➡️ Дальше: [Глава 9. Docker](09-docker.md)
