-- Эталонные решения к задачам главы 7. Сначала решайте сами!
-- Запуск целиком:  psql postgres://study:study@localhost:5432/shop -f solutions.sql
-- Задачи 22–26 ИЗМЕНЯЮТ данные; для чистого повтора: docker compose down -v && docker compose up -d

SET TIME ZONE 'UTC';

-- @task 1: пользователи из Германии, по имени
SELECT name, email
FROM users
WHERE country = 'DE'
ORDER BY name;

-- @task 2: товары дороже 50, сначала дешёвые
SELECT name, price
FROM products
WHERE price > 50
ORDER BY price;

-- @task 3: агрегаты по товарам
SELECT count(*)             AS total,
       min(price)           AS min_price,
       max(price)           AS max_price,
       round(avg(price), 2) AS avg_price
FROM products;

-- @task 4: имя начинается на A ИЛИ email содержит chen (без учёта регистра)
SELECT name, email
FROM users
WHERE name ILIKE 'a%' OR email ILIKE '%chen%'
ORDER BY id;

-- @task 5: товаров мало (< 10 штук), самые дефицитные сверху
SELECT name, stock
FROM products
WHERE stock < 10
ORDER BY stock, name;

-- @task 6: три самых дорогих товара
SELECT name, price
FROM products
ORDER BY price DESC
LIMIT 3;

-- @task 7: страны пользователей без повторов
SELECT DISTINCT country
FROM users
ORDER BY country;

-- @task 8: сколько пользователей в каждой стране
SELECT country, count(*) AS users
FROM users
GROUP BY country
ORDER BY users DESC, country;

-- @task 9: товар + название категории
SELECT p.name AS product, c.name AS category
FROM products p
JOIN categories c ON c.id = p.category_id
ORDER BY c.name, p.name;

-- @task 10: все категории и число товаров, включая пустые (LEFT JOIN + count по столбцу!)
SELECT c.name, count(p.id) AS products
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;

-- @task 11: пользователи, ни разу не делавшие заказ
SELECT u.name
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.id IS NULL
ORDER BY u.name;

-- @task 12: сумма каждого оплаченного/отправленного заказа
SELECT o.id, o.status, sum(oi.quantity * oi.unit_price) AS total
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status IN ('paid', 'shipped')
GROUP BY o.id, o.status
ORDER BY o.id;

-- @task 13: выручка по категориям (только paid/shipped)
SELECT c.name AS category, sum(oi.quantity * oi.unit_price) AS revenue
FROM order_items oi
JOIN orders o     ON o.id = oi.order_id
JOIN products p   ON p.id = oi.product_id
JOIN categories c ON c.id = p.category_id
WHERE o.status IN ('paid', 'shipped')
GROUP BY c.name
ORDER BY revenue DESC;

-- @task 14: покупатели, потратившие больше 500 (WHERE — до группировки, HAVING — после)
SELECT u.name,
       count(DISTINCT o.id)               AS orders,
       sum(oi.quantity * oi.unit_price)   AS spent
FROM users u
JOIN orders o       ON o.user_id = u.id
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status IN ('paid', 'shipped')
GROUP BY u.id, u.name
HAVING sum(oi.quantity * oi.unit_price) > 500
ORDER BY spent DESC;

-- @task 15: товары дороже среднего (скалярный подзапрос)
SELECT name, price
FROM products
WHERE price > (SELECT avg(price) FROM products)
ORDER BY price DESC;

-- @task 16: самый дорогой товар в каждой категории (DISTINCT ON — особенность PostgreSQL)
SELECT DISTINCT ON (c.id) c.name AS category, p.name AS product, p.price
FROM products p
JOIN categories c ON c.id = p.category_id
ORDER BY c.id, p.price DESC;

-- @task 17: дата первого заказа и сколько дней прошло с регистрации
SELECT u.name,
       min(o.created_at)::date                         AS first_order,
       min(o.created_at)::date - u.created_at::date    AS days_to_first_order
FROM users u
JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name
ORDER BY u.id;

