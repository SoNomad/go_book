package counter

import (
	"sync"
	"testing"
)

func TestSafeCounterConcurrent(t *testing.T) {
	const goroutines, perG = 100, 1000
	c := NewSafeCounter()

	var wg sync.WaitGroup
	for g := 0; g < goroutines; g++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := 0; i < perG; i++ {
				c.Inc("shared")
				if i%2 == 0 {
					c.Inc("even")
				}
				_ = c.Value("shared") // читатели тоже работают параллельно
			}
		}()
	}
	wg.Wait()

	if got, want := c.Value("shared"), goroutines*perG; got != want {
		t.Errorf(`Value("shared") = %d, want %d`, got, want)
	}
	if got, want := c.Value("even"), goroutines*perG/2; got != want {
		t.Errorf(`Value("even") = %d, want %d`, got, want)
	}
	if got := c.Value("missing"); got != 0 {
		t.Errorf(`Value("missing") = %d, want 0`, got)
	}
}
