package parsum

import "testing"

func seq(n int) []int {
	s := make([]int, n)
	for i := range s {
		s[i] = i + 1
	}
	return s
}

func TestParallelSum(t *testing.T) {
	const n = 1_000_000
	want := n * (n + 1) / 2
	for _, workers := range []int{-5, 0, 1, 2, 3, 4, 7, 16, 1000} {
		if got := ParallelSum(seq(n), workers); got != want {
			t.Errorf("workers=%d: got %d, want %d", workers, got, want)
		}
	}
}

func TestParallelSumSmallInputs(t *testing.T) {
	tests := []struct {
		name    string
		in      []int
		workers int
		want    int
	}{
		{"nil", nil, 4, 0},
		{"empty", []int{}, 4, 0},
		{"one element many workers", []int{42}, 8, 42},
		{"fewer elements than workers", []int{1, 2, 3}, 10, 6},
		{"negatives", []int{-1, -2, 3}, 2, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ParallelSum(tt.in, tt.workers); got != tt.want {
				t.Errorf("got %d, want %d", got, tt.want)
			}
		})
	}
}
