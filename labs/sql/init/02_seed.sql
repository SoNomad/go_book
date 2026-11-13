-- Детерминированные данные: в ответах задач все числа проверяемы.

INSERT INTO categories (id, name) VALUES
    (1, 'Electronics'),
    (2, 'Books'),
    (3, 'Clothing'),
    (4, 'Toys');                       -- намеренно БЕЗ товаров

INSERT INTO users (id, email, name, country, created_at) VALUES
    (1, 'anna@example.com',  'Anna',  'RU', '2025-12-01 09:00:00+00'),
    (2, 'boris@example.com', 'Boris', 'RU', '2025-12-15 12:30:00+00'),
    (3, 'chen@example.com',  'Chen',  'CN', '2026-01-05 08:15:00+00'),
    (4, 'dana@example.com',  'Dana',  'DE', '2026-02-01 17:45:00+00'),
    (5, 'eve@example.com',   'Eve',   'DE', '2026-02-20 10:00:00+00'),   -- без заказов
    (6, 'frank@example.com', 'Frank', 'US', '2026-03-10 14:20:00+00');   -- без заказов

INSERT INTO products (id, category_id, name, price, stock) VALUES
    (1, 1, 'Smartphone',   599.00,  10),
    (2, 1, 'Headphones',    89.90,  50),
    (3, 1, 'Laptop',      1299.00,   5),
    (4, 2, 'Go in Action',  35.00, 100),
    (5, 2, 'SQL Quickly',   25.50,  80),
    (6, 3, 'T-Shirt',       15.00, 200),
    (7, 3, 'Jacket',       120.00,   0),   -- нет на складе
    (8, 3, 'Socks',          5.00, 500);   -- ни разу не заказывали

INSERT INTO orders (id, user_id, status, created_at) VALUES
    (1, 1, 'paid',      '2026-01-10 10:00:00+00'),
    (2, 1, 'shipped',   '2026-02-05 11:30:00+00'),
    (3, 2, 'new',       '2026-02-20 09:15:00+00'),
    (4, 3, 'paid',      '2026-03-01 13:00:00+00'),
    (5, 3, 'cancelled', '2026-03-15 16:45:00+00'),
    (6, 4, 'shipped',   '2026-03-20 08:30:00+00'),
    (7, 1, 'paid',      '2026-04-02 19:10:00+00'),
    (8, 2, 'paid',      '2026-04-10 12:00:00+00');

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    (1, 2, 1,   89.90), (1, 4, 2,   35.00),
    (2, 1, 1,  599.00),
    (3, 5, 1,   25.50), (3, 6, 3,   15.00),
    (4, 3, 1, 1299.00), (4, 2, 2,   89.90),
    (5, 7, 1,  120.00),
    (6, 4, 1,   35.00), (6, 5, 2,   25.50), (6, 6, 1, 15.00),
    (7, 1, 1,  599.00), (7, 2, 1,   89.90),
    (8, 6, 2,   15.00), (8, 4, 1,   35.00);

-- Мы вставили id вручную, поэтому «подвинем» счётчики идентификаторов,
-- иначе следующий INSERT без id попытается использовать уже занятый 1.
SELECT setval(pg_get_serial_sequence('categories', 'id'), (SELECT max(id) FROM categories));
SELECT setval(pg_get_serial_sequence('users',      'id'), (SELECT max(id) FROM users));
SELECT setval(pg_get_serial_sequence('products',   'id'), (SELECT max(id) FROM products));
SELECT setval(pg_get_serial_sequence('orders',     'id'), (SELECT max(id) FROM orders));
