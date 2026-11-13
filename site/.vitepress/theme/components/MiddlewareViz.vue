<script setup lang="ts">
import { computed, ref } from 'vue'
import { trace, type Mw, type Scenario } from '../lib/middleware-model'

const order = ref<Mw[]>(['RequestID', 'Logging', 'Recover', 'CORS', 'Auth'])
const scenario = ref<Scenario>('panic')

const PRESETS: { title: string; order: Mw[] }[] = [
  { title: 'Рекомендуемый порядок', order: ['RequestID', 'Logging', 'Recover', 'CORS', 'Auth'] },
  { title: 'Recover снаружи Logging', order: ['Recover', 'RequestID', 'Logging', 'CORS', 'Auth'] },
  { title: 'Без Recover', order: ['RequestID', 'Logging', 'CORS', 'Auth'] },
  { title: 'Без Auth', order: ['RequestID', 'Logging', 'Recover', 'CORS'] },
]
const SCENARIOS: { id: Scenario; title: string }[] = [
  { id: 'ok', title: 'Обычный запрос' },
  { id: 'panic', title: 'Handler паникует' },
  { id: 'unauthorized', title: 'Нет сессии' },
]

const result = computed(() => trace(order.value, scenario.value))
const move = (i: number, d: -1 | 1) => {
  const j = i + d
  if (j < 0 || j >= order.value.length) return
  const next = [...order.value]
  ;[next[i], next[j]] = [next[j], next[i]]
  order.value = next
}
const remove = (i: number) => (order.value = order.value.filter((_, k) => k !== i))

const verdict = computed<{ kind: 'ok' | 'bad'; text: string }>(() => {
  const r = result.value
  if (scenario.value === 'panic') {
    if (r.status === 0) return { kind: 'bad', text: 'Паника никем не поймана: соединение оборвано, клиент не получил ответа.' }
    if (r.logged === null) return { kind: 'bad', text: 'Клиент получил 500, но в логе ПУСТО: падение прошло незамеченным. Logging должен быть СНАРУЖИ Recover.' }
    return { kind: 'ok', text: 'Паника превратилась в 500, и запрос попал в лог со статусом 500.' }
  }
  if (scenario.value === 'unauthorized') {
    if (r.status !== 401) return { kind: 'bad', text: 'Запрос без сессии дошёл до handler и получил 200 — дыра в безопасности. Нужна авторизация в цепочке.' }
    return { kind: 'ok', text: 'Auth остановил запрос: handler не вызывался, в лог записан 401.' }
  }
  return { kind: 'ok', text: 'Обычный запрос проходит через все слои туда и обратно.' }
})
</script>

<template>
  <div class="viz">
    <div class="viz-head"><span class="tag">Интерактив</span>Порядок middleware: первый в списке — самый внешний</div>
    <div class="viz-body">
      <div class="viz-controls" style="margin-top: 0">
        <button v-for="p in PRESETS" :key="p.title" class="viz-btn" type="button" @click="order = [...p.order]">{{ p.title }}</button>
      </div>

      <ol class="mv-list">
        <li v-for="(m, i) in order" :key="m">
          <span class="mv-name">{{ m }}</span>
          <button class="viz-btn mv-b" type="button" :disabled="i === 0" aria-label="Выше (внешнее)" @click="move(i, -1)">↑</button>
          <button class="viz-btn mv-b" type="button" :disabled="i === order.length - 1" aria-label="Ниже (внутреннее)" @click="move(i, 1)">↓</button>
          <button class="viz-btn mv-b" type="button" aria-label="Убрать" @click="remove(i)">✕</button>
        </li>
        <li class="mv-handler">handler</li>
      </ol>

      <div class="viz-controls">
        <button v-for="s in SCENARIOS" :key="s.id" class="viz-btn" :class="{ on: scenario === s.id }" type="button" @click="scenario = s.id">{{ s.title }}</button>
      </div>

      <pre class="mv-trace" aria-live="polite">{{ result.lines.join('\n') }}</pre>

      <div class="viz-note" :class="verdict.kind">
        <strong>Статус для клиента: {{ result.status === 0 ? 'нет ответа' : result.status }}. В логе: {{ result.logged ?? 'ничего' }}.</strong>
        <div>{{ verdict.text }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mv-list {
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
  counter-reset: mw;
}
.mv-list li {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 4px 0;
  counter-increment: mw;
}
.mv-list li::before {
  content: counter(mw);
  width: 22px;
  text-align: center;
  font-size: 12px;
  color: var(--vp-c-text-3);
}
.mv-name {
  flex: 1;
  max-width: 220px;
  padding: 6px 12px;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 8px;
  background: var(--vp-c-bg);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
}
.mv-b {
  min-height: 34px;
  padding: 2px 10px;
}
.mv-handler {
  padding-left: 28px;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--vp-c-text-2);
}
.mv-handler::before {
  content: '' !important;
  width: 0 !important;
}
.mv-trace {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  font-size: 12.5px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre;
}
</style>
