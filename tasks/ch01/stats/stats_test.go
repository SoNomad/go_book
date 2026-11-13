package stats

import (
	"errors"
	"math"
	"testing"
)

func TestStats(t *testing.T) {
	tests := []struct {
		name       string
		in         []int
		min, max   int
		avg        float64
	}{
		{"single", []int{5}, 5, 5, 5},
		{"basic", []int{3, 1, 2}, 1, 3, 2},
		{"negatives", []int{-5, -1, -3}, -5, -1, -3},
		{"fraction", []int{1, 2}, 1, 2, 1.5},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lo, hi, avg, err := Stats(tt.in)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if lo != tt.min || hi != tt.max || math.Abs(avg-tt.avg) > 1e-9 {
				t.Errorf("Stats(%v) = (%d, %d, %v), want (%d, %d, %v)",
					tt.in, lo, hi, avg, tt.min, tt.max, tt.avg)
			}
		})
	}
}

func TestStatsEmpty(t *testing.T) {
	for _, in := range [][]int{nil, {}} {
		_, _, _, err := Stats(in)
		if !errors.Is(err, ErrEmpty) {
			t.Errorf("Stats(%v) error = %v, want ErrEmpty", in, err)
		}
	}
}
