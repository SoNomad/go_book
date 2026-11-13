// Модель слайсов Go для визуализатора SliceViz.
// Формулы роста ёмкости сверены с РЕАЛЬНЫМ выводом Go (см. slice-model.test.ts).

/** Классы размеров аллокатора Go (байты) — ёмкость округляется вверх до ближайшего. */
const SIZE_CLASSES = [
  8, 16, 24, 32, 48, 64, 80, 96, 112, 128, 144, 160, 176, 192, 208, 224, 240, 256, 288, 320, 352, 384, 416, 448,
  480, 512, 576, 640, 704, 768, 896, 1024, 1152, 1280, 1408, 1536, 1792, 2048, 2304, 2688, 3072, 3200, 3456, 4096,
  4864, 5376, 6144, 6528, 6784, 6912, 8192, 9472, 9728, 10240, 10880, 12288, 13568, 14336, 16384, 18432, 19072,
  20480, 21760, 24576, 27264, 28672, 32768,
]

function roundUpSize(bytes: number): number {
  for (const c of SIZE_CLASSES) if (c >= bytes) return c
  return Math.ceil(bytes / 8192) * 8192 // крупные аллокации — кратно странице 8 КиБ
}

/** Новая ёмкость при append, когда старой не хватает (для []int, элемент 8 байт). */
export function growCap(oldCap: number, newLen: number, elemSize = 8): number {
  let newcap = oldCap
  const doublecap = newcap * 2
  if (newLen > doublecap) newcap = newLen
  else if (oldCap < 256) newcap = doublecap
  else while (newcap < newLen) newcap += Math.floor((newcap + 768) / 4)
  return Math.floor(roundUpSize(newcap * elemSize) / elemSize)
}

export interface Arr {
  id: number
  cells: (number | null)[] // длина = ёмкость массива; null — «ещё не записано»
}
export interface Slice {
  name: string
  arr: number
  off: number
  len: number
  cap: number
}
export interface World {
  arrays: Arr[]
  slices: Slice[]
  nextArr: number
}
export interface Result {
  world: World
  message: string
}

export function initialWorld(): World {
  return { arrays: [{ id: 1, cells: [1, 2, 3] }], slices: [{ name: 'a', arr: 1, off: 0, len: 3, cap: 3 }], nextArr: 2 }
}

const clone = (w: World): World => ({
  arrays: w.arrays.map((a) => ({ ...a, cells: [...a.cells] })),
  slices: w.slices.map((s) => ({ ...s })),
  nextArr: w.nextArr,
})
const find = (w: World, name: string) => w.slices.find((s) => s.name === name)

/** Какие слайсы «видят» ячейку index массива arr (она в пределах их len). */
export function viewers(w: World, arr: number, index: number): string[] {
  return w.slices.filter((s) => s.arr === arr && index >= s.off && index < s.off + s.len).map((s) => s.name)
}

/** dst := src[lo:hi] — общий массив, ёмкость уменьшается на lo. */
export function reslice(w: World, dst: string, src: string, lo: number, hi: number): Result {
  const next = clone(w)
  const s = find(next, src)
  if (!s || lo < 0 || hi < lo || hi > s.cap) return { world: w, message: 'Недопустимые границы среза.' }
  const d: Slice = { name: dst, arr: s.arr, off: s.off + lo, len: hi - lo, cap: s.cap - lo }
  next.slices = next.slices.filter((x) => x.name !== dst).concat(d)
  return {
    world: next,
    message: `${dst} := ${src}[${lo}:${hi}] — НЕ копия: ${dst} смотрит в тот же массив (len=${d.len}, cap=${d.cap}).`,
  }
}

/** name = append(name, value) */
export function append(w: World, name: string, value: number): Result {
  const next = clone(w)
  const s = find(next, name)
  if (!s) return { world: w, message: `Слайса ${name} нет.` }
  const arr = next.arrays.find((a) => a.id === s.arr)!

  if (s.len < s.cap) {
    const idx = s.off + s.len
    const overwritten = arr.cells[idx]
    arr.cells[idx] = value
    s.len++
    const seen = viewers(next, s.arr, idx).filter((n) => n !== name)
    const extra = seen.length ? ` Изменение видят и другие слайсы: ${seen.join(', ')}.` : ''
    const over = overwritten !== null ? ` Затёрто значение ${overwritten}.` : ''
    return {
      world: next,
      message: `append(${name}, ${value}): len < cap — записано в общий массив, новый массив не создавался.${over}${extra}`,
    }
  }

  const newCap = growCap(s.cap, s.len + 1)
  const cells: (number | null)[] = new Array(newCap).fill(null)
  for (let i = 0; i < s.len; i++) cells[i] = arr.cells[s.off + i]
  cells[s.len] = value
  const id = next.nextArr++
  next.arrays.push({ id, cells })
  s.arr = id
  s.off = 0
  s.len++
  s.cap = newCap
  return {
    world: next,
    message: `append(${name}, ${value}): cap исчерпана — выделен НОВЫЙ массив (cap ${newCap}), данные скопированы, ${name} отвязался от старого.`,
  }
}

/** name[index] = value */
export function setAt(w: World, name: string, index: number, value: number): Result {
  const next = clone(w)
  const s = find(next, name)
  if (!s || index < 0 || index >= s.len) return { world: w, message: 'Индекс вне len.' }
  const arr = next.arrays.find((a) => a.id === s.arr)!
  arr.cells[s.off + index] = value
  const others = viewers(next, s.arr, s.off + index).filter((n) => n !== name)
  return {
    world: next,
    message: `${name}[${index}] = ${value}.${others.length ? ` Это ячейка общего массива — изменение видят: ${others.join(', ')}.` : ' Других слайсов на эту ячейку нет.'}`,
  }
}
