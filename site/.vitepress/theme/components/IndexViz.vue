<script setup lang="ts">
import { computed, ref } from 'vue'
import { REAL, compare } from '../lib/index-model'

const exp = ref(6) // 10^6 строк
const matches = ref(100)

const rows = computed(() => Math.round(10 ** exp.value))
const c = computed(() => compare(rows.value, matches.value))
const fmt = (n: number) => n.toLocaleString('ru-RU')

// ширина полос — в логарифмическом масштабе (иначе индекс не видно вообще)
const maxPages = computed(() => compare(10 ** 7, matches.value).seq)
const bar = (pages: number) => Math.max(3, (Math.log10(pages + 1) / Math.log10(maxPages.value + 1)) * 100)
const levels = computed(() => ['корень', ...Array.from({ length: Math.max(0, c.value.height - 1) }, (_, i) => `узел ${i + 1}`)])
</script>

<template>
  <div class="viz">
    <div class="viz-head"><span class="tag">Интерактив</span>Seq Scan против индекса B-tree: сколько страниц читает БД</div>
    <div class="viz-body">
      <label class="iv-row">
        Строк в таблице: <strong>{{ fmt(rows) }}</strong>
        <input v-model.number="exp" type="range" min="3" max="7" step="0.25" aria-label="Число строк в таблице (степень десяти)" />
      </label>
      <label class="iv-row">
        Нужно найти строк: <strong>{{ matches }}</strong>
        <input v-model.number="matches" type="range" min="1" max="1000" step="1" aria-label="Сколько строк подходит под условие" />
      </label>

      <div class="iv-block">
        <div class="iv-title">Seq Scan — читает всю таблицу</div>
        <div class="iv-track"><div class="iv-fill seq" :style="{ width: bar(c.seq) + '%' }" /></div>
        <div class="iv-num">{{ fmt(c.seq) }} страниц</div>
      </div>

      <div class="iv-block">
        <div class="iv-title">Индекс — спуск по дереву + нужные строки</div>
        <div class="iv-track"><div class="iv-fill idx" :style="{ width: bar(c.idx) + '%' }" /></div>
        <div class="iv-num">{{ fmt(c.idx) }} страниц <span class="iv-muted">({{ c.height }} на спуск + {{ matches }} на строки)</span></div>
        <div class="iv-tree" aria-label="Уровни B-tree">
          <span v-for="(l, i) in levels" :key="i" class="viz-chip">{{ l }}</span>
          <span class="viz-chip">лист</span>
          <span class="viz-chip">строка в таблице</span>
        </div>
      </div>

      <div class="viz-note" :class="c.ratio > 5 ? 'ok' : ''">
        Индекс читает в <strong>≈ {{ c.ratio >= 10 ? Math.round(c.ratio) : c.ratio.toFixed(1) }} раз меньше</strong> страниц.
        <template v-if="c.ratio < 2">На маленьких таблицах Seq Scan нормален — планировщик не станет использовать индекс.</template>
        <template v-else>Растите таблицу ползунком: Seq Scan растёт линейно, индекс — почти не меняется.</template>
      </div>

      <p class="iv-foot">
        Реальный замер из главы 7 ({{ fmt(REAL.rows) }} строк, {{ REAL.matches }} совпадений): Seq Scan — {{ fmt(REAL.seqPages) }} страниц и
        {{ REAL.seqMs.toFixed(0) }} мс; индекс — {{ REAL.idxPages }} страницы и {{ REAL.idxMs.toFixed(1) }} мс (≈ ×{{ Math.round(REAL.seqMs / REAL.idxMs) }} по времени).
        Модель калибрована по этим цифрам.
      </p>
    </div>
  </div>
</template>

<style scoped>
.iv-row {
  display: grid;
  grid-template-columns: minmax(180px, 260px) 1fr;
  align-items: center;
  gap: 10px;
  margin: 4px 0 10px;
  font-size: 14px;
}
.iv-row input {
  width: 100%;
  accent-color: var(--vp-c-brand-1);
}
.iv-block {
  margin-top: 12px;
}
.iv-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
}
.iv-track {
  height: 16px;
  border-radius: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  overflow: hidden;
}
.iv-fill {
  height: 100%;
  border-radius: 8px;
  transition: width 0.25s ease;
}
.iv-fill.seq {
  background: var(--viz-bad);
}
.iv-fill.idx {
  background: var(--viz-ok);
}
.iv-num {
  margin-top: 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
}
.iv-muted,
.iv-foot {
  color: var(--vp-c-text-3);
}
.iv-foot {
  margin: 10px 0 0;
  font-size: 12px;
}
.iv-tree {
  margin-top: 6px;
}
@media (max-width: 560px) {
  .iv-row {
    grid-template-columns: 1fr;
  }
}
</style>
