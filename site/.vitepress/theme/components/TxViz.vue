<script setup lang="ts">
import { computed, ref } from 'vue'
import StepPlayer from './StepPlayer.vue'
import type { Step } from '../lib/step-types'

// Актёры: 0 Сессия A, 1 БД, 2 Сессия B. Сценарии проверены на PostgreSQL (глава 7, задачи 27–28).
const actors = ['Сессия A', 'БД', 'Сессия B']

const SCENARIOS: { id: string; title: string; steps: Step[] }[] = [
  {
    id: 'lost',
    title: 'Потерянное обновление',
    steps: [
      { from: 0, to: 1, text: 'BEGIN; SELECT stock → 10', detail: 'Сессия A прочитала 10 в память приложения.', state: { stock: 10 } },
      { from: 2, to: 1, text: 'UPDATE … SET stock = stock - 5', detail: 'Сессия B списывает 5 штук (автокоммит).', state: { stock: 5 } },
      { from: 0, to: 0, text: 'в приложении: 10 − 1 = 9', detail: 'A не знает, что значение уже изменилось.', risk: 'Расчёт сделан на устаревших данных.', state: { stock: 5 } },
      { from: 0, to: 1, text: 'UPDATE … SET stock = 9; COMMIT', detail: 'A записывает своё значение поверх.', risk: 'Списание сессии B потеряно: должно быть 4, а стало 9.', state: { stock: 9 }, note: 'bad' },
    ],
  },
  {
    id: 'atomic',
    title: 'Исправление 1: атомарный UPDATE',
    steps: [
      { from: 2, to: 1, text: 'UPDATE … SET stock = stock - 5', state: { stock: 5 } },
      { from: 0, to: 1, text: 'UPDATE … SET stock = stock - 1 WHERE stock > 0', detail: 'Выражение считается внутри БД по актуальному значению. Проверка и списание — одна операция. RETURNING stock → 4.', state: { stock: 4 }, note: 'ok' },
    ],
  },
  {
    id: 'forupdate',
    title: 'Исправление 2: FOR UPDATE',
    steps: [
      { from: 0, to: 1, text: 'BEGIN; SELECT … FOR UPDATE → 10', detail: 'Строка заблокирована для других записей.', state: { stock: 10, блокировка: 'A' } },
      { from: 2, to: 1, text: 'UPDATE … SET stock = stock - 5 — ждёт', detail: 'Сессия B встала в очередь: строка занята транзакцией A.', risk: 'Долгие транзакции с блокировками тормозят всех остальных.', state: { stock: 10, блокировка: 'A', B: 'ждёт' } },
      { from: 0, to: 1, text: 'UPDATE … SET stock = 9; COMMIT', detail: 'Блокировка снята.', state: { stock: 9 } },
      { from: 1, to: 2, text: 'B продолжает: 9 − 5 → 4', detail: 'B увидела уже зафиксированное значение.', state: { stock: 4 }, note: 'ok' },
    ],
  },
  {
    id: 'repeatable',
    title: 'Исправление 3: REPEATABLE READ',
    steps: [
      { from: 0, to: 1, text: 'BEGIN ISOLATION LEVEL REPEATABLE READ; SELECT → 10', detail: 'A работает со снимком данных на момент начала транзакции.', state: { stock: 10 } },
      { from: 2, to: 1, text: 'UPDATE … SET stock = stock - 5; COMMIT', state: { stock: 5 } },
      { from: 1, to: 0, text: 'ERROR 40001: could not serialize access', detail: 'A пытается обновить строку, изменённую после её снимка. PostgreSQL не даёт молча затереть чужое изменение.', risk: 'Код обязан повторить транзакцию (retry).', state: { stock: 5 }, note: 'bad' },
      { from: 0, to: 1, text: 'ROLLBACK и повтор: SELECT → 5, UPDATE → 4', detail: 'После повтора A видит актуальное значение.', state: { stock: 4 }, note: 'ok' },
    ],
  },
  {
    id: 'deadlock',
    title: 'Deadlock',
    steps: [
      { from: 0, to: 1, text: 'UPDATE … WHERE id = 1', detail: 'A держит строку 1.', state: { 'строка 1': 'A', 'строка 2': '—' } },
      { from: 2, to: 1, text: 'UPDATE … WHERE id = 2', detail: 'B держит строку 2.', state: { 'строка 1': 'A', 'строка 2': 'B' } },
      { from: 0, to: 1, text: 'UPDATE … WHERE id = 2 — ждёт B', state: { 'строка 1': 'A', 'строка 2': 'B', A: 'ждёт B' } },
      { from: 2, to: 1, text: 'UPDATE … WHERE id = 1 — ждёт A', detail: 'Цикл ожиданий: A ждёт B, а B ждёт A. Сами они не выйдут никогда.', risk: 'Без вмешательства БД оба зависли бы навсегда.', state: { A: 'ждёт B', B: 'ждёт A' }, note: 'bad' },
      { from: 1, to: 2, text: 'ERROR 40P01: deadlock detected', detail: 'PostgreSQL обнаружил цикл и отменил транзакцию-жертву (B).', state: { A: 'продолжает', B: 'отменена' } },
      { from: 1, to: 0, text: 'A получает строку 2 и завершается', detail: 'Лечение: блокировать ресурсы ВСЕГДА в одном порядке (например, по возрастанию id) и держать транзакции короткими.', note: 'ok', state: { 'строка 1': 'A', 'строка 2': 'A' } },
    ],
  },
]

const active = ref('lost')
const scenario = computed(() => SCENARIOS.find((s) => s.id === active.value)!)
</script>

<template>
  <StepPlayer title="Две сессии на временной шкале" :actors="actors" :steps="scenario.steps" :reset-key="active">
    <template #controls>
      <span style="flex-basis: 100%" />
      <button
        v-for="s in SCENARIOS"
        :key="s.id"
        class="viz-btn"
        :class="{ on: s.id === active }"
        type="button"
        @click="active = s.id"
      >
        {{ s.title }}
      </button>
    </template>
  </StepPlayer>
</template>
