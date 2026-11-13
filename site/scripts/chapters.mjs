// Структура сайта: части и главы (slug = имя файла без .md; 'index' — главная из README.md).
// Используется и скриптом синхронизации, и конфигом VitePress (сайдбар).

export const PARTS = [
  {
    text: 'Старт',
    items: [
      ['index', 'Дорожная карта'],
      ['progress', 'Мой прогресс'],
      ['00-podgotovka', '0. Как устроен бэкенд'],
    ],
  },
  {
    text: 'I. Язык Go',
    items: [
      ['01-osnovy-go', '1. Основы Go'],
      ['02-sostavnye-tipy', '2. Составные типы'],
      ['03-metody-interfejsy-oshibki', '3. Методы, интерфейсы, ошибки'],
      ['04-moduli-testy-generiki', '4. Модули, тесты, дженерики'],
      ['05-konkurentnost', '5. Конкурентность'],
    ],
  },
  {
    text: 'II. Ядро бэкенда',
    items: [
      ['06-http-server', '6. HTTP-сервер'],
      ['07-sql-postgres', '7. SQL и PostgreSQL'],
      ['08-go-i-bd', '8. Go и базы данных'],
      ['09-docker', '9. Docker'],
      ['10-auth-bezopasnost', '10. Аутентификация и безопасность'],
      ['11-arhitektura', '11. Архитектура приложения'],
      ['12-testirovanie', '12. Тестирование'],
    ],
  },
  {
    text: 'III. Продакшен',
    items: [
      ['13-redis-ocheredi', '13. Кэш, Redis, очереди'],
      ['14-api-grpc', '14. Проектирование API, gRPC'],
      ['15-observability', '15. Наблюдаемость'],
      ['16-linux-cicd-deploy', '16. Linux, CI/CD, деплой'],
      ['17-system-design', '17. Проектирование систем'],
    ],
  },
  {
    text: 'Финал',
    items: [
      ['18-capstone', '18. Итоговый проект «Tasker»'],
      ['cheatsheet', 'Шпаргалка TypeScript ↔ Go'],
    ],
  },
]

export const ALL_SLUGS = PARTS.flatMap((p) => p.items.map(([slug]) => slug))
