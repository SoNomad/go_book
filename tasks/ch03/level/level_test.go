package level

import (
	"errors"
	"fmt"
	"testing"
)

func TestString(t *testing.T) {
	tests := []struct {
		l    Level
		want string
	}{
		{Debug, "DEBUG"},
		{Info, "INFO"},
		{Warn, "WARN"},
		{Error, "ERROR"},
		{Level(42), "Level(42)"},
		{Level(-1), "Level(-1)"},
	}
	for _, tt := range tests {
		if got := tt.l.String(); got != tt.want {
			t.Errorf("Level(%d).String() = %q, want %q", int(tt.l), got, tt.want)
		}
	}
}

func TestStringerIsUsedByFmt(t *testing.T) {
	if got := fmt.Sprintf("%v", Warn); got != "WARN" {
		t.Errorf("Sprintf(%%v) = %q, want WARN", got)
	}
}

func TestParseLevel(t *testing.T) {
	tests := []struct {
		in   string
		want Level
	}{
		{"debug", Debug},
		{"INFO", Info},
		{" Warn ", Warn},
		{"error", Error},
	}
	for _, tt := range tests {
		got, err := ParseLevel(tt.in)
		if err != nil || got != tt.want {
			t.Errorf("ParseLevel(%q) = (%v, %v), want (%v, nil)", tt.in, got, err, tt.want)
		}
	}
}

func TestParseLevelUnknown(t *testing.T) {
	_, err := ParseLevel("trace")
	if !errors.Is(err, ErrUnknownLevel) {
		t.Fatalf("error = %v, want errors.Is(..., ErrUnknownLevel)", err)
	}
}

func TestRoundTrip(t *testing.T) {
	for _, l := range []Level{Debug, Info, Warn, Error} {
		got, err := ParseLevel(l.String())
		if err != nil || got != l {
			t.Errorf("round trip of %v failed: (%v, %v)", l, got, err)
		}
	}
}
