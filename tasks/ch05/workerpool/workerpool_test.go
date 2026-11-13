package workerpool

import (
	"context"
	"errors"
	"math/rand"
	"slices"
	"sync/atomic"
	"testing"
	"time"
)

func TestOrderPreserved(t *testing.T) {
	jobs := make([]int, 100)
	for i := range jobs {
		jobs[i] = i
	}
	fn := func(ctx context.Context, j int) (int, error) {
		// случайная задержка перемешивает порядок завершения
		time.Sleep(time.Duration(rand.Intn(3)) * time.Millisecond)
		return j * 2, nil
	}
	got, err := ProcessAll(context.Background(), jobs, 8, fn)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != len(jobs) {
		t.Fatalf("len(results) = %d, want %d", len(got), len(jobs))
	}
	for i, v := range got {
		if v != jobs[i]*2 {
			t.Fatalf("results[%d] = %d, want %d", i, v, jobs[i]*2)
		}
	}
}

func TestConcurrencyIsBounded(t *testing.T) {
	const workers = 3
	var inFlight, maxInFlight atomic.Int32
	fn := func(ctx context.Context, j int) (int, error) {
		cur := inFlight.Add(1)
		for {
			old := maxInFlight.Load()
			if cur <= old || maxInFlight.CompareAndSwap(old, cur) {
				break
			}
		}
		time.Sleep(5 * time.Millisecond)
		inFlight.Add(-1)
		return j, nil
	}
	jobs := make([]int, 30)
	if _, err := ProcessAll(context.Background(), jobs, workers, fn); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if m := maxInFlight.Load(); m > workers {
		t.Errorf("одновременно работало %d задач, лимит %d", m, workers)
	} else if m < 2 {
		t.Errorf("задачи не выполнялись параллельно (max in flight = %d)", m)
	}
}

func TestFirstErrorStopsEverything(t *testing.T) {
	errBoom := errors.New("boom")
	var calls atomic.Int32
	fn := func(ctx context.Context, j int) (int, error) {
		calls.Add(1)
		time.Sleep(2 * time.Millisecond)
		if j == 5 {
			return 0, errBoom
		}
		return j, nil
	}
	jobs := make([]int, 200)
	for i := range jobs {
		jobs[i] = i
	}
	got, err := ProcessAll(context.Background(), jobs, 4, fn)
	if !errors.Is(err, errBoom) {
		t.Fatalf("error = %v, want boom", err)
	}
	if got != nil {
		t.Errorf("results must be nil on error, got len %d", len(got))
	}
	if n := calls.Load(); n >= int32(len(jobs)) {
		t.Errorf("после ошибки новые задачи не должны стартовать: вызовов %d из %d", n, len(jobs))
	}
}

func TestContextCancelDoesNotHang(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	fn := func(ctx context.Context, j int) (int, error) {
		<-ctx.Done() // «вечная» задача, прерывается только отменой
		return 0, ctx.Err()
	}
	go func() {
		time.Sleep(20 * time.Millisecond)
		cancel()
	}()

	done := make(chan error, 1)
	go func() {
		_, err := ProcessAll(ctx, []int{1, 2, 3, 4, 5, 6}, 2, fn)
		done <- err
	}()
	select {
	case err := <-done:
		if !errors.Is(err, context.Canceled) {
			t.Errorf("error = %v, want context.Canceled", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("ProcessAll завис после отмены контекста")
	}
}

func TestAlreadyCancelledContext(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	var calls atomic.Int32
	fn := func(ctx context.Context, j int) (int, error) {
		calls.Add(1)
		return j, nil
	}
	_, err := ProcessAll(ctx, []int{1, 2, 3}, 2, fn)
	if !errors.Is(err, context.Canceled) {
		t.Errorf("error = %v, want context.Canceled", err)
	}
}

func TestEmptyAndWorkersClamp(t *testing.T) {
	fn := func(ctx context.Context, j int) (int, error) { return j + 1, nil }

	got, err := ProcessAll(context.Background(), nil, 4, fn)
	if err != nil || len(got) != 0 {
		t.Errorf("empty: got (%v, %v)", got, err)
	}
	got, err = ProcessAll(context.Background(), []int{1, 2, 3}, 0, fn)
	if err != nil || !slices.Equal(got, []int{2, 3, 4}) {
		t.Errorf("workers=0: got (%v, %v)", got, err)
	}
}
