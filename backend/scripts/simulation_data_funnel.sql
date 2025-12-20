-- ============================================
-- Aller Analytics - 자연스러운 퍼널 시뮬레이션 데이터
-- MySQL 8.0+
-- 
-- 실행 전: 기존 데이터 삭제 쿼리 먼저 실행 권장
-- ============================================

-- ============================================
-- 0. 기존 데이터 정리 (주석 해제하여 사용)
-- ============================================
DELETE FROM event_logs;
DELETE FROM search_queries;
DELETE FROM recommendation_feedback;
DELETE FROM user_sessions;

-- Auto increment 리셋
ALTER TABLE event_logs AUTO_INCREMENT = 1;
ALTER TABLE search_queries AUTO_INCREMENT = 1;
ALTER TABLE recommendation_feedback AUTO_INCREMENT = 1;


-- ============================================
-- 1. user_sessions 생성 (30일, 하루 25~35세션)
-- ============================================
INSERT INTO user_sessions (
    session_id, user_id, device_type, browser, os,
    referrer_source, utm_source, utm_medium,
    landing_page, started_at, ended_at,
    page_view_count, event_count, is_bounce
)
WITH RECURSIVE date_seq AS (
    SELECT DATE_SUB(CURDATE(), INTERVAL 30 DAY) AS dt, 1 AS day_num
    UNION ALL
    SELECT DATE_ADD(dt, INTERVAL 1 DAY), day_num + 1 
    FROM date_seq WHERE day_num < 31
),
session_nums AS (
    SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
    UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
    UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
    UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20
    UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24 UNION ALL SELECT 25
    UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL SELECT 29 UNION ALL SELECT 30
)
SELECT
    UUID() AS session_id,
    -- 로그인 필수 서비스: 모든 세션에 user_id 존재 (1~20번 유저)
    FLOOR(1 + RAND() * 20) AS user_id,
    ELT(1 + FLOOR(RAND() * 10), 
        'mobile','mobile','mobile','mobile','mobile','mobile',
        'desktop','desktop','desktop','tablet'
    ) AS device_type,
    ELT(1 + FLOOR(RAND() * 4), 'Chrome', 'Safari', 'Firefox', 'Edge') AS browser,
    ELT(1 + FLOOR(RAND() * 4), 'Windows', 'macOS', 'iOS', 'Android') AS os,
    ELT(1 + FLOOR(RAND() * 5), 'direct', 'google', 'naver', 'instagram', 'kakao') AS referrer_source,
    CASE WHEN RAND() < 0.25 THEN ELT(1 + FLOOR(RAND() * 3), 'google', 'facebook', 'instagram') ELSE NULL END,
    CASE WHEN RAND() < 0.25 THEN ELT(1 + FLOOR(RAND() * 3), 'cpc', 'organic', 'social') ELSE NULL END,
    ELT(1 + FLOOR(RAND() * 4), '/', '/dashboard', '/features', '/chat') AS landing_page,
    DATE_ADD(d.dt, INTERVAL FLOOR(RAND() * 86400) SECOND) AS started_at,
    DATE_ADD(DATE_ADD(d.dt, INTERVAL FLOOR(RAND() * 86400) SECOND), INTERVAL FLOOR(60 + RAND() * 1800) SECOND) AS ended_at,
    FLOOR(1 + RAND() * 10) AS page_view_count,
    FLOOR(RAND() * 15) AS event_count,
    CASE WHEN RAND() < 0.25 THEN 1 ELSE 0 END AS is_bounce
FROM date_seq d
CROSS JOIN session_nums s
WHERE RAND() < 0.95;


-- ============================================
-- 2. 퍼널 기반 이벤트 생성
-- 
-- 퍼널 전환율:
-- Step 1: Visit (page_view) = 100%
-- Step 2: Browse (ingredient_click) = 65%
-- Step 3: Engage (preference/caution_add) = 35%
-- Step 4: Favorite (favorite_add) = 12%
-- Step 5: Outbound (outbound_click) = 8%
-- ============================================

