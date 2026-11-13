// Лёгкий «стеммер» для русского: отрезает типичные окончания, чтобы запрос «горутина»
// находил «горутины», «горутину», «горутинами». Применяется и при построении индекса поиска,
// и при разборе запроса пользователя (должен быть ОДИНАКОВЫМ в обоих местах).

const SUFFIXES = [
  'ировать', 'ования', 'ование', 'ениях', 'ении', 'ения', 'ение', 'ости', 'ость',
  'ыми', 'ими', 'ого', 'его', 'ому', 'ему', 'ами', 'ями', 'ать', 'ять', 'ить', 'еть',
  'уть', 'ует', 'уют', 'ает', 'ают', 'ов', 'ев', 'ей', 'ом', 'ем', 'ах', 'ях', 'ий',
  'ый', 'ой', 'ая', 'яя', 'ое', 'ее', 'ие', 'ые', 'ую', 'юю',
  'ы', 'и', 'а', 'я', 'у', 'ю', 'е', 'о', 'ь',
].sort((a, b) => b.length - a.length)

const CYRILLIC = /[а-яё]/

export function stemRu(word: string): string {
  if (word.length <= 4) return word
  for (const s of SUFFIXES) {
    if (word.endsWith(s) && word.length - s.length >= 3) return word.slice(0, -s.length)
  }
  return word
}

/** processTerm для MiniSearch: нижний регистр + стемминг только для кириллических слов. */
export function ruTerm(term: string): string {
  const t = term.toLowerCase()
  return CYRILLIC.test(t) ? stemRu(t) : t
}
