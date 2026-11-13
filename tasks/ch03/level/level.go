// Package level — задача главы 3: «enum» через iota и интерфейс fmt.Stringer.
package level

import "errors"

// Level — уровень логирования.
type Level int

const (
	Debug Level = iota
	Info
	Warn
	Error
)

// ErrUnknownLevel возвращается ParseLevel для неизвестных названий.
var ErrUnknownLevel = errors.New("unknown level")

// String реализует fmt.Stringer: "DEBUG", "INFO", "WARN", "ERROR".
// Для значений вне диапазона возвращает "Level(N)", например "Level(42)".
//
// Подсказки: switch или массив имён; fmt.Sprintf("Level(%d)", int(l)).
// Осторожно: fmt.Sprintf("%d", l) внутри String() с %v/%s даст бесконечную
// рекурсию — приводите l к int.
func (l Level) String() string {
	// TODO: реализуйте
	return ""
}

// ParseLevel разбирает название уровня без учёта регистра и пробелов по краям.
// Для неизвестного названия возвращает ошибку, оборачивающую ErrUnknownLevel
// (fmt.Errorf("...%q: %w", s, ErrUnknownLevel)).
func ParseLevel(s string) (Level, error) {
	// TODO: реализуйте
	return 0, nil
}
