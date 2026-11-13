# Глава 16. Linux, сеть, CI/CD и деплой

**Цели главы:** уверенно работать на Linux-сервере; понимать сетевой путь запроса (DNS, TLS, прокси); автоматизировать проверку и выкатку; задеплоить стек с HTTPS на сервер; знать, как выкатывать без простоя и откатываться; понимать, где место Kubernetes.

⏱ ~1,5 недели · предыдущая: [Глава 15](15-observability.md) · следующая: [Глава 17](17-system-design.md)

---

## 16.1. Linux для бэкендера

Почти все серверы работают под Linux. Ваша цель — не администрирование, а **способность зайти по SSH, понять, что происходит, и починить**.

### Подключение

```bash
ssh-keygen -t ed25519 -C "you@laptop"          # создать ключ (приватный остаётся у вас!)
ssh-copy-id deploy@203.0.113.10                # положить публичный ключ на сервер
ssh deploy@203.0.113.10                        # войти
scp ./api deploy@203.0.113.10:/opt/todo/       # скопировать файл;  rsync -avz — для каталогов
```

Вход **по ключам**, парольную аутентификацию SSH отключают (`PasswordAuthentication no` в `/etc/ssh/sshd_config`), root-вход — тоже.

### Основные команды

| Область | Команды |
|---|---|
| Файлы | `ls -la`, `cd`, `cat`, `less`, `tail -f`, `cp`, `mv`, `rm`, `mkdir -p`, `find`, `du -sh`, `df -h` |
| Поиск и текст | `grep -rn`, `sed`, `awk`, `jq` (JSON!), `sort`, `uniq`, `wc`, `head` |
| Права | `chmod 640 f`, `chown user:group f`, `sudo`; формат `rwx` для владельца/группы/остальных |
| Процессы | `ps aux`, `top`/`htop`, `kill PID` (SIGTERM), `kill -9` (SIGKILL — крайняя мера), `pgrep` |
| Сеть | `ss -tlnp` (кто слушает порт), `curl -v`, `dig example.com`, `ping`, `traceroute` |
| Ресурсы | `free -h` (память), `uptime` (нагрузка), `iostat`, `vmstat` |
| Пакеты (Debian/Ubuntu) | `apt update && apt install …`, `apt upgrade` |
| Службы | `systemctl status|start|stop|restart|enable <unit>`, `journalctl -u <unit> -f` |
| Планировщик | `crontab -e` — `0 3 * * * /opt/backup.sh` |

**Ключевые идеи:**

- «Всё — файл»; конфиги в `/etc`, логи в `/var/log` и `journalctl`, программы в `/usr/bin`, `/opt`, данные в `/var/lib`.
- **Принцип минимальных привилегий:** сервис запускается от **собственного непривилегированного пользователя**, не root.
- **Сигналы:** `SIGTERM` — «пожалуйста, завершись» (ваш graceful shutdown), `SIGKILL` — немедленно, без возможности очистки. Docker и Kubernetes сначала шлют `SIGTERM`, ждут, затем `SIGKILL`.
- Переменные окружения — основной способ настройки; в `systemd` — `EnvironmentFile=`.

### Файрвол и безопасность сервера

```bash
sudo ufw default deny incoming
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
sudo ufw enable
```

Наружу — только 22 (SSH), 80, 443. **БД, Redis и служебные порты (`/metrics`, `pprof`) наружу не открываются.** Дополнительно: автообновления безопасности (`unattended-upgrades`), `fail2ban` против перебора SSH.

## 16.2. Сеть: путь от браузера до вашего процесса

```mermaid
flowchart TB
  D["example.com"]:::client -- "DNS" --> IP["203.0.113.10"]:::external
  IP -- "TCP :443" --> T["TLS-рукопожатие"]:::external -- "HTTP/2" --> P["Caddy / nginx: терминирует TLS"]:::external
  P -- "HTTP по внутренней сети" --> G["Go-сервис :8080"]:::service
```

