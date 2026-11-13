package generics

import (
	"slices"
	"strconv"
	"strings"
	"testing"
)

func TestMap(t *testing.T) {
	got := Map([]int{1, 2, 3}, func(n int) string { return strconv.Itoa(n * n) })
	if want := []string{"1", "4", "9"}; !slices.Equal(got, want) {
		t.Errorf("Map = %v, want %v", got, want)
	}
	if got := Map([]int{}, func(n int) int { return n }); len(got) != 0 {
		t.Errorf("Map(empty) = %v, want empty", got)
	}
	words := Map([]string{"go", "ts"}, strings.ToUpper)
	if want := []string{"GO", "TS"}; !slices.Equal(words, want) {
		t.Errorf("Map(ToUpper) = %v, want %v", words, want)
	}
}

func TestFilter(t *testing.T) {
	in := []int{1, 2, 3, 4, 5, 6}
	orig := slices.Clone(in)
	got := Filter(in, func(n int) bool { return n%2 == 0 })
	if want := []int{2, 4, 6}; !slices.Equal(got, want) {
		t.Errorf("Filter = %v, want %v", got, want)
	}
	if !slices.Equal(in, orig) {
		t.Errorf("Filter changed its input: %v", in)
	}
}

func TestReduce(t *testing.T) {
	sum := Reduce([]int{1, 2, 3, 4}, 0, func(acc, n int) int { return acc + n })
	if sum != 10 {
		t.Errorf("sum = %d, want 10", sum)
	}
	// Тип аккумулятора отличается от типа элементов.
	s := Reduce([]int{1, 2, 3}, "", func(acc string, n int) string { return acc + strconv.Itoa(n) })
	if s != "123" {
		t.Errorf("concat = %q, want 123", s)
	}
	if got := Reduce(nil, 42, func(acc, n int) int { return acc + n }); got != 42 {
		t.Errorf("Reduce(empty) = %d, want init 42", got)
	}
}

func TestKeys(t *testing.T) {
	got := Keys(map[string]int{"b": 2, "a": 1, "c": 3})
	slices.Sort(got)
	if want := []string{"a", "b", "c"}; !slices.Equal(got, want) {
		t.Errorf("Keys = %v, want %v", got, want)
	}
	if got := Keys(map[int]bool{}); len(got) != 0 {
		t.Errorf("Keys(empty) = %v, want empty", got)
	}
}
