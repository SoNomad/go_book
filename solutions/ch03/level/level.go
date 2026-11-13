package level

import (
	"errors"
	"fmt"
	"strings"
)

type Level int

const (
	Debug Level = iota
	Info
	Warn
	Error
)

var ErrUnknownLevel = errors.New("unknown level")

var names = [...]string{Debug: "DEBUG", Info: "INFO", Warn: "WARN", Error: "ERROR"}

func (l Level) String() string {
	if l < 0 || int(l) >= len(names) {
		return fmt.Sprintf("Level(%d)", int(l))
	}
	return names[l]
}

func ParseLevel(s string) (Level, error) {
	name := strings.ToUpper(strings.TrimSpace(s))
	for i, n := range names {
		if n == name {
			return Level(i), nil
		}
	}
	return 0, fmt.Errorf("parse level %q: %w", s, ErrUnknownLevel)
}
