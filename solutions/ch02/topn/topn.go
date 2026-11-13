package topn

import (
	"cmp"
	"slices"
	"strings"
)

func TopN(freq map[string]int, n int) []string {
	if n <= 0 || len(freq) == 0 {
		return []string{}
	}
	keys := make([]string, 0, len(freq))
	for k := range freq {
		keys = append(keys, k)
	}
	slices.SortFunc(keys, func(a, b string) int {
		if c := cmp.Compare(freq[b], freq[a]); c != 0 {
			return c // больше значение — раньше
		}
		return strings.Compare(a, b)
	})
	if n < len(keys) {
		keys = keys[:n]
	}
	return keys
}
