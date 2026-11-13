<script setup lang="ts">
// Универсальный «плеер»: актёры в колонках, сообщения по шагам, пояснение и риски на каждом шаге.
// На нём построены RequestLifecycle, TxViz, RaceViz. Сообщения: from/to — индексы актёров (from == to — действие «внутри»).
import { computed, ref, watch } from 'vue'
import type { Step } from '../lib/step-types'

const props = defineProps<{ title?: string; actors: string[]; steps: Step[]; resetKey?: string | number }>()
const cur = ref(0)
watch(() => [props.steps, props.resetKey], () => (cur.value = 0))

const last = computed(() => props.steps.length - 1)
const step = computed(() => props.steps[cur.value])
const visible = computed(() => props.steps.slice(0, cur.value + 1))

const next = () => (cur.value = Math.min(last.value, cur.value + 1))
const prev = () => (cur.value = Math.max(0, cur.value - 1))
const reset = () => (cur.value = 0)

function span(s: Step) {
  const lo = Math.min(s.from, s.to)
  const hi = Math.max(s.from, s.to)
  return { lo, hi, n: hi - lo + 1 }
}
function msgStyle(s: Step) {
  const { lo, hi, n } = span(s)
  const gridColumn = `${lo + 1} / ${hi + 2}`
  // «Внутри себя» — рамка во всю колонку; между актёрами — линия от центра одной колонки до центра другой
  if (s.from === s.to) return { gridColumn, marginInline: '6px' }
  return { gridColumn, paddingInline: `${50 / n}%` }
}
const dir = (s: Step) => (s.from === s.to ? 'self' : s.from < s.to ? 'right' : 'left')
</script>

<template>
  <div class="viz sp" tabindex="0" @keydown.right.prevent="next" @keydown.left.prevent="prev">
    <div class="viz-head">
      <span class="tag">Интерактив</span>
      <span>{{ title }}</span>
    </div>
    <div class="viz-body">
      <div class="sp-board" :style="{ '--n': actors.length }">
        <div class="sp-lanes" aria-hidden="true"><div v-for="(_, i) in actors" :key="i" class="sp-lane" /></div>
        <div class="sp-actors">
          <div v-for="(a, i) in actors" :key="i" class="sp-actor">{{ a }}</div>
        </div>
        <div v-for="(s, i) in visible" :key="i" class="sp-row" :class="{ current: i === cur }">
          <div class="sp-msg" :class="[dir(s), s.note]" :style="msgStyle(s)">
            <span class="sp-n">{{ i + 1 }}</span>{{ s.text }}
          </div>
        </div>
      </div>

      <div v-if="step" class="viz-note" :class="step.note" aria-live="polite">
        <strong>Шаг {{ cur + 1 }} из {{ steps.length }}. {{ step.text }}</strong>
        <div v-if="step.detail">{{ step.detail }}</div>
        <div v-if="step.risk" class="sp-risk">⚠ {{ step.risk }}</div>
        <div v-if="step.state" class="sp-state">
          <span v-for="(v, k) in step.state" :key="k" class="viz-chip">{{ k }} = {{ v }}</span>
        </div>
      </div>

      <div class="viz-controls">
        <button class="viz-btn" type="button" :disabled="cur === 0" @click="prev">← Назад</button>
        <button class="viz-btn primary" type="button" :disabled="cur === last" @click="next">Далее →</button>
        <button class="viz-btn" type="button" :disabled="cur === 0" @click="reset">Сначала</button>
        <slot name="controls" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.sp-board {
  position: relative;
  min-width: 480px;
  padding-bottom: 6px;
}
.sp-lanes {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(var(--n), 1fr);
  pointer-events: none;
}
.sp-lane::after {
  content: '';
  display: block;
  height: 100%;
  margin: 0 auto;
  border-left: 1px dashed var(--vp-c-divider);
}
.sp-actors {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--n), 1fr);
  gap: 6px;
  margin-bottom: 10px;
}
.sp-actor {
  padding: 6px 4px;
  text-align: center;
  font-size: 12.5px;
  font-weight: 600;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 8px;
  background: var(--vp-c-bg);
}
.sp-row {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--n), 1fr);
  margin: 6px 0;
  opacity: 0.55;
  transition: opacity 0.2s;
}
.sp-row.current {
  opacity: 1;
}
.sp-msg {
  position: relative;
  box-sizing: border-box;
  padding-bottom: 7px;
  font-size: 12.5px;
  line-height: 1.35;
  text-align: center;
  border-bottom: 2px solid var(--vp-c-text-2);
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}
.sp-row.current .sp-msg {
  border-bottom-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.sp-msg.bad {
  border-bottom-color: var(--viz-bad);
}
.sp-msg.ok {
  border-bottom-color: var(--viz-ok);
}
.sp-msg.self {
  border: 1px dashed var(--vp-c-text-3);
  border-radius: 8px;
  padding: 5px 6px;
}
.sp-msg.right::after,
.sp-msg.left::after {
  content: '';
  position: absolute;
  bottom: -6px;
  border: 5px solid transparent;
}
.sp-msg.right::after {
  right: 0;
  border-left: 8px solid var(--vp-c-text-2);
}
.sp-msg.left::after {
  left: 0;
  border-right: 8px solid var(--vp-c-text-2);
}
.sp-row.current .sp-msg.right::after {
  border-left-color: var(--vp-c-brand-1);
}
.sp-row.current .sp-msg.left::after {
  border-right-color: var(--vp-c-brand-1);
}
.sp-n {
  display: inline-block;
  min-width: 18px;
  margin-right: 6px;
  padding: 0 4px;
  font-size: 11px;
  border-radius: 9px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}
.sp-risk {
  margin-top: 4px;
  color: var(--viz-bad);
}
.sp-state {
  margin-top: 6px;
}
</style>
