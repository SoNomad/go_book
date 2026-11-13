package workerpool

import (
	"context"
	"sync"
)

func ProcessAll(
	ctx context.Context,
	jobs []int,
	workers int,
	fn func(ctx context.Context, job int) (int, error),
) ([]int, error) {
	if workers < 1 {
		workers = 1
	}
	results := make([]int, len(jobs))
	if len(jobs) == 0 {
		return results, ctx.Err()
	}

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	var (
		wg       sync.WaitGroup
		once     sync.Once
		firstErr error
	)
	fail := func(err error) {
		once.Do(func() {
			firstErr = err
			cancel() // сигнал остальным: останавливаемся
		})
	}

	indexes := make(chan int)
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range indexes {
				if ctx.Err() != nil {
					continue // осушаем канал, но работу не начинаем
				}
				res, err := fn(ctx, jobs[i])
				if err != nil {
					fail(err)
					continue
				}
				results[i] = res // индекс уникален для задачи — гонки нет
			}
		}()
	}

feed:
	for i := range jobs {
		select {
		case indexes <- i:
		case <-ctx.Done():
			break feed
		}
	}
	close(indexes)
	wg.Wait() // все воркеры завершены: гонок и утечек нет

	if firstErr != nil {
		return nil, firstErr
	}
	// Ошибок от fn нет, но родительский контекст могли отменить снаружи.
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	return results, nil
}
