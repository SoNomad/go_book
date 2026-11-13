# Шпаргалка: TypeScript ↔ Go

Быстрый перевод привычных конструкций. Подробности — в главах учебника ([README](README.md)).

## 1. Основы

| TypeScript | Go |
|---|---|
| `let x = 5;` | `x := 5` (внутри функций) · `var x = 5` |
| `const PI = 3.14;` | `const PI = 3.14` |
| `let n: number` | `var n int` / `var f float64` (выбираете тип сами) |
| `string`, `boolean` | `string`, `bool` |
| `null` / `undefined` | `nil` (для указателей, слайсов, мап, интерфейсов, функций, каналов) + **нулевые значения**: `0`, `""`, `false` |
| `x ?? 0`, `x?.y` | явная проверка: `if p != nil { ... }`; для «опционального» значения — указатель `*int` |
| `` `Привет, ${name}!` `` | `fmt.Sprintf("Привет, %s!", name)` |
| `console.log(x)` | `fmt.Println(x)` · `fmt.Printf("%v %+v %T\n", x, x, x)` |
| `typeof x` | `fmt.Printf("%T", x)` · type switch `switch v := x.(type)` |
| `Number("42")` / `parseInt` | `n, err := strconv.Atoi("42")` |
| `String(42)` | `strconv.Itoa(42)` (не `string(42)`!) |
| `a === b` | `a == b` (для сравнимых типов) |
| `cond ? a : b` | нет тернарного оператора: `if cond { x = a } else { x = b }` |

## 2. Функции

| TypeScript | Go |
|---|---|
| `function add(a: number, b: number): number { return a + b }` | `func add(a, b int) int { return a + b }` |
| `(a, b) => a + b` | `func(a, b int) int { return a + b }` |
| несколько значений: `[a, b]` / `{a, b}` | `func f() (int, error)` → `x, err := f()` |
| `...args: number[]` | `func sum(nums ...int)`; вызов `sum(slice...)` |
| параметры по умолчанию, объект опций | структура опций или функциональные опции `WithX(...)` |
| `async function` | обычная функция + `go` / `context` (нет «цветных» функций) |

## 3. Коллекции

| TypeScript | Go |
|---|---|
| `const a = [1, 2, 3]` | `a := []int{1, 2, 3}` |
| `a.length` | `len(a)` |
| `a.push(4)` | `a = append(a, 4)` ← **всегда присваивайте результат** |
| `[...a, ...b]` | `append(a, b...)` (осторожно с алиасингом; копия: `slices.Clone`) |
| `a.slice(1, 3)` | `a[1:3]` (**делит память** с `a`!) |
| `a.includes(x)` | `slices.Contains(a, x)` |
| `a.indexOf(x)` | `slices.Index(a, x)` |
| `a.sort((x, y) => x - y)` | `slices.Sort(a)` · `slices.SortFunc(a, func(x, y T) int { return cmp.Compare(x.N, y.N) })` |
| `a.reverse()` | `slices.Reverse(a)` |
| `a.map(f)`, `filter`, `reduce` | цикл `for` (идиоматично) или свои дженерик-функции (глава 4) |
| `for (const x of a)` | `for _, x := range a` |
| `for (let i = 0; i < n; i++)` | `for i := 0; i < n; i++` · `for i := range n` (Go 1.22+) |
| `const [a, b] = [1, 2]` | `a, b := 1, 2` |
| `const m = new Map<string, number>()` / `{}` | `m := map[string]int{}` |
| `m.get(k)` / `k in m` | `v := m[k]` · `v, ok := m[k]` |
| `m.set(k, v)`, `m.delete(k)` | `m[k] = v`, `delete(m, k)` |
| `Object.keys(m)` | `slices.Sorted(maps.Keys(m))` (порядок обхода мапы **случаен**) |
| `new Set<T>()` | `map[T]struct{}` |

## 4. Объекты, классы, интерфейсы

| TypeScript | Go |
|---|---|
| `interface User { id: number; name: string }` (данные) | `type User struct { ID int; Name string }` |
| `class A { constructor(...) {} method() {} }` | `type A struct{...}`; `func NewA(...) *A`; `func (a *A) Method() {}` |
| `this` | получатель: `func (a *A) ...` — явный параметр |
| `extends` (наследование) | **встраивание**: `type B struct { A; ... }` (композиция) |
| `implements I` | **неявно**: достаточно иметь методы интерфейса |
| `interface Shape { area(): number }` (поведение) | `type Shape interface { Area() float64 }` |
| `private` / `public` | имя с **маленькой** буквы — пакетное, с **большой** — экспортируемое |
| `static` | функция уровня пакета |
| `enum Color { Red, Green }` | `type Color int; const ( Red Color = iota; Green )` + метод `String()` |
| union `A \| B` | интерфейс + type switch; или отдельные поля/типы |
| generics `<T>` | `func Map[T, U any](s []T, f func(T) U) []U` |
| `JSON.stringify(x)` / `JSON.parse(s)` | `json.Marshal(x)` / `json.Unmarshal(b, &x)` · теги `` `json:"name,omitempty"` `` |
| `Object.assign`, spread `{...a, x: 1}` | копия структуры: `b := a; b.X = 1` (структуры копируются по значению) |

## 5. Ошибки

