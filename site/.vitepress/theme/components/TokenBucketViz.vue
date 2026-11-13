<script setup lang="ts">
import { ref, watch } from 'vue'
import { TokenBucket } from '../lib/limiters'

const capacity = ref(3)
const rate = ref(1)

let t = 0 // «часы» в миллисекундах — перематываем без ожидания
let bucket = new TokenBucket(capacity.value, rate.value, () => t)
const tokens = ref(bucket.tokens)
const clock = ref(0)
const log = ref<string[]>([])

const stamp = () => (t / 1000).toFixed(1) + ' с'
const sync = () => {
  tokens.value = bucket.tokens
  clock.value = t
}
const push = (m: string) => (log.value = [m, ...log.value].slice(0, 7))

function request() {
  const ok = bucket.allow()
  sync()
  push(`${stamp()}: запрос → ${ok ? '✓ пропущен' : '✗ 429 Too Many Requests'}`)
}
function wait(ms: number) {
  t += ms
  bucket.refill()
  sync()
  push(`${stamp()}: прошло ${ms / 1000} с — в ведре ${tokens.value.toFixed(2)} токена`)
}
function reset() {
  t = 0
  bucket = new TokenBucket(capacity.value, rate.value, () => t)
  sync()
  log.value = [`Новое ведро: ёмкость ${capacity.value}, пополнение ${rate.value} токен/с.`]
}
watch([capacity, rate], reset, { immediate: true })

const fill = (i: number) => Math.max(0, Math.min(1, tokens.value - i)) // доля заполнения i-го токена
</script>

<template>
  <div class="viz">
    <div class="viz-head"><span class="tag">Интерактив</span>Token bucket: всплеск разрешён, средняя скорость ограничена</div>
    <div class="viz-body">
      <label class="tb-row">Ёмкость ведра (всплеск): <strong>{{ capacity }}</strong><input v-model.number="capacity" type="range" min="1" max="10" aria-label="Ёмкость ведра" /></label>
      <label class="tb-row">Пополнение, токенов в секунду: <strong>{{ rate }}</strong><input v-model.number="rate" type="range" min="0.5" max="5" step="0.5" aria-label="Скорость пополнения" /></label>

      <div class="tb-bucket" role="img" :aria-label="`В ведре ${tokens.toFixed(2)} токена из ${capacity}`">
        <div v-for="i in capacity" :key="i" class="tb-token">
          <div class="tb-fill" :style="{ height: fill(i - 1) * 100 + '%' }" />
        </div>
        <span class="tb-count">{{ tokens.toFixed(2) }} / {{ capacity }}</span>
      </div>

      <div class="viz-controls">
        <button class="viz-btn primary" type="button" @click="request">Запрос</button>
        <button class="viz-btn" type="button" @click="wait(500)">+0,5 с</button>
        <button class="viz-btn" type="button" @click="wait(1000)">+1 с</button>
        <button class="viz-btn" type="button" @click="wait(3000)">+3 с</button>
        <button class="viz-btn" type="button" @click="reset">Сбросить</button>
      </div>

      <div class="viz-note" aria-live="polite">
        <div v-if="!log.length">Нажимайте «Запрос» подряд: первые {{ capacity }} пройдут (всплеск), затем — только по {{ rate }} в секунду.</div>
        <div v-for="(m, i) in log" :key="i" :style="{ opacity: i === 0 ? 1 : 0.6 }">{{ m }}</div>
      </div>
      <p class="tb-foot">Логика — порт Go-кода из главы 17 (тот же результат: «true true true false false», через 2 с — «true true false»).</p>
    </div>
  </div>
</template>

<style scoped>
.tb-row {
  display: grid;
  grid-template-columns: minmax(220px, 300px) 1fr;
  gap: 10px;
  align-items: center;
  margin: 4px 0 8px;
  font-size: 14px;
}
.tb-row input {
  width: 100%;
  accent-color: var(--vp-c-brand-1);
}
.tb-bucket {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 6px;
  margin: 10px 0;
}
.tb-token {
  position: relative;
  width: 30px;
  height: 44px;
  border: 2px solid var(--viz-data);
  border-radius: 8px;
  background: var(--vp-c-bg);
  overflow: hidden;
}
.tb-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: var(--viz-data);
  transition: height 0.2s;
}
.tb-count {
  margin-left: 8px;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
}
.tb-foot {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--vp-c-text-3);
}
@media (max-width: 560px) {
  .tb-row {
    grid-template-columns: 1fr;
  }
}
</style>
