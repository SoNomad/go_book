package textutil

import "testing"

func TestReverseRunes(t *testing.T) {
	tests := []struct{ in, want string }{
		{"", ""},
		{"a", "a"},
		{"abc", "cba"},
		{"Привет", "тевирП"},
		{"Hello, 世界", "界世 ,olleH"},
	}
	for _, tt := range tests {
		if got := ReverseRunes(tt.in); got != tt.want {
			t.Errorf("ReverseRunes(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}

func TestIsPalindrome(t *testing.T) {
	tests := []struct {
		in   string
		want bool
	}{
		{"", true},
		{"a", true},
		{"level", true},
		{"Level", true},
		{"hello", false},
		{"А роза упала на лапу Азора", true},
		{"A man, a plan, a canal: Panama", true},
		{"12321", true},
		{"12345", false},
	}
	for _, tt := range tests {
		if got := IsPalindrome(tt.in); got != tt.want {
			t.Errorf("IsPalindrome(%q) = %v, want %v", tt.in, got, tt.want)
		}
	}
}
