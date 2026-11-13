// Package todoapi — задача главы 6: REST API на net/http с in-memory хранилищем.
package todoapi

import "net/http"

// Todo — JSON-представление задачи.
type Todo struct {
	ID    int    `json:"id"`
	Title string `json:"title"`
	Done  bool   `json:"done"`
}

// NewHandler возвращает http.Handler с собственным (не глобальным!)
// in-memory хранилищем. Реализуйте маршруты (Go 1.22+ ServeMux):
//
//	POST   /todos        тело {"title":"..."}        -> 201, заголовок Location: /todos/{id}, тело — созданный Todo
//	GET    /todos        ?done=true|false (опц.)     -> 200, JSON-массив (пустой — это [], а не null), по возрастанию id
//	GET    /todos/{id}                               -> 200 | 404
//	PATCH  /todos/{id}   тело {"title":"..","done":true}, поля опциональны -> 200 | 404
//	DELETE /todos/{id}                               -> 204 | 404
//
// Правила:
//   - ID — целые числа, начиная с 1, выдаёт сервер; нечисловой id -> 400;
//   - title обязателен: пустой или из одних пробелов -> 400 (в PATCH — если передан);
//   - невалидный JSON, неизвестные поля в теле (DisallowUnknownFields) -> 400;
//   - параметр done не true/false -> 400;
//   - все ошибки — JSON вида {"error":"сообщение"} с Content-Type: application/json;
//   - неподходящий метод (PUT /todos) -> 405: ServeMux сделает это сам, если вы
//     регистрируете маршруты с методами;
//   - хранилище защищено мьютексом: тесты запускаются с -race.
//
// Подсказки: http.NewServeMux, mux.HandleFunc("GET /todos/{id}", ...),
// r.PathValue("id"), json.NewDecoder(r.Body), указатели *string/*bool для PATCH.
func NewHandler() http.Handler {
	mux := http.NewServeMux()
	// TODO: зарегистрируйте маршруты
	return mux
}
