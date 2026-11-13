// Package workerpool — задача главы 5 (🔴): воркер-пул с отменой и ошибками.
package workerpool

import "context"

// ProcessAll применяет fn ко всем jobs, используя не более `workers`
// одновременно работающих горутин.
//
// Требования:
//  1. results[i] соответствует jobs[i] — порядок сохраняется, даже если задачи
//     завершаются в другом порядке;
//  2. одновременно выполняется не более `workers` вызовов fn
//     (workers <= 0 трактуется как 1);
//  3. при первой ошибке fn: остальные запущенные вызовы получают отменённый
//     контекст, НОВЫЕ задачи больше не стартуют, ProcessAll возвращает
//     (nil, эту первую ошибку);
//  4. если ctx отменён снаружи — ProcessAll возвращает (nil, ctx.Err())
//     и НЕ зависает;
//  5. пустой jobs -> (пустой результат, nil);
//  6. не оставляет после себя горутин (все воркеры завершены к моменту return).
//
// Подсказки: канал индексов `chan int`; context.WithCancel; sync.WaitGroup;
// sync.Once для «запомнить первую ошибку и вызвать cancel»;
// перед запуском очередной задачи проверяйте ctx.Err().
// Запускайте тесты с -race.
func ProcessAll(
	ctx context.Context,
	jobs []int,
	workers int,
	fn func(ctx context.Context, job int) (int, error),
) ([]int, error) {
	// TODO: реализуйте
	return nil, nil
}
