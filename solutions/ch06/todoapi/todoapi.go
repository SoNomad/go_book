package todoapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"sync"
)

type Todo struct {
	ID    int    `json:"id"`
	Title string `json:"title"`
	Done  bool   `json:"done"`
}

type server struct {
	mu     sync.Mutex
	nextID int
	todos  map[int]Todo
}

func NewHandler() http.Handler {
	s := &server{nextID: 1, todos: make(map[int]Todo)}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /todos", s.create)
	mux.HandleFunc("GET /todos", s.list)
	mux.HandleFunc("GET /todos/{id}", s.get)
	mux.HandleFunc("PATCH /todos/{id}", s.patch)
	mux.HandleFunc("DELETE /todos/{id}", s.delete)
	return mux
}

// --- helpers ---

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func decodeBody(r *http.Request, dst any) error {
	dec := json.NewDecoder(http.MaxBytesReader(nil, r.Body, 1<<20))
	dec.DisallowUnknownFields()
	return dec.Decode(dst)
}

func parseID(w http.ResponseWriter, r *http.Request) (int, bool) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "id must be an integer")
		return 0, false
	}
	return id, true
}

// --- handlers ---

func (s *server) create(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Title string `json:"title"`
	}
	if err := decodeBody(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if strings.TrimSpace(in.Title) == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}

	s.mu.Lock()
	td := Todo{ID: s.nextID, Title: in.Title}
	s.nextID++
	s.todos[td.ID] = td
	s.mu.Unlock()

	w.Header().Set("Location", fmt.Sprintf("/todos/%d", td.ID))
	writeJSON(w, http.StatusCreated, td)
}

func (s *server) list(w http.ResponseWriter, r *http.Request) {
	var filter *bool
	if raw := r.URL.Query().Get("done"); raw != "" {
		b, err := strconv.ParseBool(raw)
		if err != nil || (raw != "true" && raw != "false") {
			writeError(w, http.StatusBadRequest, "done must be true or false")
			return
		}
		filter = &b
	}

	s.mu.Lock()
	out := make([]Todo, 0, len(s.todos))
	for _, td := range s.todos {
		if filter == nil || td.Done == *filter {
			out = append(out, td)
		}
	}
	s.mu.Unlock()

	slices.SortFunc(out, func(a, b Todo) int { return a.ID - b.ID })
	writeJSON(w, http.StatusOK, out)
}

func (s *server) get(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	s.mu.Lock()
	td, found := s.todos[id]
	s.mu.Unlock()
	if !found {
		writeError(w, http.StatusNotFound, "todo not found")
		return
	}
	writeJSON(w, http.StatusOK, td)
}

func (s *server) patch(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	var in struct {
		Title *string `json:"title"`
		Done  *bool   `json:"done"`
	}
	if err := decodeBody(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if in.Title != nil && strings.TrimSpace(*in.Title) == "" {
		writeError(w, http.StatusBadRequest, "title must not be empty")
		return
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	td, found := s.todos[id]
	if !found {
		writeError(w, http.StatusNotFound, "todo not found")
		return
	}
	if in.Title != nil {
		td.Title = *in.Title
	}
	if in.Done != nil {
		td.Done = *in.Done
	}
	s.todos[id] = td
	writeJSON(w, http.StatusOK, td)
}

func (s *server) delete(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	s.mu.Lock()
	_, found := s.todos[id]
	delete(s.todos, id)
	s.mu.Unlock()
	if !found {
		writeError(w, http.StatusNotFound, "todo not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
