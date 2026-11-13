<script setup lang="ts">
// Обёртка над стандартным Layout: после каждой отрисовки страницы вставляет чекбоксы прогресса
// в разделы «Задачи» и «Самопроверка» и запоминает последнюю открытую главу.
import DefaultTheme from 'vitepress/theme'
import { onContentUpdated, useRoute } from 'vitepress'
import { enhanceChecklists, rememberLast, slugOf } from './lib/progress'

const { Layout } = DefaultTheme
const route = useRoute()

onContentUpdated(() => {
  enhanceChecklists(document, slugOf(route.path))
  rememberLast(route.path)
})
</script>

<template>
  <Layout />
</template>