| Понятие | Суть |
|---|---|
| **IP-адрес и порт** | адрес машины и «дверь» программы (80 — HTTP, 443 — HTTPS, 5432 — Postgres) |
| **DNS** | имя → IP: запись **A** (IPv4), **AAAA** (IPv6), **CNAME** (псевдоним); **TTL** — как долго кэшировать (смена IP «расползается» не мгновенно) |
| **TCP vs UDP** | TCP — надёжный упорядоченный поток (HTTP/1.1, HTTP/2); UDP — без гарантий (DNS, HTTP/3/QUIC, видео) |
| **TLS** | шифрование и аутентификация сервера по **сертификату**, выданному доверенным центром; **Let's Encrypt** — бесплатно и автоматически |
| **HTTP/1.1, /2, /3** | /2 — мультиплексирование запросов в одном соединении; /3 — поверх QUIC |
| **Reverse proxy** | принимает внешний трафик, терминирует TLS, раздаёт статику, кэширует, балансирует, отдаёт запросы приложению |
| **Load balancer** | распределяет запросы между экземплярами: L4 (по TCP) и L7 (по HTTP: путь, заголовки); health-check убирает больные экземпляры |
| **NAT, localhost, 0.0.0.0** | `127.0.0.1` — только своя машина; `0.0.0.0` — все интерфейсы (в контейнере слушайте `0.0.0.0`/`:8080`, иначе извне не достучаться) |

Диагностика «не открывается»: `dig` (резолвится ли имя?) → `ping`/`curl -v` (доходит ли TCP, что с TLS?) → `ss -tlnp` на сервере (слушает ли процесс нужный порт на нужном интерфейсе?) → файрвол → логи.

## 16.3. Где запускать

| Вариант | Что это | Для кого |
|---|---|---|
| **VPS + Docker Compose + Caddy** | аренда виртуалки (Hetzner, DigitalOcean, Selectel…) | **ваш старт**: дёшево, прозрачно, вы всё понимаете |
| PaaS | Fly.io, Railway, Render: «пушишь образ — получаешь URL» | быстрый запуск, меньше контроля |
| Serverless-контейнеры | Google Cloud Run, AWS Fargate/ECS | автомасштабирование без управления серверами |
| **Kubernetes** (управляемый) | GKE, EKS, AKS, Yandex MKS | много сервисов и команд; сложность оправдана масштабом |
| Управляемые БД | облачный Postgres (бэкапы, реплики, обновления «из коробки») | **стоит брать для продакшена**: БД — самое ценное |

Рекомендация: начните с одной VPS. Когда понимание придёт — переходите на управляемые сервисы осознанно.

## 16.4. Деплой Compose-стека за Caddy с HTTPS

**Caddy** — веб-сервер/прокси, который **сам получает и продлевает сертификаты** Let's Encrypt. Для этого нужны: домен, A-запись на IP сервера, открытые порты 80 и 443.

```
# Caddyfile
example.com {
	encode gzip zstd

	# /api/* → Go-сервис (префикс /api отбрасывается)
	handle_path /api/* {
		reverse_proxy api:8080
	}

	# всё остальное — статика Angular
	handle {
		root * /srv
		try_files {path} /index.html
		file_server
	}
}
```

```yaml
# compose.yaml (продакшен): добавляем прокси к стеку из главы 9
services:
  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./frontend-dist:/srv:ro            # собранный Angular (ng build)
      - caddy_data:/data                   # сертификаты — НЕ терять между рестартами
    depends_on:
      - api
    restart: unless-stopped

  api:
    image: ghcr.io/you/todo-api:latest     # образ из реестра, а не сборка на сервере
    env_file: .env
    restart: unless-stopped
    # ports НЕ публикуем — доступен только caddy по внутренней сети

volumes:
  caddy_data:
```

Порядок выкатки вручную:

```bash
ssh deploy@server
cd /srv/todo
docker compose pull            # скачать новые образы
docker compose up -d           # пересоздать изменившиеся контейнеры
docker compose logs -f api     # убедиться, что всё поднялось
```

Без домена локально: в Caddyfile вместо `example.com` — `localhost` (Caddy выпустит локальный сертификат), или `:80` для голого HTTP.

### Вариант без Docker: systemd

