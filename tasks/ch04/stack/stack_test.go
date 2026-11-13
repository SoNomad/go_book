package stack

import "testing"

func TestStackLIFO(t *testing.T) {
	var s Stack[int] // нулевое значение должно работать
	if s.Len() != 0 {
		t.Fatalf("new stack Len = %d, want 0", s.Len())
	}
	for _, v := range []int{1, 2, 3} {
		s.Push(v)
	}
	if s.Len() != 3 {
		t.Fatalf("Len = %d, want 3", s.Len())
	}
	if v, ok := s.Peek(); !ok || v != 3 {
		t.Fatalf("Peek = (%d, %v), want (3, true)", v, ok)
	}
	if s.Len() != 3 {
		t.Fatalf("Peek must not remove: Len = %d", s.Len())
	}
	for _, want := range []int{3, 2, 1} {
		if v, ok := s.Pop(); !ok || v != want {
			t.Fatalf("Pop = (%d, %v), want (%d, true)", v, ok, want)
		}
	}
	if v, ok := s.Pop(); ok || v != 0 {
		t.Fatalf("Pop on empty = (%d, %v), want (0, false)", v, ok)
	}
	if v, ok := s.Peek(); ok || v != 0 {
		t.Fatalf("Peek on empty = (%d, %v), want (0, false)", v, ok)
	}
}

func TestStackOfStrings(t *testing.T) {
	var s Stack[string]
	s.Push("a")
	s.Push("b")
	if v, _ := s.Pop(); v != "b" {
		t.Fatalf("Pop = %q, want b", v)
	}
}

func TestStackReusableAfterEmpty(t *testing.T) {
	var s Stack[int]
	s.Push(1)
	s.Pop()
	s.Push(2)
	if v, ok := s.Pop(); !ok || v != 2 {
		t.Fatalf("Pop = (%d, %v), want (2, true)", v, ok)
	}
}
