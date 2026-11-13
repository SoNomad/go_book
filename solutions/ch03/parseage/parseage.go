package parseage

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

var (
	ErrNotNumber = errors.New("age is not a number")
	ErrNegative  = errors.New("age is negative")
	ErrTooOld    = errors.New("age is too large")
)

const MaxAge = 150

func ParseAge(s string) (int, error) {
	n, err := strconv.Atoi(strings.TrimSpace(s))
	if err != nil {
		return 0, fmt.Errorf("parse age %q: %w", s, ErrNotNumber)
	}
	switch {
	case n < 0:
		return 0, fmt.Errorf("parse age %q: %w", s, ErrNegative)
	case n > MaxAge:
		return 0, fmt.Errorf("parse age %q: %w", s, ErrTooOld)
	}
	return n, nil
}