```ini
# /etc/systemd/system/todo.service
[Unit]
Description=Todo API
After=network-online.target
Wants=network-online.target

[Service]
User=todo
Group=todo
EnvironmentFile=/etc/todo/env
ExecStart=/opt/todo/api
Restart=on-failure
RestartSec=2
# жёсткая песочница:
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now todo
journalctl -u todo -f
```

Go-бинарник статический — деплой может быть буквально `scp api server:/opt/todo/api && systemctl restart todo`. Docker даёт воспроизводимое окружение, systemd — минимум движущихся частей.

## 16.5. CI/CD

```mermaid
flowchart TB
  C["git push / PR"]:::client --> L["vet + lint"]:::service --> T["test -race + integration"]:::service --> V["govulncheck"]:::service --> I["build + push образа (git sha)"]:::service --> D["deploy: compose pull и up -d"]:::ok
  D -. "откат: деплой предыдущего sha" .-> I
```

- **CI (Continuous Integration):** при каждом push/PR автоматически собирать, проверять и тестировать. Красный CI блокирует слияние.
- **CD:** *Delivery* — всегда есть готовый к выкатке артефакт (образ), выкат — по кнопке; *Deployment* — выкатывается автоматически после зелёного CI.

**Пайплайн типичного Go-сервиса:** `lint → test (+race, +integration) → vulnerability scan → build image → push в реестр → deploy`.

```yaml
# .github/workflows/ci.yml
name: ci

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version-file: go.mod
          cache: true
      - run: go vet ./...
      - uses: golangci/golangci-lint-action@v6
      - name: Tests (race + integration)
        run: go test -race -cover -tags=integration ./...
        env:
          TEST_DATABASE_URL: postgres://postgres:test@localhost:5432/test?sslmode=disable
      - name: Vulnerability scan
        run: go run golang.org/x/vuln/cmd/govulncheck@latest ./...

  image:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:${{ github.sha }}
            ghcr.io/${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: image
    runs-on: ubuntu-latest
    environment: production        # защищённое окружение: ручное подтверждение, свои секреты
    steps:
      - name: Deploy over SSH
        uses: appleboy/ssh-action@v1  # сторонний action: зафиксируйте версию по SHA коммита
        with:
          host: ${{ secrets.SSH_HOST }}
          username: deploy
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /srv/todo
            docker compose pull
            docker compose up -d --remove-orphans
```

> Версии действий (`@v4`, `@v5`…) устаревают — сверяйтесь с актуальными мажорными версиями в документации. Сторонние actions с доступом к вашим секретам — риск цепочки поставок: фиксируйте по SHA, предпочитайте официальные.

**Практики:**

- **Секреты** — только в хранилище CI (`secrets.*`), не в репозитории; для пулл-реквестов из форков они недоступны намеренно.
- **Теги образов** — по `git sha` (точная прослеживаемость) и/или семантической версии; `latest` — только удобство.
- **Branch protection:** `main` защищён — слияние только через PR с зелёным CI и ревью.
- **Кэширование** зависимостей и слоёв Docker ускоряет пайплайн.
- **Окружения:** `dev` → `staging` (копия прода, на ней проверяют релиз и миграции) → `production`.
- **Откат** — самое быстрое лекарство: повторный деплой предыдущего образа (`image: …:<предыдущий sha>`). Поэтому образы **неизменяемы**, а старые версии хранятся.
- **Миграции БД в деплое:** отдельный шаг **до** запуска нового кода и **обратно-совместимые** (старый код должен работать с новой схемой): паттерн expand → migrate → contract (глава 7).

## 16.6. Стратегии выкатки

| Стратегия | Суть | Плюс | Минус |
|---|---|---|---|
| **Recreate** | остановить старое, запустить новое | просто | простой |
| **Rolling** | заменять экземпляры по одному за health-check'ом | нет простоя, дёшево | две версии работают одновременно → совместимость API и схемы обязательна |
| **Blue-green** | поднять полную копию «green», переключить трафик, «blue» оставить для отката | мгновенный откат | двойные ресурсы |
| **Canary** | отправить 1–5% трафика на новую версию, смотреть метрики, постепенно увеличивать | риск ограничен | нужна автоматика и метрики |
| **Feature flags** | код выкачен, но выключен; включаем по условиям | отделяет деплой от релиза | долг: «мёртвые» флаги |

