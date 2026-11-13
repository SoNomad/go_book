<script lang="ts">
// Mermaid грузится ЛЕНИВО и один раз на все диаграммы: страницы без диаграмм не платят за него ни байта.
let mermaidModule: Promise<typeof import('mermaid').default> | undefined
export function loadMermaid() {
  return (mermaidModule ??= import('mermaid').then((m) => m.default))
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'
import { mermaidThemeVariables, prepareDiagram } from '../lib/mermaid-source'

const FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

const props = defineProps<{ code: string }>() // исходник, закодированный encodeURIComponent
const { isDark } = useData()

const source = computed(() => decodeURIComponent(props.code))
const svg = ref('')
const error = ref('')
const zoomed = ref(false)

const uid = `mmd-${Math.random().toString(36).slice(2, 9)}`
let counter = 0
let mounted = false

async function render() {
  try {
    const mermaid = await loadMermaid()
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: mermaidThemeVariables(isDark.value),
      // Явный шрифт (не 'inherit'): блок измеряется тем же шрифтом, которым рисуется, иначе подписи обрезаются.
      // SVG-подписи вместо HTML (foreignObject) — размер считается по реальному тексту.
      fontFamily: FONT,
      htmlLabels: false,
      // useMaxWidth:false — схема рисуется «в натуральную величину» (читаемый шрифт);
      // если шире колонки, на телефоне прокручивается, на десктопе сжимается стилями ниже.
      flowchart: { htmlLabels: false, curve: 'basis', padding: 14, nodeSpacing: 40, rankSpacing: 50, useMaxWidth: false },
      sequence: {
        mirrorActors: false,
        useMaxWidth: false,
        actorMargin: 18,
        width: 108,
        messageMargin: 28,
        boxMargin: 8,
        messageFontSize: 14,
        actorFontSize: 14,
        noteFontSize: 14,
      },
      er: { useMaxWidth: false },
      state: { useMaxWidth: false },
      class: { useMaxWidth: false },
      gantt: { useMaxWidth: false },
    })
    const result = await mermaid.render(`${uid}-${++counter}`, prepareDiagram(source.value))
    svg.value = result.svg
    error.value = ''
  } catch (e) {
    svg.value = ''
    error.value = e instanceof Error ? e.message : String(e)
    console.error('[mermaid]', e)
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
function open() {
  if (!svg.value) return
  zoomed.value = true
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKey)
}
function close() {
  zoomed.value = false
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKey)
}

onMounted(() => {
  mounted = true
  render()
})
watch(isDark, () => mounted && render()) // перерисовать при смене темы
onBeforeUnmount(close)
</script>

<template>
  <figure class="mmd" :class="{ 'mmd--error': error }" :data-mermaid-state="error ? 'error' : svg ? 'ok' : 'loading'">
    <div
      v-if="svg"
      class="mmd-body"
      role="button"
      tabindex="0"
      aria-label="Диаграмма. Нажмите, чтобы увеличить"
      title="Нажмите, чтобы увеличить"
      @click="open"
      @keydown.enter="open"
      v-html="svg"
    />
    <div v-else-if="error" class="mmd-error">
      <strong>Не удалось нарисовать диаграмму</strong>
      <pre>{{ error }}</pre>
      <pre>{{ source }}</pre>
    </div>
    <div v-else class="mmd-loading">Рисую диаграмму…</div>
    <noscript><pre>{{ source }}</pre></noscript>

    <div v-if="zoomed" class="mmd-overlay" role="dialog" aria-modal="true" aria-label="Диаграмма крупно" @click="close">
      <button class="mmd-close" type="button" aria-label="Закрыть" @click.stop="close">✕</button>
      <div class="mmd-overlay-inner" @click.stop v-html="svg" />
    </div>
  </figure>
</template>

<style scoped>
.mmd {
  margin: 24px 0;
}
.mmd-body {
  overflow-x: auto;
  padding: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  cursor: zoom-in;
}
/* Не сжимаем схему до нечитаемого шрифта: на узком экране она прокручивается по горизонтали.
   (display:block + margin:auto вместо flex-центрирования — иначе левый край нельзя прокрутить.) */
.mmd-body :deep(svg) {
  display: block;
  margin: 0 auto;
  min-width: 560px;
  max-width: none !important;
  height: auto;
}
@media (min-width: 960px) {
  .mmd-body :deep(svg) {
    min-width: 0;
    max-width: 100% !important;
  }
}
.mmd-body:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
.mmd-loading {
  padding: 28px;
  text-align: center;
  color: var(--vp-c-text-3);
  border: 1px dashed var(--vp-c-divider);
  border-radius: 10px;
}
.mmd-error {
  padding: 12px 16px;
  border: 1px solid var(--viz-bad);
  border-radius: 10px;
  color: var(--vp-c-text-1);
}
.mmd-error pre {
  white-space: pre-wrap;
  font-size: 12px;
}

.mmd-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  background: color-mix(in srgb, var(--vp-c-bg) 94%, transparent);
  overflow: auto;
  cursor: zoom-out;
}
.mmd-overlay-inner {
  margin: auto;
  padding: 56px 16px 24px;
  cursor: default;
}
/* На телефоне — крупно, с прокруткой/щипком; на десктопе — на всю ширину окна */
.mmd-overlay-inner :deep(svg) {
  width: max(900px, 92vw) !important;
  max-width: none !important;
  height: auto;
}
.mmd-close {
  position: fixed;
  top: 12px;
  right: 12px;
  width: 44px;
  height: 44px;
  font-size: 20px;
  border-radius: 50%;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  cursor: pointer;
  z-index: 1001;
}
</style>
