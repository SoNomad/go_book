// Package shapes — задача главы 3: интерфейсы и методы.
package shapes

// Shape — геометрическая фигура. Интерфейс реализуется НЕЯВНО:
// любой тип с такими методами — Shape, ключевого слова implements нет.
type Shape interface {
	Area() float64
	Perimeter() float64
}

// Rect — прямоугольник.
type Rect struct{ W, H float64 }

// Circle — круг.
type Circle struct{ R float64 }

// Проверки на этапе компиляции, что типы-ЗНАЧЕНИЯ реализуют интерфейс.
var (
	_ Shape = Rect{}
	_ Shape = Circle{}
)

// TODO: реализуйте методы с приёмником-значением.
// Для круга используйте math.Pi (не забудьте импортировать "math").

func (r Rect) Area() float64      { return 0 }
func (r Rect) Perimeter() float64 { return 0 }

func (c Circle) Area() float64      { return 0 }
func (c Circle) Perimeter() float64 { return 0 }

// TotalArea возвращает сумму площадей всех фигур.
func TotalArea(shapes []Shape) float64 {
	// TODO: реализуйте
	return 0
}

// Largest возвращает фигуру с наибольшей площадью или nil для пустого слайса.
func Largest(shapes []Shape) Shape {
	// TODO: реализуйте
	return nil
}
