package topn

import (
	"slices"
	"testing"
)

func TestTopN(t *testing.T) {
	freq := map[string]int{"a": 3, "b": 5, "c": 3, "d": 1}
	tests := []struct {
		name string
		in   map[string]int
		n    int
		want []string
	}{
		{"top 2 with tie", freq, 2, []string{"b", "a"}},
		{"top 1", freq, 1, []string{"b"}},
		{"n bigger than len", freq, 10, []string{"b", "a", "c", "d"}},
		{"zero", freq, 0, []string{}},
		{"negative", freq, -1, []string{}},
		{"nil map", nil, 3, []string{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := TopN(tt.in, tt.n)
			if !slices.Equal(got, tt.want) {
				t.Errorf("TopN(%v, %d) = %v, want %v", tt.in, tt.n, got, tt.want)
			}
		})
	}
}

// Порядок обхода мапы случаен, поэтому прогоняем несколько раз.
func TestTopNDeterministic(t *testing.T) {
	freq := map[string]int{"x": 1, "y": 1, "z": 1, "w": 1, "v": 1}
	want := []string{"v", "w", "x", "y", "z"}
	for i := 0; i < 50; i++ {
		if got := TopN(freq, 5); !slices.Equal(got, want) {
			t.Fatalf("iteration %d: got %v, want %v", i, got, want)
		}
	}
}
