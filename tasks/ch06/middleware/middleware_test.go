package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"
)

func TestChainOrder(t *testing.T) {
	var trace []string
	mw := func(name string) Middleware {
		return func(next http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				trace = append(trace, name+">")
				next.ServeHTTP(w, r)
				trace = append(trace, "<"+name)
			})
		}
	}
	h := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		trace = append(trace, "handler")
	})

	Chain(h, mw("A"), mw("B"), mw("C")).ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("GET", "/", nil))

	want := []string{"A>", "B>", "C>", "handler", "<C", "<B", "<A"}
	if !slices.Equal(trace, want) {
		t.Errorf("order = %v\nwant    %v", trace, want)
	}
}

func TestChainWithoutMiddleware(t *testing.T) {
	called := false
	h := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { called = true })
	Chain(h).ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("GET", "/", nil))
	if !called {
		t.Error("handler was not called")
	}
}

func TestRecover(t *testing.T) {
	boom := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { panic("kaboom") })
	h := Recover(boom)

	for i := 0; i < 2; i++ { // «сервер» переживает панику и отвечает на следующий запрос
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest("GET", "/", nil))

		if rec.Code != http.StatusInternalServerError {
			t.Fatalf("status = %d, want 500", rec.Code)
		}
		if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
			t.Errorf("Content-Type = %q", ct)
		}
		var body map[string]string
		if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil || body["error"] != "internal server error" {
			t.Errorf("body = %q, want {\"error\":\"internal server error\"}", rec.Body.String())
		}
	}
}

func TestRecoverPassesNormalResponses(t *testing.T) {
	ok := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTeapot)
	})
	rec := httptest.NewRecorder()
	Recover(ok).ServeHTTP(rec, httptest.NewRequest("GET", "/", nil))
	if rec.Code != http.StatusTeapot {
		t.Errorf("status = %d, want 418", rec.Code)
	}
}

func TestRequestIDGenerated(t *testing.T) {
	var seenInHandler string
	h := RequestID(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seenInHandler = RequestIDFromContext(r.Context())
	}))

	rec1 := httptest.NewRecorder()
	h.ServeHTTP(rec1, httptest.NewRequest("GET", "/", nil))
	id1 := rec1.Header().Get("X-Request-ID")
	if len(id1) != 16 {
		t.Fatalf("generated id %q: want 16 hex chars", id1)
	}
	if seenInHandler != id1 {
		t.Errorf("context id = %q, header id = %q: должны совпадать", seenInHandler, id1)
	}

	rec2 := httptest.NewRecorder()
	h.ServeHTTP(rec2, httptest.NewRequest("GET", "/", nil))
	if id2 := rec2.Header().Get("X-Request-ID"); id2 == id1 {
		t.Errorf("два запроса получили одинаковый id %q", id1)
	}
}

func TestRequestIDPassthrough(t *testing.T) {
	var seen string
	h := RequestID(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen = RequestIDFromContext(r.Context())
	}))
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("X-Request-ID", "abc-123")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if got := rec.Header().Get("X-Request-ID"); got != "abc-123" {
		t.Errorf("response header = %q, want abc-123", got)
	}
	if seen != "abc-123" {
		t.Errorf("context id = %q, want abc-123", seen)
	}
}

func TestRequestIDFromEmptyContext(t *testing.T) {
	if got := RequestIDFromContext(context.Background()); got != "" {
		t.Errorf("got %q, want empty", got)
	}
}