-- 2-1. Step 1: 모든 세션에 page_view (100%)
INSERT INTO event_logs (session_id, user_id, event_type, event_target, target_id, page_url, created_at)
SELECT 
    session_id, user_id, 'page_view', NULL, NULL,
    ELT(1 + FLOOR(RAND() * 5), '/', '/dashboard', '/features', '/chat', '/profile'),
    DATE_ADD(started_at, INTERVAL FLOOR(RAND() * 60) SECOND)
FROM user_sessions;

-- 추가 page_view (평균 3개 더)
INSERT INTO event_logs (session_id, user_id, event_type, event_target, target_id, page_url, created_at)
SELECT 
    session_id, user_id, 'page_view', NULL, NULL,
    ELT(1 + FLOOR(RAND() * 5), '/', '/dashboard', '/features', '/chat', '/profile'),
    DATE_ADD(started_at, INTERVAL FLOOR(60 + RAND() * 300) SECOND)
FROM user_sessions WHERE RAND() < 0.8;

INSERT INTO event_logs (session_id, user_id, event_type, event_target, target_id, page_url, created_at)
SELECT 
    session_id, user_id, 'page_view', NULL, NULL,
    ELT(1 + FLOOR(RAND() * 5), '/', '/dashboard', '/features', '/chat', '/profile'),
    DATE_ADD(started_at, INTERVAL FLOOR(120 + RAND() * 300) SECOND)
FROM user_sessions WHERE RAND() < 0.6;


-- 2-2. Step 2: Browse - ingredient_click (65% of visitors)
-- 임시 테이블로 "브라우저" 세션 선별
DROP TEMPORARY TABLE IF EXISTS temp_browsers;
CREATE TEMPORARY TABLE temp_browsers AS
SELECT session_id, user_id, started_at
FROM user_sessions
WHERE RAND() < 0.65;

INSERT INTO event_logs (session_id, user_id, event_type, event_target, target_id, page_url, created_at)
SELECT 
    session_id, user_id, 'ingredient_click', 'ingredient',
    ELT(1 + FLOOR(RAND() * 10), 
        '나이아신아마이드', '히알루론산', '레티놀', '비타민C', '세라마이드',
        '판테놀', '글리세린', '알부틴', '센텔라', '아데노신'
    ),
    ELT(1 + FLOOR(RAND() * 2), '/chat', '/features'),
    DATE_ADD(started_at, INTERVAL FLOOR(180 + RAND() * 300) SECOND)
FROM temp_browsers;

-- 일부는 2번 클릭
INSERT INTO event_logs (session_id, user_id, event_type, event_target, target_id, page_url, created_at)
SELECT 
    session_id, user_id, 'ingredient_click', 'ingredient',
    ELT(1 + FLOOR(RAND() * 10), 
        '나이아신아마이드', '히알루론산', '레티놀', '비타민C', '세라마이드',
        '판테놀', '글리세린', '알부틴', '센텔라', '아데노신'
    ),
    ELT(1 + FLOOR(RAND() * 2), '/chat', '/features'),
    DATE_ADD(started_at, INTERVAL FLOOR(300 + RAND() * 300) SECOND)
FROM temp_browsers WHERE RAND() < 0.5;


-- 2-3. Step 3: Engage - preference/caution_add (35% of visitors, 54% of browsers)
DROP TEMPORARY TABLE IF EXISTS temp_engagers;
CREATE TEMPORARY TABLE temp_engagers AS
SELECT session_id, user_id, started_at
FROM temp_browsers
WHERE RAND() < 0.54;  -- Browse 중 54%가 Engage

INSERT INTO event_logs (session_id, user_id, event_type, event_target, target_id, event_value, page_url, created_at)
SELECT 
    session_id, user_id, 
    ELT(1 + FLOOR(RAND() * 2), 'preference_add', 'caution_add'),
    'ingredient',
    ELT(1 + FLOOR(RAND() * 8), 
        '나이아신아마이드', '히알루론산', '레티놀', '비타민C', 
        '향료', '알코올', '파라벤', '설페이트'
    ),
    '{"source":"profile"}',
    '/profile',
    DATE_ADD(started_at, INTERVAL FLOOR(400 + RAND() * 300) SECOND)
