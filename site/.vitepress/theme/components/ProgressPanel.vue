<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { PARTS } from '../../../scripts/chapters.mjs'
import { exportJson, load, parseImport, save, stats, type ProgressData } from '../lib/progress'

const data = ref<ProgressData>({ items: {}, totals: {} })
const message = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

onMounted(() => (data.value = load()))

const chapters = PARTS.flatMap((p) => p.items)
  .filter(([slug]) => /^\d\d-/.test(slug))
  .map(([slug, title]) => ({ slug, title }))

const rows = computed(() =>
  chapters.map((c) => {
    const t = stats(data.value, c.slug, 'tasks')
    const k = stats(data.value, c.slug, 'check')
    return { ...c, tasks: t, check: k, opened: t.total + k.total > 0 }
  }),
)
const overall = computed(() => {
  const known = rows.value.filter((r) => r.opened)
  const done = known.reduce((s, r) => s + r.tasks.done + r.check.done, 0)
  const total = known.reduce((s, r) => s + r.tasks.total + r.check.total, 0)
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0, opened: known.length }
})
const lastTitle = computed(() => {
  const slug = data.value.last?.replace(/^\/+/, '').replace(/\.html$/, '')
  return chapters.find((c) => c.slug === slug)?.title
})
const pct = (x: { done: number; total: number }) => (x.total ? Math.round((x.done / x.total) * 100) : 0)

function doExport() {
  const blob = new Blob([exportJson(data.value)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `go-book-progress-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
  message.value = 'Файл сохранён. Откройте эту страницу на другом устройстве и нажмите «Импорт».'
}
async function onImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const parsed = parseImport(await file.text())
  if (!parsed) {
    message.value = 'Не удалось прочитать файл: это не экспорт прогресса из этой книги.'
  } else {
    // объединяем с текущим: отметки не теряются ни с одной из сторон
    const merged: ProgressData = {
      items: { ...data.value.items, ...parsed.items },
      totals: { ...data.value.totals, ...parsed.totals },
      last: parsed.last ?? data.value.last,
    }
    save(merged)
    data.value = load()
    message.value = `Импортировано отметок: ${Object.keys(parsed.items).length}. Они объединены с текущими.`
  }
  if (fileInput.value) fileInput.value.value = ''
}
function doReset() {
  if (!confirm('Стереть все отметки на этом устройстве?')) return
  save({ items: {}, totals: {} })
  data.value = load()
  message.value = 'Прогресс сброшен.'
}
</script>

<template>
  <div class="pp">
    <div class="viz-note" :class="overall.pct === 100 && overall.total ? 'ok' : ''">
      <strong>Отмечено {{ overall.done }} из {{ overall.total }}</strong>
      <span v-if="overall.total"> ({{ overall.pct }}%). Открыто глав: {{ overall.opened }}.</span>
      <span v-else> Откройте любую главу и отметьте пункты в разделах «Задачи» и «Самопроверка».</span>
      <div v-if="lastTitle" style="margin-top: 6px">
        <a class="viz-btn primary" style="display: inline-block; text-decoration: none; line-height: 28px" :href="withBase(data.last!)">Продолжить: {{ lastTitle }} →</a>
      </div>
    </div>

    <table class="pp-table">
      <thead><tr><th>Глава</th><th>Задачи</th><th>Самопроверка</th></tr></thead>
      <tbody>
        <tr v-for="r in rows" :key="r.slug">
          <td><a :href="withBase('/' + r.slug)">{{ r.title }}</a></td>
          <td>
            <template v-if="r.opened">
              <span class="pp-bar"><i :style="{ width: pct(r.tasks) + '%' }" /></span> {{ r.tasks.done }}/{{ r.tasks.total }}
            </template>
            <span v-else class="pp-muted">не открыта</span>
          </td>
          <td>
            <template v-if="r.opened">
              <span class="pp-bar"><i :style="{ width: pct(r.check) + '%' }" /></span> {{ r.check.done }}/{{ r.check.total }}
            </template>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="viz-controls">
      <button class="viz-btn" type="button" @click="doExport">Экспорт в файл</button>
      <button class="viz-btn" type="button" @click="fileInput?.click()">Импорт из файла</button>
      <button class="viz-btn" type="button" @click="doReset">Сбросить</button>
      <input ref="fileInput" type="file" accept="application/json,.json" hidden @change="onImport" />
    </div>
    <div v-if="message" class="viz-note" aria-live="polite">{{ message }}</div>
  </div>
</template>

<style scoped>
.pp-table {
  margin-top: 16px;
}
.pp-bar {
  display: inline-block;
  width: 70px;
  height: 8px;
  margin-right: 6px;
  vertical-align: middle;
  border-radius: 4px;
  background: var(--vp-c-divider);
  overflow: hidden;
}
.pp-bar i {
  display: block;
  height: 100%;
  background: var(--vp-c-brand-1);
}
.pp-muted {
  color: var(--vp-c-text-3);
}
</style>
