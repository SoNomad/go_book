// Package stack — задача главы 4: обобщённый тип.
package stack

// Stack — стек (LIFO) значений типа T.
// Нулевое значение (var s Stack[int]) должно быть готово к использованию —
// это идиома Go: «make the zero value useful».
type Stack[T any] struct {
	// TODO: добавьте поля
}

// Push кладёт значение на вершину стека.
func (s *Stack[T]) Push(v T) {
	// TODO: реализуйте
}

// Pop снимает и возвращает верхний элемент.
// Для пустого стека возвращает (нулевое значение T, false).
func (s *Stack[T]) Pop() (T, bool) {
	// TODO: реализуйте
	var zero T
	return zero, false
}

// Peek возвращает верхний элемент, не снимая его.
// Для пустого стека возвращает (нулевое значение T, false).
func (s *Stack[T]) Peek() (T, bool) {
	// TODO: реализуйте
	var zero T
	return zero, false
}

// Len возвращает число элементов.
func (s *Stack[T]) Len() int {
	// TODO: реализуйте
	return 0
}
