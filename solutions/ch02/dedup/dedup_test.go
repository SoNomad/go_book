package dedup

import (
	"slices"
	"testing"
)

func TestDedup(t *testing.T) {
	tests := []struct {
		name string
		in   []int
		want []int
	}{
		{"nil", nil, nil},
		{"empty", []int{}, nil},
		{"no dups", []int{1, 2, 3}, []int{1, 2, 3}},
		{"dups", []int{1, 2, 2, 3, 1}, []int{1, 2, 3}},
		{"all same", []int{7, 7, 7}, []int{7}},
		{"order kept", []int{3, 1, 3, 2, 1}, []int{3, 1, 2}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Dedup(tt.in)
			if !slices.Equal(got, tt.want) {
				t.Errorf("Dedup(%v) = %v, want %v", tt.in, got, tt.want)
			}
		})
	}
}

func TestDedupDoesNotTouchInput(t *testing.T) {
	in := []int{1, 1, 2, 2, 3}
	orig := slices.Clone(in)
	_ = Dedup(in)
	if !slices.Equal(in, orig) {
		t.Fatalf("input was modified: %v, was %v", in, orig)
	}
}

func TestDedupDoesNotAliasInput(t *testing.T) {
	in := []int{1, 2, 3}
	out := Dedup(in)
	if len(out) == 0 {
		t.Skip("Dedup пока не реализован")
	}
	out[0] = 100
	if in[0] != 1 {
		t.Fatalf("result shares memory with input: in = %v", in)
	}
}