Для **выката без простоя** сервис должен: отвечать `readyz` только когда готов; по `SIGTERM` перестать принимать новые запросы и **дождаться текущих** (graceful shutdown, глава 6); быть обратно-совместимым с соседней версией.

## 16.7. Kubernetes — обзор

```mermaid
flowchart LR
  U["пользователь"]:::client --> ING["Ingress"]:::external --> SVC["Service<br/>стабильный адрес"]:::service
  SVC --> P1["Pod 1"]:::service
  SVC --> P2["Pod 2"]:::service
  SVC --> P3["Pod 3"]:::service
  DEP["Deployment<br/>replicas: 3, rolling update"]:::data -. "следит за" .-> P1
  CM["ConfigMap / Secret"]:::muted -.-> P1
```

**Kubernetes (K8s)** — оркестратор контейнеров: вы описываете **желаемое состояние** («3 копии этого образа, вот проверки здоровья»), кластер приводит реальность к нему: перезапускает упавшие, раскатывает обновления по шагам, масштабирует.

| Объект | Что это |
|---|---|
| **Pod** | один или несколько контейнеров, общий сетевой адрес; минимальная единица |
| **Deployment** | «хочу N реплик образа X», rolling update и откат |
| **Service** | стабильный адрес и балансировка по подам |
| **Ingress** | входящий HTTP(S)-трафик снаружи → сервисы (nginx/Traefik) |
| **ConfigMap / Secret** | конфигурация и секреты, подключаемые как переменные/файлы |
| **Namespace** | логическая изоляция |
| **HPA** | автомасштабирование по CPU/метрикам |
| **Probes** | `readinessProbe` (принимать ли трафик), `livenessProbe` (перезапускать ли), `startupProbe` |

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: todo-api
spec:
  replicas: 3
  selector:
    matchLabels: { app: todo-api }
  template:
    metadata:
      labels: { app: todo-api }
    spec:
      containers:
        - name: api
          image: ghcr.io/you/todo-api:abc123
          ports:
            - containerPort: 8080
          envFrom:
            - secretRef: { name: todo-secrets }
          readinessProbe:
            httpGet: { path: /readyz, port: 8080 }
            periodSeconds: 5
          livenessProbe:
            httpGet: { path: /healthz, port: 8080 }
            initialDelaySeconds: 10
          resources:
            requests: { cpu: 100m, memory: 64Mi }
            limits: { memory: 128Mi }
---
apiVersion: v1
kind: Service
metadata:
  name: todo-api
spec:
  selector:
    app: todo-api
  ports:
    - port: 80
      targetPort: 8080
