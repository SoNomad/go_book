<script setup lang="ts">
import { computed, ref } from 'vue'
import { Breaker, type State } from '../lib/limiters'

const THRESHOLD = 3
const COOLDOWN = 10_000

let t = 0
let br = new Breaker(THRESHOLD, COOLDOWN, () => t)

const state = ref<State>('closed')
const failures = ref(0)
const clock = ref(0)
const openedAt = ref(0)
const log = ref<string[]>([])

const sync = () => {
  state.value = br.state
  failures.value = br.failures
  clock.value = t
  openedAt.value = br.openedAt
}
const stamp = () => (t / 1000).toFixed(0) + ' с'
const push = (m: string) => (log.value = [m, ...log.value].slice(0, 8))

function call(success: boolean) {
  const before = br.state
  const r = br.do(() => success)
  sync()
  const text =
    r === 'rejected'
      ? '⛔ отказ мгновенно, до зависимости не дошли'
      : r === 'ok'
        ? '✓ успех' + (before === 'half-open' || before === 'open' ? ' — проба удалась, цепь замкнулась' : '')
        : '✗ сбой' + (state.value === 'open' ? ' → цепь РАЗОМКНУЛАСЬ' : '')
  push(`${stamp()}: вызов — ${text}`)
}
function wait(ms: number) {
  t += ms
  sync()
  push(`${stamp()}: прошло ${ms / 1000} с`)
}
function reset() {
  t = 0
  br = new Breaker(THRESHOLD, COOLDOWN, () => t)
  sync()
  log.value = []
}

const cooldownLeft = computed(() => (state.value === 'open' ? Math.max(0, (COOLDOWN - (clock.value - openedAt.value)) / 1000) : 0))
const STATES: { id: State; title: string; hint: string }[] = [
  { id: 'closed', title: 'Closed', hint: 'вызовы идут' },
  { id: 'open', title: 'Open', hint: 'быстрый отказ' },
  { id: 'half-open', title: 'Half-open', hint: 'один пробный вызов' },
]
</script>

<template>
  <div class="viz">
    <div class="viz-head"><span class="tag">Интерактив</span>Circuit breaker: {{ THRESHOLD }} сбоя подряд размыкают цепь, пауза {{ COOLDOWN / 1000 }} с</div>
    <div class="viz-body">
      <div class="bk-states">
        <div v-for="s in STATES" :key="s.id" class="bk-state" :class="[s.id, { active: state === s.id }]">
          <strong>{{ s.title }}</strong>
          <small>{{ s.hint }}</small>
        </div>
      </div>

      <div class="bk-meta">
        <span class="viz-chip">подряд сбоев: {{ failures }} / {{ THRESHOLD }}</span>
        <span v-if="state === 'open'" class="viz-chip">до пробы: {{ cooldownLeft.toFixed(0) }} с</span>
        <span class="viz-chip">время: {{ (clock / 1000).toFixed(0) }} с</span>
      </div>

      <div class="viz-controls">
        <button class="viz-btn primary" type="button" @click="call(true)">Вызов: успех</button>
        <button class="viz-btn" type="button" @click="call(false)">Вызов: сбой</button>
        <button class="viz-btn" type="button" @click="wait(3000)">+3 с</button>
        <button class="viz-btn" type="button" @click="wait(11000)">+11 с</button>
        <button class="viz-btn" type="button" @click="reset">Сбросить</button>
      </div>

      <div class="viz-note" aria-live="polite">
        <div v-if="!log.length">Нажмите «Вызов: сбой» три раза, затем ещё раз — увидите быстрый отказ. Потом «+11 с» и «Вызов: успех».</div>
        <div v-for="(m, i) in log" :key="i" :style="{ opacity: i === 0 ? 1 : 0.6 }">{{ m }}</div>
      </div>
      <p class="bk-foot">Логика — порт Go-кода из главы 17; сценарий «3 сбоя → open → отказы → проба → closed» совпадает с его реальным выводом.</p>
    </div>
  </div>
</template>

<style scoped>
.bk-states {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.bk-state {
  padding: 10px 6px;
  text-align: center;
  border: 2px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg);
  opacity: 0.55;
  transition: all 0.2s;
}
.bk-state small {
  display: block;
  color: var(--vp-c-text-2);
}
.bk-state.active {
  opacity: 1;
  transform: translateY(-2px);
}
.bk-state.closed.active {
  border-color: var(--viz-ok);
  background: color-mix(in srgb, var(--viz-ok) 14%, var(--vp-c-bg));
}
.bk-state.open.active {
  border-color: var(--viz-bad);
  background: color-mix(in srgb, var(--viz-bad) 14%, var(--vp-c-bg));
}
.bk-state.half-open.active {
  border-color: var(--viz-data);
  background: color-mix(in srgb, var(--viz-data) 14%, var(--vp-c-bg));
}
.bk-meta {
  margin-top: 10px;
}
.bk-foot {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--vp-c-text-3);
}
</style>
