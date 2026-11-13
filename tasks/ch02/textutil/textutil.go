// Package textutil — задача главы 2: строки, байты и руны.
package textutil

// ReverseRunes переворачивает строку по РУНАМ (а не по байтам!):
// "Привет" -> "тевирП", "Hello, 世界" -> "界世 ,olleH".
//
// Подсказка: []rune(s) и обмен элементов с двух концов.
func ReverseRunes(s string) string {
	// TODO: реализуйте
	return s
}

// IsPalindrome сообщает, является ли строка палиндромом, игнорируя регистр
// и все символы, кроме букв и цифр.
// "А роза упала на лапу Азора" -> true; "hello" -> false; "" -> true.
//
// Подсказки: unicode.IsLetter, unicode.IsDigit, unicode.ToLower.
func IsPalindrome(s string) bool {
	// TODO: реализуйте
	return false
}
