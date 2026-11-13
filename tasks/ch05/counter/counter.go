// Package counter — задача главы 5: защита общего состояния мьютексом.
package counter

// SafeCounter — потокобезопасный счётчик по строковым ключам.
//
// Им будут пользоваться сотни горутин одновременно. Обычная map без защиты
// при параллельной записи даже приведёт к fatal error (а не просто к
// неверному числу) — проверьте это сами, убрав мьютекс.
//
// Подсказки: sync.Mutex (или RWMutex), defer mu.Unlock().
// Нулевое значение NewSafeCounter не нужно — конструктор инициализирует мапу.
type SafeCounter struct {
	// TODO: добавьте поля
}

// NewSafeCounter создаёт готовый к работе счётчик.
func NewSafeCounter() *SafeCounter {
	// TODO: реализуйте
	return &SafeCounter{}
}

// Inc увеличивает счётчик ключа на 1.
func (c *SafeCounter) Inc(key string) {
	// TODO: реализуйте
}

// Value возвращает текущее значение ключа (0, если ключа нет).
func (c *SafeCounter) Value(key string) int {
	// TODO: реализуйте
	return 0
}
