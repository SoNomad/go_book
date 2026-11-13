package shapes

import (
	"math"
	"testing"
)

func almostEqual(t *testing.T, what string, got, want float64) {
	t.Helper()
	if math.Abs(got-want) > 1e-9 {
		t.Errorf("%s = %v, want %v", what, got, want)
	}
}

func TestRect(t *testing.T) {
	r := Rect{W: 3, H: 4}
	almostEqual(t, "Rect.Area", r.Area(), 12)
	almostEqual(t, "Rect.Perimeter", r.Perimeter(), 14)
}

func TestCircle(t *testing.T) {
	c := Circle{R: 2}
	almostEqual(t, "Circle.Area", c.Area(), math.Pi*4)
	almostEqual(t, "Circle.Perimeter", c.Perimeter(), 4*math.Pi)
}

func TestTotalArea(t *testing.T) {
	almostEqual(t, "empty", TotalArea(nil), 0)
	got := TotalArea([]Shape{Rect{2, 3}, Circle{1}})
	almostEqual(t, "mixed", got, 6+math.Pi)
}

func TestLargest(t *testing.T) {
	if got := Largest(nil); got != nil {
		t.Errorf("Largest(nil) = %v, want nil", got)
	}
	shapes := []Shape{Rect{1, 1}, Circle{2}, Rect{2, 2}}
	if got := Largest(shapes); got != Shape(Circle{2}) {
		t.Errorf("Largest = %v, want Circle{2}", got)
	}
}
