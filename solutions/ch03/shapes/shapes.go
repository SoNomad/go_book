package shapes

import "math"

type Shape interface {
	Area() float64
	Perimeter() float64
}

type Rect struct{ W, H float64 }

type Circle struct{ R float64 }

var (
	_ Shape = Rect{}
	_ Shape = Circle{}
)

func (r Rect) Area() float64      { return r.W * r.H }
func (r Rect) Perimeter() float64 { return 2 * (r.W + r.H) }

func (c Circle) Area() float64      { return math.Pi * c.R * c.R }
func (c Circle) Perimeter() float64 { return 2 * math.Pi * c.R }

func TotalArea(shapes []Shape) float64 {
	var sum float64
	for _, s := range shapes {
		sum += s.Area()
	}
	return sum
}

func Largest(shapes []Shape) Shape {
	var best Shape
	for _, s := range shapes {
		if best == nil || s.Area() > best.Area() {
			best = s
		}
	}
	return best
}
