package merge

import (
	"slices"
	"testing"
	"time"
)

func gen(vals ...int) <-chan int {
	ch := make(chan int)
	go func() {
		defer close(ch)
		for _, v := range vals {
			ch <- v
		}
	}()
	return ch
}

func collect(t *testing.T, ch <-chan int) []int {
	t.Helper()
	var got []int
	timeout := time.After(3 * time.Second)
	for {
		select {
		case v, ok := <-ch:
			if !ok {
				return got
			}
			got = append(got, v)
		case <-timeout:
			t.Fatal("выходной канал не закрылся за 3 секунды")
			return nil
		}
	}
}

func TestMerge(t *testing.T) {
	got := collect(t, Merge(gen(1, 2, 3), gen(10, 20), gen(), gen(100)))
	slices.Sort(got)
	if want := []int{1, 2, 3, 10, 20, 100}; !slices.Equal(got, want) {
		t.Errorf("got %v, want %v", got, want)
	}
}

func TestMergeNoInputs(t *testing.T) {
	if got := collect(t, Merge[int]()); len(got) != 0 {
		t.Errorf("got %v, want nothing", got)
	}
}

func TestMergeKeepsOrderWithinOneInput(t *testing.T) {
	got := collect(t, Merge(gen(1, 2, 3, 4, 5)))
	if want := []int{1, 2, 3, 4, 5}; !slices.Equal(got, want) {
		t.Errorf("got %v, want %v", got, want)
	}
}

func TestMergeMany(t *testing.T) {
	const inputs, perInput = 50, 100
	chans := make([]<-chan int, inputs)
	for i := range chans {
		vals := make([]int, perInput)
		for j := range vals {
			vals[j] = i*perInput + j
		}
		chans[i] = gen(vals...)
	}
	got := collect(t, Merge(chans...))
	if len(got) != inputs*perInput {
		t.Fatalf("got %d values, want %d", len(got), inputs*perInput)
	}
	slices.Sort(got)
	for i, v := range got {
		if v != i {
			t.Fatalf("lost or duplicated value near %d (got %d)", i, v)
		}
	}
}
