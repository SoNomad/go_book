// Package stats — задача главы 1: несколько возвращаемых значений и ошибки.
package stats

import "errors"

// ErrEmpty возвращается, когда на вход пришёл пустой слайс.
var ErrEmpty = errors.New("stats: empty input")

// Stats возвращает минимум, максимум и среднее арифметическое.
// Для пустого (или nil) слайса возвращает ошибку ErrEmpty.
//
// Подсказки: цикл for range; float64(sum) / float64(len(nums)).
func Stats(nums []int) (minV, maxV int, avg float64, err error) {
	// TODO: реализуйте
	return 0, 0, 0, nil
}
