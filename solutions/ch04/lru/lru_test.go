package lru

import "testing"

func TestBasicEviction(t *testing.T) {
	c := NewLRU[string, int](2)
	c.Put("a", 1)
	c.Put("b", 2)
	c.Put("c", 3) // вытесняет "a" — самый старый

	if _, ok := c.Get("a"); ok {
		t.Error(`"a" должен быть вытеснен`)
	}
	if v, ok := c.Get("b"); !ok || v != 2 {
		t.Errorf(`Get("b") = (%d, %v), want (2, true)`, v, ok)
	}
	if v, ok := c.Get("c"); !ok || v != 3 {
		t.Errorf(`Get("c") = (%d, %v), want (3, true)`, v, ok)
	}
	if c.Len() != 2 {
		t.Errorf("Len = %d, want 2", c.Len())
	}
}

func TestGetRefreshesRecency(t *testing.T) {
	c := NewLRU[string, int](2)
	c.Put("a", 1)
	c.Put("b", 2)
	c.Get("a")    // теперь "b" — самый старый
	c.Put("c", 3) // вытесняет "b"

	if _, ok := c.Get("b"); ok {
		t.Error(`"b" должен быть вытеснен, потому что "a" недавно читали`)
	}
	if _, ok := c.Get("a"); !ok {
		t.Error(`"a" должен остаться`)
	}
}

func TestPutUpdatesExisting(t *testing.T) {
	c := NewLRU[string, int](2)
	c.Put("a", 1)
	c.Put("b", 2)
	c.Put("a", 10) // обновление: не должно увеличивать Len и должно освежить "a"
	if c.Len() != 2 {
		t.Fatalf("Len = %d, want 2", c.Len())
	}
	c.Put("c", 3) // вытесняет "b"
	if v, ok := c.Get("a"); !ok || v != 10 {
		t.Errorf(`Get("a") = (%d, %v), want (10, true)`, v, ok)
	}
	if _, ok := c.Get("b"); ok {
		t.Error(`"b" должен быть вытеснен`)
	}
}

func TestCapacityOne(t *testing.T) {
	c := NewLRU[int, string](1)
	c.Put(1, "one")
	c.Put(2, "two")
	if _, ok := c.Get(1); ok {
		t.Error("1 должен быть вытеснен")
	}
	if v, ok := c.Get(2); !ok || v != "two" {
		t.Errorf("Get(2) = (%q, %v)", v, ok)
	}
}

func TestGetMissing(t *testing.T) {
	c := NewLRU[string, int](3)
	if v, ok := c.Get("nope"); ok || v != 0 {
		t.Errorf("Get(missing) = (%d, %v), want (0, false)", v, ok)
	}
}

func TestPanicsOnBadCapacity(t *testing.T) {
	defer func() {
		if recover() == nil {
			t.Error("NewLRU(0) должен паниковать")
		}
	}()
	NewLRU[string, int](0)
}
