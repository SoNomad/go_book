package textutil

import "unicode"

func ReverseRunes(s string) string {
	r := []rune(s)
	for i, j := 0, len(r)-1; i < j; i, j = i+1, j-1 {
		r[i], r[j] = r[j], r[i]
	}
	return string(r)
}

func IsPalindrome(s string) bool {
	var clean []rune
	for _, r := range s {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			clean = append(clean, unicode.ToLower(r))
		}
	}
	for i, j := 0, len(clean)-1; i < j; i, j = i+1, j-1 {
		if clean[i] != clean[j] {
			return false
		}
	}
	return true
}