```

```bash
kubectl apply -f deploy.yaml
kubectl get pods -w
kubectl logs deploy/todo-api -f
kubectl rollout status deploy/todo-api
kubectl rollout undo deploy/todo-api     # откат
kubectl scale deploy/todo-api --replicas=5
```

Для обучения — локальный кластер [`kind`](https://kind.sigs.k8s.io) или `minikube` (нужен Docker). Берите Kubernetes, когда у вас **много сервисов, несколько команд** и нужна платформа; для одного сервиса он почти всегда избыточен. **IaC** (Terraform/OpenTofu, Pulumi) описывает саму инфраструктуру (серверы, сети, БД) кодом — полезно, как только окружений больше одного.

## 16.8. Эксплуатационная гигиена

- **Бэкапы БД** по расписанию в **другое** хранилище, срок хранения, и регулярная **проверка восстановления** (глава 7).
- **Журнал выкатов** и версия в `/version` (git sha) — понимать, что сейчас работает.
- **Runbook** (инструкция): как задеплоить, откатить, где логи, как восстановить БД, кому писать.
- **Секреты** ротируются; доступ — по минимуму; ключи SSH личные.
- **Стоимость:** следите за счётом; лимиты и бюджеты-алерты в облаке.

---

## Задачи

1. 🟡 **Linux-практика.** Поднимите Ubuntu (WSL2, VM или VPS). Создайте пользователя `deploy` без root-прав, настройте вход по ключу, отключите пароли и root-логин, включите `ufw` (22/80/443), поставьте Docker. Запишите все шаги в `server-setup.md` (воспроизводимый чек-лист).
2. 🟡 **Диагностика сети.** Для любого вашего сайта выполните цепочку: `dig`, `curl -v https://…` (найдите TLS-версию, сертификат, HTTP/2), `ss -tlnp` на своём сервере. Объясните каждую строку вывода `curl -v`. Намеренно «сломайте» (закройте порт ufw, остановите сервис, неверный DNS) и найдите причину по инструкции из 16.2.
3. 🔴 **Деплой стека.** Выкатите стек (Caddy + Angular-статика + Go API + Postgres) на VPS **с настоящим HTTPS** (домен, A-запись, Caddy). Без домена — на локальной VM с `tls internal`. Критерии: `https://…` открывается, API на `/api`, БД наружу закрыта (`nmap`/`ss`), данные переживают `docker compose down && up`.
4. 🟡 **systemd.** Разверните то же приложение **без Docker**: бинарник + unit-файл из 16.4, отдельный пользователь, `EnvironmentFile`. Убейте процесс (`kill -9`) и убедитесь, что systemd его поднял; прочитайте `journalctl`.
5. 🟡 **CI.** Настройте GitHub Actions: `go vet`, `golangci-lint`, `go test -race` (с Postgres как сервис), `govulncheck`. Сделайте PR с намеренно красным тестом и убедитесь, что `main` защищён от слияния.
6. 🟡 **Образ и CD.** Добавьте сборку образа и push в GHCR (по `git sha`), затем деплой на сервер по SSH с окружением `production` (ручное подтверждение). Проверьте полный цикл: правка кода → PR → merge → автоматически новая версия на сервере. Эндпоинт `/version` должен показывать sha.
7. 🟡 **Откат.** Сломайте релиз намеренно (паника на старте). Покажите: `readyz` не проходит, сервис не принимает трафик; затем откатитесь командой деплоя предыдущего тега. Замерьте время от обнаружения до восстановления.
8. 🔴 **Миграция без простоя.** Переименуйте столбец `todos.title` → `todos.name` по схеме expand → migrate → contract **под нагрузкой** (`k6`/`hey` непрерывно): добавьте новый столбец и запись в оба; бэкфилл пачками; переключите чтение; удалите старый. Докажите отсутствием ошибок в отчёте нагрузочного теста.
9. 🔴 **Blue-green.** Две версии API в Compose (`api-blue`, `api-green`), Caddy переключает upstream правкой конфига и `caddy reload`. Выкатите несовместимую версию, переключите, откатите — за секунды и без потерянных запросов.
10. 🟡 **Бэкапы.** Ночной `pg_dump` в сжатый файл → загрузка в объектное хранилище (MinIO в Compose или S3), ротация (хранить 7 ежедневных и 4 еженедельных). **Восстановите** дамп в чистую БД и сравните количество строк. Опишите в `RUNBOOK.md`.
11. 🟡 **Kubernetes локально.** Поднимите `kind`, задеплойте манифесты из 16.7 (образ загрузите `kind load docker-image`). Убейте под (`kubectl delete pod`) — наблюдайте самовосстановление; `scale` до 5; `set image` на новую версию — смотрите rolling update; `rollout undo`. Нарисуйте, какие объекты участвовали в пути запроса.

## Самопроверка

- Опишите путь запроса от браузера до Go-процесса: DNS, TCP, TLS, прокси.
- Что делает reverse proxy? Чем L4 от L7 балансировки отличается?
- Почему БД и `/metrics` не должны быть доступны снаружи? Как это обеспечить на сервере и в Docker?
- Чем `SIGTERM` отличается от `SIGKILL`, и почему это важно для graceful shutdown?
- Чем CI отличается от CD? Какие шаги в типичном пайплайне Go-сервиса?
- Как откатываться быстро? Почему образы должны быть неизменяемыми?
- Что такое rolling, blue-green, canary? Какие требования предъявляет rolling к API и схеме БД?
- Зачем нужны `readinessProbe` и `livenessProbe`?
- Что такое Pod, Deployment, Service, Ingress?
- Когда Kubernetes оправдан, а когда нет?

➡️ Дальше: [Глава 17. Проектирование систем](17-system-design.md)
