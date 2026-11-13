package dedup

func Dedup(s []int) []int {
	seen := make(map[int]struct{}, len(s))
	out := make([]int, 0, len(s))
	for _, v := range s {
		if _, ok := seen[v]; ok {
			continue
		}
		seen[v] = struct{}{}
		out = append(out, v)
	}
	return out
}
