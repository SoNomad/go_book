<script setup lang="ts">
import { ref } from 'vue'
import { append, initialWorld, reslice, setAt, viewers, type Result, type Slice, type World } from '../lib/slice-model'

const world = ref<World>(initialWorld())
const log = ref<string[]>(['a := []int{1, 2, 3} — len = 3, cap = 3.'])
let counter = 99

const apply = (r: Result) => {
  world.value = r.world
  log.value = [r.message, ...log.value].slice(0, 6)
}
const has = (name: string) => world.value.slices.some((s) => s.name === name)
const doReslice = () => apply(reslice(world.value, 'b', 'a', 0, 2))
const doAppend = (name: string) => apply(append(world.value, name, counter++))
const doSet = () => apply(setAt(world.value, 'b', 0, -1))
const reset = () => {
  world.value = initialWorld()
  log.value = ['Сброс: a := []int{1, 2, 3}.']
  counter = 99
}

const slicesOn = (arrId: number): Slice[] => world.value.slices.filter((s) => s.arr === arrId)
const isShared = (arrId: number, i: number) => viewers(world.value, arrId, i).length > 1
const orphan = (arrId: number) => slicesOn(arrId).length === 0
const color = (name: string) => (name === 'a' ? 'var(--viz-service)' : 'var(--viz-external)')
</script>

<template>
  <div class="viz">
    <div class="viz-head"><span class="tag">Интерактив</span>Слайс = окно над массивом (len, cap, общая память)</div>
    <div class="viz-body">
      <p class="sv-hint">Попробуйте по порядку: <code>b := a[:2]</code> → <code>append(b, …)</code> → ещё раз <code>append(b, …)</code> → <code>b[0] = -1</code>. Смотрите, кто видит изменения.</p>

      <table>
        <thead><tr><th>слайс</th><th>указывает на</th><th>len</th><th>cap</th></tr></thead>
        <tbody>
          <tr v-for="s in world.slices" :key="s.name">
            <td><strong :style="{ color: color(s.name) }">{{ s.name }}</strong></td>
            <td>массив #{{ s.arr }}, с элемента [{{ s.off }}]</td>
            <td>{{ s.len }}</td>
            <td>{{ s.cap }}</td>
          </tr>
        </tbody>
      </table>

      <div v-for="arr in world.arrays" :key="arr.id" class="sv-arr">
        <div class="sv-label">
          Массив #{{ arr.id }} (ёмкость {{ arr.cells.length }})
          <em v-if="orphan(arr.id)"> — на него больше никто не смотрит: сборщик мусора заберёт</em>
        </div>
        <div class="sv-grid" :style="{ gridTemplateColumns: `repeat(${arr.cells.length}, minmax(38px, 1fr))` }">
          <div
            v-for="(c, i) in arr.cells"
            :key="i"
            class="sv-cell"
            :class="{ empty: c === null, shared: isShared(arr.id, i) }"
            :style="{ gridRow: 1, gridColumn: i + 1 }"
          >
            {{ c ?? '·' }}<small>[{{ i }}]</small>
          </div>
          <div
            v-for="(s, k) in slicesOn(arr.id)"
            :key="s.name"
            class="sv-bar"
            :style="{ gridRow: 2 + k, gridColumn: `${s.off + 1} / span ${s.cap}`, borderColor: color(s.name) }"
          >
            <span class="sv-len" :style="{ width: (s.len / s.cap) * 100 + '%', background: color(s.name) }">{{ s.name }}</span>
            <span class="sv-cap">cap</span>
          </div>
        </div>
      </div>

      <div class="viz-controls">
        <button class="viz-btn" type="button" @click="doReslice">b := a[:2]</button>
        <button class="viz-btn" type="button" @click="doAppend('a')">append(a, …)</button>
        <button class="viz-btn" type="button" :disabled="!has('b')" @click="doAppend('b')">append(b, …)</button>
        <button class="viz-btn" type="button" :disabled="!has('b')" @click="doSet">b[0] = -1</button>
        <button class="viz-btn" type="button" @click="reset">Сбросить</button>
      </div>

      <div class="viz-note" aria-live="polite">
        <div v-for="(m, i) in log" :key="i" :style="{ opacity: i === 0 ? 1 : 0.6, fontWeight: i === 0 ? 600 : 400 }">{{ m }}</div>
      </div>
      <p class="sv-foot">Модель роста ёмкости сверена с реальным выводом Go (×2 до 256, затем ≈ ×1,25 и выравнивание по классам размеров). Точные числа зависят от версии Go.</p>
    </div>
  </div>
</template>

<style scoped>
.sv-hint {
  margin: 0 0 10px;
  font-size: 14px;
}
.sv-arr {
  margin-top: 14px;
}
.sv-label {
  margin-bottom: 4px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}
.sv-grid {
  display: grid;
  gap: 4px 4px;
  min-width: max-content;
}
.sv-cell {
  padding: 6px 2px 2px;
  text-align: center;
  border: 1px solid var(--vp-c-text-3);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-family: var(--vp-font-family-mono);
  font-weight: 600;
}
.sv-cell small {
  display: block;
  font-size: 10px;
  font-weight: 400;
  color: var(--vp-c-text-3);
}
.sv-cell.empty {
  color: var(--vp-c-text-3);
  border-style: dashed;
}
.sv-cell.shared {
  box-shadow: 0 0 0 2px var(--viz-data);
}
.sv-bar {
  display: flex;
  height: 22px;
  border: 2px dashed;
  border-radius: 6px;
  overflow: hidden;
  font-size: 12px;
}
.sv-len {
  display: flex;
  align-items: center;
  padding-left: 8px;
  color: #fff;
  font-weight: 700;
}
.sv-cap {
  margin-left: auto;
  padding-right: 6px;
  align-self: center;
  color: var(--vp-c-text-3);
}
.sv-foot {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--vp-c-text-3);
}
</style>
