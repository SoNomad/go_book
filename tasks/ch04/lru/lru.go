// Package lru — задача главы 4 (🔴): LRU-кэш на дженериках.
package lru

// LRU — кэш фиксированной ёмкости, вытесняющий давно НЕ использованные записи
// (Least Recently Used). И Get, и Put считаются «использованием».
//
// Требования: Get, Put — O(1).
// Подсказка: container/list (двусвязный список) + map[K]*list.Element.
// В элементе списка храните и ключ, и значение — ключ нужен при вытеснении,
// чтобы удалить запись из мапы.
type LRU[K comparable, V any] struct {
	// TODO: добавьте поля
}

// NewLRU создаёт кэш. При capacity < 1 вызывает panic — это ошибка
// программиста, а не штатная ситуация.
func NewLRU[K comparable, V any](capacity int) *LRU[K, V] {
	// TODO: реализуйте
	return &LRU[K, V]{}
}

// Get возвращает значение и отмечает запись как самую свежую.
func (c *LRU[K, V]) Get(key K) (V, bool) {
	// TODO: реализуйте
	var zero V
	return zero, false
}

// Put добавляет или обновляет запись (и делает её самой свежей).
// Если ёмкость превышена — вытесняется самая старая запись.
func (c *LRU[K, V]) Put(key K, value V) {
	// TODO: реализуйте
}

// Len возвращает текущее число записей.
func (c *LRU[K, V]) Len() int {
	// TODO: реализуйте
	return 0
}
