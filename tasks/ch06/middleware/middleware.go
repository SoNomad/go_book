// Package middleware — задача главы 6: цепочки http.Handler.
package middleware

import (
	"context"
	"net/http"
)

// Middleware — функция-обёртка над обработчиком (аналог HttpInterceptor).
type Middleware func(http.Handler) http.Handler

// Chain оборачивает h переданными middleware так, что ПЕРВЫЙ в списке
// становится САМЫМ ВНЕШНИМ: Chain(h, A, B) выполняется как A -> B -> h -> B -> A.
func Chain(h http.Handler, mws ...Middleware) http.Handler {
	// TODO: реализуйте
	return h
}

// Recover перехватывает панику в обработчике и отвечает
// 500 с JSON {"error":"internal server error"} (Content-Type: application/json),
// вместо того чтобы оборвать соединение. Сервер продолжает обслуживать запросы.
//
// Подсказки: defer + recover(). В реальном коде панику http.ErrAbortHandler
// нужно пробросить дальше (panic(rec)) — так делает и net/http.
func Recover(next http.Handler) http.Handler {
	// TODO: реализуйте
	return next
}

// RequestID гарантирует, что у каждого запроса есть идентификатор:
//   - если пришёл заголовок X-Request-ID — используется он;
//   - иначе генерируется случайный (16 hex-символов: crypto/rand + hex);
//   - значение пишется в заголовок ОТВЕТА X-Request-ID и кладётся в context
//     запроса (r.WithContext) — достать его можно через RequestIDFromContext.
//
// Подсказка: для ключа контекста заведите собственный неэкспортируемый тип
// (type ctxKey struct{}), чтобы не столкнуться с чужими ключами.
func RequestID(next http.Handler) http.Handler {
	// TODO: реализуйте
	return next
}

// RequestIDFromContext возвращает идентификатор запроса или "" если его нет.
func RequestIDFromContext(ctx context.Context) string {
	// TODO: реализуйте
	return ""
}
