package stats

import "errors"

var ErrEmpty = errors.New("stats: empty input")

func Stats(nums []int) (minV, maxV int, avg float64, err error) {
	if len(nums) == 0 {
		return 0, 0, 0, ErrEmpty
	}
	minV, maxV = nums[0], nums[0]
	sum := 0
	for _, n := range nums {
		if n < minV {
			minV = n
		}
		if n > maxV {
			maxV = n
		}
		sum += n
	}
	return minV, maxV, float64(sum) / float64(len(nums)), nil
}