FROM temp_engagers;


-- 2-4. Step 4: Favorite - favorite_add (12% of visitors, 34% of engagers)
DROP TEMPORARY TABLE IF EXISTS temp_favoriters;
CREATE TEMPORARY TABLE temp_favoriters AS
SELECT session_id, user_id, started_at
FROM temp_engagers
WHERE RAND() < 0.34;

INSERT INTO event_logs (session_id, user_id, event_type, event_target, target_id, page_url, created_at)
SELECT 
    session_id, user_id, 'favorite_add', 'product',
    CAST(FLOOR(1 + RAND() * 200) AS CHAR),
    ELT(1 + FLOOR(RAND() * 2), '/chat', '/features'),
    DATE_ADD(started_at, INTERVAL FLOOR(500 + RAND() * 300) SECOND)
FROM temp_favoriters;


-- 2-5. Step 5: Outbound - outbound_click (8% of visitors, 67% of favoriters)
DROP TEMPORARY TABLE IF EXISTS temp_converters;
CREATE TEMPORARY TABLE temp_converters AS
SELECT session_id, user_id, started_at
FROM temp_favoriters
WHERE RAND() < 0.67;

INSERT INTO event_logs (session_id, user_id, event_type, event_target, target_id, event_value, page_url, created_at)
SELECT 
    session_id, user_id, 'outbound_click', 'product',
    CAST(FLOOR(1 + RAND() * 200) AS CHAR),
    '{"url":"https://shop.example.com/product","product_name":"추천 제품"}',
    ELT(1 + FLOOR(RAND() * 2), '/chat', '/features'),
    DATE_ADD(started_at, INTERVAL FLOOR(600 + RAND() * 300) SECOND)
FROM temp_converters;


-- ============================================
-- 3. search_queries (검색 데이터)
-- 브라우저의 60%가 검색 수행
-- ============================================

INSERT INTO search_queries (
    session_id, user_id, query_text, query_text_normalized, query_type,
    search_method, result_count, clicked_results, first_click_position,
    time_to_first_click_ms, created_at
)
SELECT
    session_id, user_id,
    query_text,
    LOWER(REPLACE(query_text, ' ', '')) AS query_text_normalized,
    'ingredient' AS query_type,
    ELT(1 + FLOOR(RAND() * 3), 'text', 'text', 'autocomplete') AS search_method,
    FLOOR(5 + RAND() * 30) AS result_count,
    CASE WHEN RAND() < 0.55 THEN FLOOR(1 + RAND() * 3) ELSE 0 END AS clicked_results,
    CASE WHEN RAND() < 0.55 THEN FLOOR(1 + RAND() * 5) ELSE NULL END AS first_click_position,
    CASE WHEN RAND() < 0.55 THEN FLOOR(800 + RAND() * 4000) ELSE NULL END AS time_to_first_click_ms,
    DATE_ADD(started_at, INTERVAL FLOOR(100 + RAND() * 200) SECOND) AS created_at
FROM temp_browsers
CROSS JOIN (
    SELECT '나이아신아마이드' AS query_text UNION ALL
    SELECT '히알루론산' UNION ALL SELECT '레티놀' UNION ALL
    SELECT '비타민C' UNION ALL SELECT '세라마이드' UNION ALL
    SELECT '판테놀' UNION ALL SELECT '센텔라' UNION ALL
    SELECT '글리세린' UNION ALL SELECT '알부틴' UNION ALL
    SELECT '펩타이드'
) queries
WHERE RAND() < 0.06;


-- ============================================
-- 4. recommendation_feedback (추천 피드백)
-- 브라우저의 50%가 추천 노출
-- ============================================

