<script setup lang="ts">
import { computed, ref } from 'vue'
import StepPlayer from './StepPlayer.vue'
import type { Step } from '../lib/step-types'
import { SCHEDULES, simulate } from '../lib/race-model'

// Актёры: 0 Горутина 1, 1 counter (общая память), 2 Горутина 2
const actors = ['Горутина 1', 'counter', 'Горутина 2']

const PRESETS = [
  { id: 'lost', title: 'Без мьютекса: неудачное чередование', schedule: SCHEDULES.lost, mutex: false },
  { id: 'lucky', title: 'Без мьютекса: «повезло»', schedule: SCHEDULES.lucky, mutex: false },
  { id: 'mutex', title: 'С мьютексом', schedule: SCHEDULES.mutex, mutex: true },
]
const active = ref('lost')

const steps = computed<Step[]>(() => {
  const p = PRESETS.find((x) => x.id === active.value)!
  const { frames, final } = simulate(p.schedule, p.mutex)
  const out: Step[] = frames.map((f, i) => {
    const me = f.g === 0 ? 0 : 2
    const state: Record<string, string | number> = {
      counter: f.counter,
      'reg Г1': f.regs[0] ?? '—',
      'reg Г2': f.regs[1] ?? '—',
    }
    if (p.mutex) state['мьютекс'] = f.lockHolder === null ? 'свободен' : `у Г${f.lockHolder + 1}`
    const who = `Г${f.g + 1}`
    const base: Step = { from: me, to: me, text: '', state }
    switch (f.op) {
      case 'LOAD':
        return { ...base, from: 1, to: me, text: `${who}: LOAD — читает counter = ${f.regs[f.g]}`, detail: 'Значение копируется в «регистр» горутины. Дальше она работает с копией.' }
      case 'ADD':
        return { ...base, text: `${who}: ADD — считает ${f.regs[f.g]! - 1} + 1 = ${f.regs[f.g]}`, detail: 'Вычисление идёт над локальной копией.' }
      case 'STORE':
        return { ...base, from: me, to: 1, text: `${who}: STORE — записывает counter = ${f.regs[f.g]}`, detail: 'Запись затирает то, что в counter лежит сейчас, — даже если другая горутина уже его изменила.' }
      case 'LOCK':
        return f.blocked
          ? { ...base, text: `${who}: LOCK — занят, ГОРУТИНА ЖДЁТ`, detail: 'Мьютекс удерживает другая горутина — этот шаг ничего не меняет.', risk: 'Ожидание — цена корректности.' }
          : { ...base, from: me, to: 1, text: `${who}: LOCK — захватила мьютекс`, detail: 'Теперь в критической секции только она.' }
      case 'UNLOCK':
        return { ...base, from: me, to: 1, text: `${who}: UNLOCK — отпустила мьютекс`, detail: 'Ожидающая горутина сможет продолжить.' }
    }
  })
  const last = out[out.length - 1]
  const ok = final === 2
  last.note = ok ? 'ok' : 'bad'
  last.risk = ok
    ? p.mutex
      ? 'Итог 2 — при ЛЮБОМ порядке шагов: мьютекс не даёт критическим секциям пересечься.'
      : 'Итог 2 только потому, что горутины не пересеклись. Гонка осталась в коде и сработает в другой раз — поэтому «у меня работает» ничего не доказывает; ищите гонки через go test -race.'
    : `Итог ${final} вместо 2: одно обновление потеряно — две горутины прочитали одно и то же значение.`
  return out
})
</script>

<template>
  <StepPlayer title="Гонка данных: counter++ в двух горутинах" :actors="actors" :steps="steps" :reset-key="active">
    <template #controls>
      <span style="flex-basis: 100%" />
      <button
        v-for="p in PRESETS"
        :key="p.id"
        class="viz-btn"
        :class="{ on: p.id === active }"
        type="button"
        @click="active = p.id"
      >
        {{ p.title }}
      </button>
    </template>
  </StepPlayer>
</template>
