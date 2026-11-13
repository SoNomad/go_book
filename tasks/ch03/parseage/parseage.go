// Package parseage — задача главы 3: сентинельные ошибки и их оборачивание.
package parseage

import "errors"

// Сентинельные ошибки: вызывающий код сравнивает их через errors.Is.
var (
	ErrNotNumber = errors.New("age is not a number")
	ErrNegative  = errors.New("age is negative")
	ErrTooOld    = errors.New("age is too large")
)

// MaxAge — максимально допустимый возраст.
const MaxAge = 150

// ParseAge разбирает возраст из строки.
//
// Правила:
//   - пробелы по краям игнорируются: " 42 " -> 42;
//   - не целое число (включая пустую строку и "4.5") -> ErrNotNumber;
//   - отрицательное -> ErrNegative; больше MaxAge -> ErrTooOld;
//   - ошибки ДОЛЖНЫ быть обёрнуты с контекстом и содержать исходную строку:
//     fmt.Errorf("parse age %q: %w", s, ErrNotNumber)
//     — так errors.Is продолжит работать, а сообщение станет информативным.
//
// Подсказки: strings.TrimSpace, strconv.Atoi.
func ParseAge(s string) (int, error) {
	// TODO: реализуйте
	return 0, nil
}
