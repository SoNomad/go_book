package counter

import "sync"

type SafeCounter struct {
	mu sync.RWMutex
	m  map[string]int
}

func NewSafeCounter() *SafeCounter {
	return &SafeCounter{m: make(map[string]int)}
}

func (c *SafeCounter) Inc(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.m[key]++
}

func (c *SafeCounter) Value(key string) int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.m[key]
}
