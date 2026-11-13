package wordfreq

import (
	"maps"
	"testing"
)

func TestWordFreq(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want map[string]int
	}{
		{"empty", "", map[string]int{}},
		{"case", "go Go GO", map[string]int{"go": 3}},
		{"punctuation", "Hello, world! Hello...", map[string]int{"hello": 2, "world": 1}},
		{"hyphen", "go-lang rocks", map[string]int{"go": 1, "lang": 1, "rocks": 1}},
		{"digits are separators", "a1b", map[string]int{"a": 1, "b": 1}},
		{"cyrillic", "Привет, привет МИР", map[string]int{"привет": 2, "мир": 1}},
		{"only separators", " ,.! 123 ", map[string]int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := WordFreq(tt.in)
			if !maps.Equal(got, tt.want) {
				t.Errorf("WordFreq(%q) = %v, want %v", tt.in, got, tt.want)
			}
		})
	}
}