-- @task 18: нарастающий итог выручки по заказам (оконная функция)
WITH paid AS (
    SELECT o.id, o.created_at, sum(oi.quantity * oi.unit_price) AS total
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.status IN ('paid', 'shipped')
    GROUP BY o.id, o.created_at
)
SELECT id,
       created_at::date                            AS day,
       total,
       sum(total) OVER (ORDER BY created_at)       AS running_total
FROM paid
ORDER BY created_at;

-- @task 19: рейтинг покупателей внутри страны по потраченной сумме
WITH spent AS (
    SELECT u.id, u.name, u.country,
           coalesce(sum(oi.quantity * oi.unit_price), 0) AS total
    FROM users u
    LEFT JOIN orders o       ON o.user_id = u.id AND o.status IN ('paid', 'shipped')
    LEFT JOIN order_items oi ON oi.order_id = o.id
    GROUP BY u.id, u.name, u.country
)
SELECT country, name, total,
       rank() OVER (PARTITION BY country ORDER BY total DESC) AS rnk
FROM spent
ORDER BY country, rnk, name;

-- @task 20: заказы и выручка по месяцам
SELECT to_char(date_trunc('month', o.created_at), 'YYYY-MM') AS month,
       count(DISTINCT o.id)                                  AS orders,
       sum(oi.quantity * oi.unit_price)                      AS revenue
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status IN ('paid', 'shipped')
GROUP BY 1
ORDER BY 1;

-- @task 21: товары, которые никогда не заказывали
SELECT p.name
FROM products p
WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id)
ORDER BY p.name;

-- @task 22a: вставка с получением сгенерированного id
INSERT INTO users (email, name, country)
VALUES ('gina@example.com', 'Gina', 'FR')
RETURNING id, name;

-- @task 22b: то же самое ещё раз — ожидаем ошибку уникальности (SQLSTATE 23505)
INSERT INTO users (email, name, country)
VALUES ('gina@example.com', 'Gina Clone', 'FR');

-- @task 22c: UPSERT — при конфликте обновить имя
INSERT INTO users (email, name, country)
VALUES ('gina@example.com', 'Gina Updated', 'FR')
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
RETURNING id, name;

-- @task 23a: безопасное уменьшение остатка: условие в WHERE делает операцию атомарной
UPDATE products SET stock = stock - 1
WHERE id = 1 AND stock > 0
RETURNING id, stock;

-- @task 23b: для товара с нулевым остатком — 0 строк изменено
UPDATE products SET stock = stock - 1
WHERE id = 7 AND stock > 0
RETURNING id, stock;

-- @task 24: транзакция «всё или ничего» — второй UPDATE нарушит CHECK (stock >= 0)
BEGIN;
INSERT INTO orders (user_id, status) VALUES (5, 'new');
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT currval(pg_get_serial_sequence('orders', 'id')), id, 1, price FROM products WHERE id = 3;
UPDATE products SET stock = stock - 1 WHERE id = 3;
UPDATE products SET stock = stock - 1 WHERE id = 7;
ROLLBACK;
SELECT (SELECT count(*) FROM orders WHERE user_id = 5)          AS orders_of_eve,
       (SELECT stock FROM products WHERE id = 3)                AS laptop_stock;

-- @task 25a: ограничение целостности на уровне БД
ALTER TABLE users ADD CONSTRAINT users_country_iso2 CHECK (country ~ '^[A-Z]{2}$');

-- @task 25b: нарушение — ожидаем ошибку
INSERT INTO users (email, name, country) VALUES ('bad@example.com', 'Bad', 'Germany');

-- @task 26a: миллион строк для эксперимента с индексом
CREATE TABLE events AS
SELECT g                                           AS id,
       g % 10000                                   AS user_id,
       now() - (g || ' seconds')::interval         AS created_at,
       md5(g::text)                                AS payload
FROM generate_series(1, 1000000) AS g;
ANALYZE events;

-- @task 26b: без индекса — Seq Scan
EXPLAIN ANALYZE SELECT * FROM events WHERE user_id = 4242;

-- @task 26c: создаём индекс
CREATE INDEX idx_events_user_id ON events (user_id);
ANALYZE events;

-- @task 26d: с индексом — Index/Bitmap Scan
EXPLAIN ANALYZE SELECT * FROM events WHERE user_id = 4242;
