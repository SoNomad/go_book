package parseage

import (
	"errors"
	"strings"
	"testing"
)

func TestParseAge(t *testing.T) {
	tests := []struct {
		in      string
		want    int
		wantErr error
	}{
		{" 42 ", 42, nil},
		{"0", 0, nil},
		{"150", 150, nil},
		{"abc", 0, ErrNotNumber},
		{"", 0, ErrNotNumber},
		{"4.5", 0, ErrNotNumber},
		{"-1", 0, ErrNegative},
		{"151", 0, ErrTooOld},
	}
	for _, tt := range tests {
		t.Run(tt.in, func(t *testing.T) {
			got, err := ParseAge(tt.in)
			if tt.wantErr == nil {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
			} else if !errors.Is(err, tt.wantErr) {
				t.Fatalf("error = %v, want errors.Is(..., %v)", err, tt.wantErr)
			}
			if got != tt.want {
				t.Errorf("got %d, want %d", got, tt.want)
			}
		})
	}
}

func TestErrorIsWrappedWithContext(t *testing.T) {
	_, err := ParseAge("abc")
	if err == nil {
		t.Fatal("expected error")
	}
	if err == ErrNotNumber {
		t.Error("ошибка должна быть обёрнута через fmt.Errorf(... %w ...), а не возвращена как есть")
	}
	if !strings.Contains(err.Error(), `"abc"`) {
		t.Errorf("сообщение %q должно содержать исходную строку в кавычках (%%q)", err.Error())
	}
}
