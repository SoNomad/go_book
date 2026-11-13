<script setup lang="ts">
import StepPlayer from './StepPlayer.vue'
import type { Step } from '../lib/step-types'

// Актёры: 0 Браузер, 1 DNS, 2 Прокси, 3 Go-сервис, 4 БД
const actors = ['Браузер', 'DNS', 'Прокси', 'Go-сервис', 'БД']

const steps: Step[] = [
  { from: 0, to: 1, text: 'Резолвит имя api.example.com', detail: 'Ищет IP-адрес: сначала кэш браузера и ОС, затем DNS-резолвер.', risk: 'Таймаут DNS или NXDOMAIN — сайт «не открывается» целиком.' },
  { from: 1, to: 0, text: 'Получает IP 203.0.113.10', detail: 'Ответ кэшируется на время TTL записи.', risk: 'После переезда сервера в кэшах ещё живёт старый IP.' },
  { from: 0, to: 2, text: 'TCP + TLS-рукопожатие', detail: 'Сначала TCP, затем TLS: сервер предъявляет сертификат, стороны договариваются о ключах шифрования.', risk: 'Просроченный сертификат, закрытый порт 443, файрвол.' },
  { from: 0, to: 2, text: 'POST /api/todos (JSON)', detail: 'HTTP-запрос: метод, путь, заголовки (Cookie, Content-Type), тело.', risk: 'Слишком большое тело, неверный Content-Type.' },
  { from: 2, to: 3, text: 'Передаёт запрос по HTTP', detail: 'Прокси терминирует TLS, добавляет X-Forwarded-For и X-Request-ID, выбирает экземпляр сервиса.', risk: '502/504, если сервис не отвечает или слишком медленный.' },
  { from: 3, to: 3, text: 'Маршрутизация и middleware', detail: 'ServeMux выбирает обработчик; middleware: request id, логирование, recover, CORS, авторизация.', risk: 'Неверный порядок middleware — паника без записи в лог (см. визуализатор в главе 6).' },
  { from: 3, to: 3, text: 'Обработчик: разбор и валидация', detail: 'Декодирует JSON, проверяет данные (клиенту верить нельзя), вызывает сервисный слой.', risk: 'Невалидный ввод → 400/422; забытая проверка владельца → IDOR.' },
  { from: 3, to: 4, text: 'INSERT … RETURNING id', detail: 'Запрос с плейсхолдерами $1, $2 и контекстом с таймаутом.', risk: 'Медленный запрос, исчерпанный пул соединений, deadlock.' },
  { from: 4, to: 3, text: 'Возвращает id новой строки', detail: 'Транзакция зафиксирована (COMMIT).', risk: 'Нарушение уникальности → 409 Conflict.' },
  { from: 3, to: 2, text: '201 Created + JSON', detail: 'Статус, Content-Type: application/json и тело с созданной задачей.', note: 'ok' },
  { from: 2, to: 0, text: 'Ответ доходит до Angular', detail: 'HttpClient отдаёт значение подписчику, интерфейс обновляется.', risk: 'Сеть оборвалась до ответа — клиент не знает, создана ли задача. Поэтому POST делают идемпотентным (ключ идемпотентности, глава 6).', note: 'ok' },
]
</script>

<template>
  <StepPlayer title="Жизненный цикл запроса: от клика до БД и обратно" :actors="actors" :steps="steps" />
</template>