| TypeScript | Go |
|---|---|
| `throw new Error("x")` | `return errors.New("x")` · `fmt.Errorf("ctx: %w", err)` |
| `try { ... } catch (e) { ... }` | `v, err := f(); if err != nil { ... }` |
| `finally` | `defer cleanup()` |
| `class NotFound extends Error` | `type NotFound struct{...}; func (e *NotFound) Error() string` |
| `e instanceof NotFound` | `var nf *NotFound; errors.As(err, &nf)` |
| сравнение по значению/коду | `errors.Is(err, ErrNotFound)` |
| необработанное исключение | `panic` — **только** для невозможных состояний; `recover` на границах |

## 6. Асинхронность и конкурентность

| JS / TS / RxJS | Go |
|---|---|
| `await fetch(...)` | обычный блокирующий вызов `http.Client.Do(req)` в горутине |
| запуск в фоне `promise.then(...)` | `go func() { ... }()` |
| `Promise.all([...])` | `sync.WaitGroup` · `errgroup.Group` |
| `Promise.race` | `select` по нескольким каналам |
| `setTimeout(fn, ms)` | `time.AfterFunc(d, fn)` · `<-time.After(d)` |
| `setInterval` | `time.NewTicker(d)` |
| `AbortController` / `signal` | `context.WithCancel` / `WithTimeout`; `ctx.Done()` |
| `Subject` / поток событий | `chan T` (`close` — конец потока; `for v := range ch`) |
| `debounceTime`, `throttleTime` | таймер с `Reset` / `time.Ticker` / `x/time/rate` |
| общее изменяемое состояние (безопасно из-за одного потока) | **гонки возможны**: `sync.Mutex`, `sync/atomic`, каналы; проверка `-race` |

## 7. Пакеты и инструменты

| Node / npm / Angular | Go |
|---|---|
| `package.json` | `go.mod` |
| `npm install pkg` | `go get example.com/pkg@version` |
| `npm ci` | `go mod download` (+ `go.sum` для проверки) |
| `import { x } from './y'` | `import "module/path/to/pkg"` → `pkg.X` |
| `export` | имя с большой буквы |
| `npm run build` / `ng build` | `go build ./...` · `go build -o bin/app ./cmd/app` |
| `npm start` / `ng serve` | `go run ./cmd/app` |
| `ng test` / Jest | `go test ./...` · `-run Name` · `-race` · `-cover` · `-bench .` |
| ESLint + Prettier | `gofmt -w .` · `go vet ./...` · `golangci-lint run` |
| `npm audit` | `govulncheck ./...` |
| `.env` | переменные окружения: `os.Getenv("KEY")` (читайте один раз при старте) |
| Express / Nest controllers | `http.Handler` / `ServeMux` / `chi` |
| `HttpInterceptor` | middleware `func(http.Handler) http.Handler` |
| `@Injectable` + DI | структура + конструктор `NewX(deps)`; сборка в `main()` |
| Jest `describe/it/expect` | `TestXxx(t)`, table-driven, `t.Run`, `if got != want { t.Errorf(...) }` |

## 8. Время и числа

| TypeScript | Go |
|---|---|
| `Date.now()` | `time.Now()` · `.UnixMilli()` |
| `new Date(ms)` | `time.UnixMilli(ms)` |
| `date.toISOString()` | `t.UTC().Format(time.RFC3339)` |
| формат `YYYY-MM-DD` | эталон `"2006-01-02"` (!) |
| `ms` числом | `time.Duration`: `5 * time.Second` |
| `Math.max/min/round` | `max`, `min` (встроенные, Go 1.21) · `math.Round` |
| `number` для денег | **не `float64`**: целые копейки `int64` или `numeric` в БД |

## 9. Идиомы и ловушки

- **Нулевые значения полезны:** `var mu sync.Mutex`, `var buf bytes.Buffer`, `var s []T` — готовы к работе.
- **Всё копируется по значению**, кроме слайсов/мап/каналов/функций/интерфейсов (внутри них — указатель на общие данные).
- **`append` возвращает слайс** — присваивайте. Подслайс делит память.
- **Мапа** в `nil`: читать можно, писать — паника. Порядок обхода случаен.
- **`:=` во вложенном блоке** создаёт новую переменную (тень), не присваивает внешней.
- **Ошибки проверяйте всегда**; оборачивайте контекстом `%w`; обрабатывайте **один раз**.
- **`defer`** — LIFO; аргументы вычисляются сразу; в цикле откладывает до конца *функции*.
- **Возврат `error`:** возвращайте литерал `nil`, а не типизированный `nil`-указатель.
- **`context.Context`** — первый параметр; не хранить в структуре; `defer cancel()`.
- **Закрывает канал отправитель**, а не получатель; отправка в закрытый — паника.
- **Горутина должна иметь способ завершиться** — иначе утечка.
- **Интерфейсы — маленькие, объявлять у потребителя; принимай интерфейсы, возвращай структуры.**
- **`http.Client` без таймаута и `ListenAndServe` без таймаутов — в прод нельзя.**
- **SQL — только через плейсхолдеры** (`$1`), значения никогда не склеивайте в запрос.
- **Не логируйте секреты**; не отдавайте клиенту внутренние ошибки.
- **Простота > ум.** Если код выглядит «хитро» — упростите.
