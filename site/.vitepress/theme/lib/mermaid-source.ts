// Подготовка исходника Mermaid-диаграммы: общие «роли» цветов для всей книги.
// Используется и компонентом MermaidDiagram (рендер), и тестом синтаксиса (diagrams.test.ts).
//
// В блок-схемах авторы пишут  A[Браузер]:::client  — цвет задаёт роль, а не конкретный hex:
//   client   — клиент (браузер, Angular)          service  — наш Go-сервис
//   data     — хранилища (БД, Redis, очереди)     external — внешние системы и сторонние сервисы
//   ok / bad — успех / ошибка, сбой               muted    — второстепенное
// Заливка полупрозрачная (#RRGGBBAA) — одинаково хорошо выглядит в светлой и тёмной теме.

const ROLE_DEFS = `
classDef client fill:#6366f128,stroke:#6366f1,stroke-width:2px
classDef service fill:#00a0c028,stroke:#00a0c0,stroke-width:2px
classDef data fill:#d9770628,stroke:#d97706,stroke-width:2px
classDef external fill:#7c3aed28,stroke:#7c3aed,stroke-width:2px
classDef ok fill:#16a34a28,stroke:#16a34a,stroke-width:2px
classDef bad fill:#dc262628,stroke:#dc2626,stroke-width:2px
classDef muted fill:#9ca3af22,stroke:#9ca3af,stroke-width:1.5px,stroke-dasharray:4 3
`

export function prepareDiagram(code: string): string {
  const trimmed = code.trim()
  if (/^(flowchart|graph)\b/.test(trimmed)) return `${trimmed}\n${ROLE_DEFS}`
  return trimmed
}

/** Палитры для themeVariables Mermaid (тема 'base'): детерминированные, согласованы с темой сайта. */
export function mermaidThemeVariables(isDark: boolean) {
  const c = isDark
    ? { text: '#e5e7eb', bg: '#1b1b1f', soft: '#26272d', line: '#9ca3af', border: '#3c3f44', brand: '#33c6ea' }
    : { text: '#1f2937', bg: '#ffffff', soft: '#f3f4f6', line: '#6b7280', border: '#d1d5db', brand: '#00849e' }
  return {
    // Без darkMode базовая тема считает «производные» цвета как для светлого фона (строки ER-таблиц становятся белыми).
    darkMode: isDark,
    background: c.bg,
    fontSize: '15px',
    textColor: c.text,
    primaryColor: c.soft,
    primaryTextColor: c.text,
    primaryBorderColor: c.brand,
    secondaryColor: c.soft,
    tertiaryColor: c.bg,
    lineColor: c.line,
    mainBkg: c.soft,
    nodeBorder: c.brand,
    clusterBkg: 'transparent',
    clusterBorder: c.border,
    edgeLabelBackground: c.bg,
    actorBkg: c.soft,
    actorBorder: c.brand,
    actorTextColor: c.text,
    actorLineColor: c.line,
    signalColor: c.text,
    signalTextColor: c.text,
    labelBoxBkgColor: c.soft,
    labelBoxBorderColor: c.brand,
    labelTextColor: c.text,
    loopTextColor: c.text,
    noteBkgColor: c.soft,
    noteTextColor: c.text,
    noteBorderColor: c.border,
    activationBkgColor: c.soft,
    activationBorderColor: c.brand,
    sequenceNumberColor: c.bg,
    // ER и состояния (имена переменных разные в разных версиях Mermaid 11 — задаём оба набора)
    attributeBackgroundColorOdd: c.bg,
    attributeBackgroundColorEven: c.soft,
    rowOdd: c.bg,
    rowEven: c.soft,
    transitionColor: c.line,
    stateBkg: c.soft,
    stateLabelColor: c.text,
  }
}
