package parsum

import "sync"

func ParallelSum(nums []int, workers int) int {
	if len(nums) == 0 {
		return 0
	}
	if workers < 1 {
		workers = 1
	}
	if workers > len(nums) {
		workers = len(nums)
	}
	chunk := (len(nums) + workers - 1) / workers
	partial := make([]int, workers)

	var wg sync.WaitGroup
	for i := 0; i < workers; i++ {
		lo := i * chunk
		if lo >= len(nums) {
			break
		}
		hi := min(lo+chunk, len(nums))
		wg.Add(1)
		go func() {
			defer wg.Done()
			s := 0
			for _, v := range nums[lo:hi] {
				s += v
			}
			partial[i] = s // у каждой горутины своя ячейка — гонки нет
		}()
	}
	wg.Wait()

	total := 0
	for _, s := range partial {
		total += s
	}
	return total
}
