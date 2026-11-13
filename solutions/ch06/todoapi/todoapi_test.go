package todoapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

func do(t *testing.T, h http.Handler, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func decodeTodo(t *testing.T, rec *httptest.ResponseRecorder) Todo {
	t.Helper()
	var td Todo
	if err := json.NewDecoder(rec.Body).Decode(&td); err != nil {
		t.Fatalf("response is not a Todo JSON: %v (body %q)", err, rec.Body.String())
	}
	return td
}

func decodeList(t *testing.T, rec *httptest.ResponseRecorder) []Todo {
	t.Helper()
	var list []Todo
	if err := json.NewDecoder(rec.Body).Decode(&list); err != nil {
		t.Fatalf("response is not a JSON array: %v", err)
	}
	return list
}

func mustCreate(t *testing.T, h http.Handler, title string) Todo {
	t.Helper()
	rec := do(t, h, "POST", "/todos", fmt.Sprintf(`{"title":%q}`, title))
	if rec.Code != http.StatusCreated {
		t.Fatalf("create %q: status %d, body %s", title, rec.Code, rec.Body)
	}
	return decodeTodo(t, rec)
}

func assertErrorJSON(t *testing.T, rec *httptest.ResponseRecorder, wantStatus int) {
	t.Helper()
	if rec.Code != wantStatus {
		t.Fatalf("status = %d, want %d (body %s)", rec.Code, wantStatus, rec.Body)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}
	var e struct {
		Error string `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &e); err != nil || e.Error == "" {
		t.Errorf(`body %q is not {"error":"..."}`, rec.Body.String())
	}
}

func TestCreate(t *testing.T) {
	h := NewHandler()
	rec := do(t, h, "POST", "/todos", `{"title":"buy milk"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201", rec.Code)
	}
	if loc := rec.Header().Get("Location"); loc != "/todos/1" {
		t.Errorf("Location = %q, want /todos/1", loc)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Errorf("Content-Type = %q", ct)
	}
	if got, want := decodeTodo(t, rec), (Todo{ID: 1, Title: "buy milk"}); got != want {
		t.Errorf("got %+v, want %+v", got, want)
	}
	if second := mustCreate(t, h, "walk dog"); second.ID != 2 {
		t.Errorf("second id = %d, want 2", second.ID)
	}
}

func TestCreateValidation(t *testing.T) {
	h := NewHandler()
	bodies := map[string]string{
		"broken json":   `{`,
		"empty body":    ``,
		"empty title":   `{"title":""}`,
		"blank title":   `{"title":"   "}`,
		"missing title": `{}`,
		"unknown field": `{"title":"x","foo":1}`,
	}
	for name, body := range bodies {
		t.Run(name, func(t *testing.T) {
			assertErrorJSON(t, do(t, h, "POST", "/todos", body), http.StatusBadRequest)
		})
	}
}

func TestListEmptyIsArrayNotNull(t *testing.T) {
	rec := do(t, NewHandler(), "GET", "/todos", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if got := strings.TrimSpace(rec.Body.String()); got != "[]" {
		t.Errorf("body = %q, want []", got)
	}
}

func TestListAndFilter(t *testing.T) {
	h := NewHandler()
	mustCreate(t, h, "a")
	mustCreate(t, h, "b")
	mustCreate(t, h, "c")
	do(t, h, "PATCH", "/todos/2", `{"done":true}`)

	all := decodeList(t, do(t, h, "GET", "/todos", ""))
	if len(all) != 3 || all[0].ID != 1 || all[2].ID != 3 {
		t.Fatalf("all = %+v, want 3 items ordered by id", all)
	}
	done := decodeList(t, do(t, h, "GET", "/todos?done=true", ""))
	if len(done) != 1 || done[0].ID != 2 {
		t.Errorf("done=true -> %+v, want only #2", done)
	}
	notDone := decodeList(t, do(t, h, "GET", "/todos?done=false", ""))
	if len(notDone) != 2 {
		t.Errorf("done=false -> %+v, want 2 items", notDone)
	}
	assertErrorJSON(t, do(t, h, "GET", "/todos?done=maybe", ""), http.StatusBadRequest)
}

func TestGetByID(t *testing.T) {
	h := NewHandler()
	created := mustCreate(t, h, "x")

	rec := do(t, h, "GET", "/todos/1", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if got := decodeTodo(t, rec); got != created {
		t.Errorf("got %+v, want %+v", got, created)
	}
	assertErrorJSON(t, do(t, h, "GET", "/todos/999", ""), http.StatusNotFound)
	assertErrorJSON(t, do(t, h, "GET", "/todos/abc", ""), http.StatusBadRequest)
}

func TestPatch(t *testing.T) {
	h := NewHandler()
	mustCreate(t, h, "old")

	rec := do(t, h, "PATCH", "/todos/1", `{"done":true}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if got := decodeTodo(t, rec); got != (Todo{1, "old", true}) {
		t.Errorf("after done patch: %+v", got)
	}

	rec = do(t, h, "PATCH", "/todos/1", `{"title":"new"}`)
	if got := decodeTodo(t, rec); got != (Todo{1, "new", true}) {
		t.Errorf("after title patch (done must be kept): %+v", got)
	}

	rec = do(t, h, "PATCH", "/todos/1", `{"done":false}`)
	if got := decodeTodo(t, rec); got.Done {
		t.Errorf(`{"done":false} must set done=false, got %+v`, got)
	}

	assertErrorJSON(t, do(t, h, "PATCH", "/todos/1", `{"title":""}`), http.StatusBadRequest)
	assertErrorJSON(t, do(t, h, "PATCH", "/todos/1", `{`), http.StatusBadRequest)
	assertErrorJSON(t, do(t, h, "PATCH", "/todos/42", `{"done":true}`), http.StatusNotFound)
}

func TestDelete(t *testing.T) {
	h := NewHandler()
	mustCreate(t, h, "x")

	rec := do(t, h, "DELETE", "/todos/1", "")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204", rec.Code)
	}
	if rec.Body.Len() != 0 {
		t.Errorf("204 must have empty body, got %q", rec.Body)
	}
	assertErrorJSON(t, do(t, h, "DELETE", "/todos/1", ""), http.StatusNotFound)
	assertErrorJSON(t, do(t, h, "GET", "/todos/1", ""), http.StatusNotFound)
}

func TestMethodNotAllowed(t *testing.T) {
	rec := do(t, NewHandler(), "PUT", "/todos", "")
	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("status = %d, want 405", rec.Code)
	}
}

func TestConcurrentCreate(t *testing.T) {
	h := NewHandler()
	const n = 50
	ids := make(chan int, n)
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			ids <- mustCreate(t, h, fmt.Sprintf("todo-%d", i)).ID
		}()
	}
	wg.Wait()
	close(ids)

	seen := map[int]bool{}
	for id := range ids {
		if seen[id] {
			t.Fatalf("duplicate id %d", id)
		}
		seen[id] = true
	}
	if len(decodeList(t, do(t, h, "GET", "/todos", ""))) != n {
		t.Errorf("want %d todos", n)
	}
}
