-- Balanced demo ratings for the Node.js application.
-- Run this after schema.sql, seed-data.sql, and triggers.sql.
-- It keeps equal sample sizes while giving each canteen a different strength:
-- BAPPA = value, IMDR = speed, MEDIA = quality/cleanliness/hygiene.

BEGIN;

DELETE FROM dish_ratings;
DELETE FROM criteria_ratings;

WITH rating_rows(cid, n, price, quality, cleanliness, speed, hygiene) AS (
    VALUES
        (1,1,5,4,3,3,3),(1,2,5,4,4,3,4),(1,3,4,4,3,4,4),
        (1,4,5,3,4,3,3),(1,5,4,4,4,3,4),(1,6,5,4,3,4,4),
        (1,7,4,3,4,3,3),(1,8,5,4,4,4,4),(1,9,4,4,3,3,4),
        (2,1,4,4,4,5,4),(2,2,4,3,4,5,4),(2,3,3,4,3,5,3),
        (2,4,4,4,4,4,4),(2,5,4,3,4,5,4),(2,6,3,4,3,4,3),
        (2,7,4,4,4,5,4),(2,8,4,3,4,5,4),(2,9,3,4,3,4,3),
        (3,1,4,5,5,4,5),(3,2,4,4,5,4,5),(3,3,3,5,4,4,4),
        (3,4,4,5,5,4,5),(3,5,4,4,5,4,5),(3,6,3,5,4,4,4),
        (3,7,4,5,5,4,5),(3,8,4,4,5,4,5),(3,9,3,5,4,4,4)
)
INSERT INTO criteria_ratings
    (user_id, cid, price_rating, quality_rating, cleanliness_rating, speed_rating, hygiene_rating)
SELECT
    (SELECT user_id FROM users WHERE role IN ('student', 'faculty')
     ORDER BY user_id OFFSET ((n - 1) % 3) LIMIT 1),
    cid,
    price, quality, cleanliness, speed, hygiene
FROM rating_rows
;

INSERT INTO dish_ratings (user_id, itemid, rating)
SELECT
    (SELECT user_id FROM users WHERE role IN ('student', 'faculty')
     ORDER BY user_id OFFSET (r - 1) LIMIT 1),
    m.itemid,
    CASE m.cid
        WHEN 1 THEN (ARRAY[4, 5, 4])[r]
        WHEN 2 THEN (ARRAY[3, 4, 4])[r]
        ELSE (ARRAY[4, 5, 5])[r]
    END
FROM menu_items m
CROSS JOIN generate_series(1, 3) AS r
WHERE m.is_available = TRUE;

COMMIT;
