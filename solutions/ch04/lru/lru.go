package lru

import "container/list"

type entry[K comparable, V any] struct {
	key K
	val V
}

type LRU[K comparable, V any] struct {
	cap   int
	ll    *list.List // front = самый свежий
	items map[K]*list.Element
}

func NewLRU[K comparable, V any](capacity int) *LRU[K, V] {
	if capacity < 1 {
		panic("lru: capacity must be >= 1")
	}
	return &LRU[K, V]{
		cap:   capacity,
		ll:    list.New(),
		items: make(map[K]*list.Element, capacity),
	}
}

func (c *LRU[K, V]) Get(key K) (V, bool) {
	el, ok := c.items[key]
	if !ok {
		var zero V
		return zero, false
	}
	c.ll.MoveToFront(el)
	return el.Value.(*entry[K, V]).val, true
}

func (c *LRU[K, V]) Put(key K, value V) {
	if el, ok := c.items[key]; ok {
		el.Value.(*entry[K, V]).val = value
		c.ll.MoveToFront(el)
		return
	}
	c.items[key] = c.ll.PushFront(&entry[K, V]{key, value})
	if c.ll.Len() > c.cap {
		oldest := c.ll.Back()
		c.ll.Remove(oldest)
		delete(c.items, oldest.Value.(*entry[K, V]).key)
	}
}

func (c *LRU[K, V]) Len() int { return c.ll.Len() }
