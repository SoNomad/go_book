import { defineAsyncComponent } from 'vue'
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './style.css'
import Layout from './Layout.vue'
import { ruTerm } from './lib/ru-stem'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app, siteData }) {
    // Все компоненты из ./components регистрируются глобально, но ЛЕНИВО: каждый — отдельный чанк,
    // который загружается только на странице, где он используется (маркер <!-- viz:Имя --> в главе
    // превращается скриптом синхронизации в <Имя />).
    const loaders = import.meta.glob('./components/*.vue')
    for (const [file, loader] of Object.entries(loaders)) {
      const name = file.split('/').pop()!.replace(/\.vue$/, '')
      app.component(name, defineAsyncComponent(loader as () => Promise<object>))
    }

    // Функции не переживают сериализацию конфига в JSON, поэтому processTerm для поиска
    // на клиенте подставляем здесь (на этапе сборки индекса он берётся из config.mts).
    const mini = (siteData.value.themeConfig as any)?.search?.options?.miniSearch
    if (mini) mini.options = { ...mini.options, processTerm: ruTerm }
  },
} satisfies Theme
