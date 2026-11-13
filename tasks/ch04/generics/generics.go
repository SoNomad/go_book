// Package generics — задача главы 4: параметры типов.
package generics

// Map применяет f к каждому элементу и возвращает новый слайс.
// Для пустого входа возвращает пустой слайс.
func Map[T, U any](s []T, f func(T) U) []U {
	// TODO: реализуйте
	return nil
}

// Filter возвращает новый слайс из элементов, для которых pred вернул true.
// Входной слайс не изменяется.
func Filter[T any](s []T, pred func(T) bool) []T {
	// TODO: реализуйте
	return nil
}

// Reduce сворачивает слайс в одно значение: acc = f(acc, элемент) слева направо.
// Для пустого слайса возвращает init.
func Reduce[T, A any](s []T, init A, f func(A, T) A) A {
	// TODO: реализуйте
	return init
}

// Keys возвращает ключи мапы в произвольном порядке.
func Keys[K comparable, V any](m map[K]V) []K {
	// TODO: реализуйте
	return nil
}