INSERT INTO recommendation_feedback (
    session_id, user_id, recommendation_id, algorithm_type, algorithm_version,
    context_type, user_skin_type, shown_products, shown_count,
    clicked_products, clicked_count, favorited_products, favorited_count,
    impression_time_ms, created_at
)
SELECT
    session_id, user_id,
    UUID() AS recommendation_id,
    ELT(1 + FLOOR(RAND() * 4), 'routine', 'baumann_match', 'similar', 'popular') AS algorithm_type,
    'v1' AS algorithm_version,
    ELT(1 + FLOOR(RAND() * 4), 'home', 'search_result', 'product_detail', 'routine') AS context_type,
    ELT(1 + FLOOR(RAND() * 8), 'DRPT', 'DRNT', 'DSPT', 'DSNT', 'ORPT', 'ORNT', 'OSPT', 'OSNT') AS user_skin_type,
    CONCAT('[', FLOOR(1 + RAND() * 100), ',', FLOOR(1 + RAND() * 100), ',', FLOOR(1 + RAND() * 100), ',', FLOOR(1 + RAND() * 100), ']') AS shown_products,
    4 AS shown_count,
    CASE WHEN RAND() < 0.35 THEN CONCAT('[', FLOOR(1 + RAND() * 100), ']') ELSE NULL END AS clicked_products,
    CASE WHEN RAND() < 0.35 THEN 1 ELSE 0 END AS clicked_count,
    CASE WHEN RAND() < 0.12 THEN CONCAT('[', FLOOR(1 + RAND() * 100), ']') ELSE NULL END AS favorited_products,
    CASE WHEN RAND() < 0.12 THEN 1 ELSE 0 END AS favorited_count,
    FLOOR(2000 + RAND() * 8000) AS impression_time_ms,
    DATE_ADD(started_at, INTERVAL FLOOR(200 + RAND() * 400) SECOND) AS created_at
FROM temp_browsers
WHERE RAND() < 0.50;


-- ============================================
-- 5. 임시 테이블 정리
-- ============================================
DROP TEMPORARY TABLE IF EXISTS temp_browsers;
DROP TEMPORARY TABLE IF EXISTS temp_engagers;
DROP TEMPORARY TABLE IF EXISTS temp_favoriters;
DROP TEMPORARY TABLE IF EXISTS temp_converters;


-- ============================================
-- 6. 데이터 검증
-- ============================================

SELECT '=== 시뮬레이션 데이터 생성 완료 ===' AS status;

-- 테이블별 건수
SELECT 'user_sessions' AS table_name, COUNT(*) AS row_count FROM user_sessions
UNION ALL SELECT 'event_logs', COUNT(*) FROM event_logs
UNION ALL SELECT 'search_queries', COUNT(*) FROM search_queries
UNION ALL SELECT 'recommendation_feedback', COUNT(*) FROM recommendation_feedback;

-- 이벤트 타입별 분포
SELECT event_type, COUNT(*) AS cnt,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM event_logs), 1) AS pct
FROM event_logs
GROUP BY event_type
ORDER BY cnt DESC;

-- 퍼널 검증 (고유 사용자 수)
SELECT 
    'Visit (page_view)' AS step,
    COUNT(DISTINCT COALESCE(user_id, session_id)) AS unique_users
FROM event_logs WHERE event_type = 'page_view'
UNION ALL
SELECT 'Browse (ingredient_click)',
    COUNT(DISTINCT COALESCE(user_id, session_id))
FROM event_logs WHERE event_type = 'ingredient_click'
UNION ALL
SELECT 'Engage (pref/caution)',
    COUNT(DISTINCT COALESCE(user_id, session_id))
FROM event_logs WHERE event_type IN ('preference_add', 'caution_add')
UNION ALL
SELECT 'Favorite',
    COUNT(DISTINCT COALESCE(user_id, session_id))
FROM event_logs WHERE event_type = 'favorite_add'
UNION ALL
SELECT 'Outbound',
    COUNT(DISTINCT COALESCE(user_id, session_id))
FROM event_logs WHERE event_type = 'outbound_click';
