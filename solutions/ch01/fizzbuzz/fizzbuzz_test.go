package fizzbuzz

import (
	"slices"
	"testing"
)

func TestFizzBuzz(t *testing.T) {
	tests := []struct {
		name string
		n    int
		want []string
	}{
		{"zero", 0, []string{}},
		{"negative", -3, []string{}},
		{"one", 1, []string{"1"}},
		{"five", 5, []string{"1", "2", "Fizz", "4", "Buzz"}},
		{"fifteen", 15, []string{
			"1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz",
			"11", "Fizz", "13", "14", "FizzBuzz",
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := FizzBuzz(tt.n)
			if !slices.Equal(got, tt.want) {
				t.Errorf("FizzBuzz(%d) = %v, want %v", tt.n, got, tt.want)
			}
		})
	}
}

func TestFizzBuzzLength(t *testing.T) {
	if got := len(FizzBuzz(100)); got != 100 {
		t.Fatalf("len(FizzBuzz(100)) = %d, want 100", got)
	}
}
