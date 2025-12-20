-- ============================================
-- Aller Analytics 시뮬레이션 데이터 생성 스크립트
-- MySQL 8.0+ 용
-- 실행: HeidiSQL에서 전체 선택 후 실행
-- ============================================

-- 기존 시뮬레이션 데이터 정리 (선택사항 - 필요시 주석 해제)
-- DELETE FROM event_logs WHERE created_at > DATE_SUB(NOW(), INTERVAL 31 DAY);
-- DELETE FROM search_queries WHERE created_at > DATE_SUB(NOW(), INTERVAL 31 DAY);
-- DELETE FROM recommendation_feedback WHERE created_at > DATE_SUB(NOW(), INTERVAL 31 DAY);
-- DELETE FROM user_sessions WHERE started_at > DATE_SUB(NOW(), INTERVAL 31 DAY);


-- ============================================
-- 1. user_sessions (세션 데이터) - 약 800건
-- ============================================
-- 30일간 하루 평균 27세션 생성

INSERT INTO user_sessions (
    session_id, user_id, device_type, browser, os,
    referrer_source, utm_source, utm_medium, utm_campaign,
    landing_page, started_at, ended_at,
    page_view_count, event_count, is_bounce
)
WITH RECURSIVE date_seq AS (
    SELECT DATE_SUB(CURDATE(), INTERVAL 30 DAY) AS dt
    UNION ALL
    SELECT DATE_ADD(dt, INTERVAL 1 DAY) FROM date_seq WHERE dt < CURDATE()
),
session_nums AS (
    SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
    UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
    UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
    UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20
    UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24 UNION ALL SELECT 25
    UNION ALL SELECT 26 UNION ALL SELECT 27
)
SELECT
    UUID() AS session_id,
    -- 70% 로그인 유저 (user_id 1~10 중 랜덤), 30% 비로그인
    CASE WHEN RAND() < 0.7 THEN FLOOR(1 + RAND() * 10) ELSE NULL END AS user_id,
    -- 디바이스: mobile 60%, desktop 35%, tablet 5%
    ELT(1 + FLOOR(RAND() * 20), 
        'mobile','mobile','mobile','mobile','mobile','mobile','mobile','mobile','mobile','mobile','mobile','mobile',
        'desktop','desktop','desktop','desktop','desktop','desktop','desktop',
        'tablet'
    ) AS device_type,
    ELT(1 + FLOOR(RAND() * 4), 'Chrome', 'Safari', 'Firefox', 'Edge') AS browser,
    ELT(1 + FLOOR(RAND() * 4), 'Windows', 'macOS', 'iOS', 'Android') AS os,
    ELT(1 + FLOOR(RAND() * 5), 'direct', 'google', 'naver', 'instagram', 'kakao') AS referrer_source,
    CASE WHEN RAND() < 0.3 THEN ELT(1 + FLOOR(RAND() * 3), 'google', 'facebook', 'instagram') ELSE NULL END AS utm_source,
    CASE WHEN RAND() < 0.3 THEN ELT(1 + FLOOR(RAND() * 3), 'cpc', 'organic', 'social') ELSE NULL END AS utm_medium,
    CASE WHEN RAND() < 0.2 THEN ELT(1 + FLOOR(RAND() * 3), 'summer_sale', 'skincare_promo', 'new_user') ELSE NULL END AS utm_campaign,
    ELT(1 + FLOOR(RAND() * 4), '/', '/dashboard', '/features', '/chat') AS landing_page,
    DATE_ADD(d.dt, INTERVAL FLOOR(RAND() * 86400) SECOND) AS started_at,
    DATE_ADD(DATE_ADD(d.dt, INTERVAL FLOOR(RAND() * 86400) SECOND), INTERVAL FLOOR(60 + RAND() * 1800) SECOND) AS ended_at,
    -- 페이지뷰: 1~15
    FLOOR(1 + RAND() * 15) AS page_view_count,
    -- 이벤트: 0~20
    FLOOR(RAND() * 21) AS event_count,
    -- 바운스율 30%
    CASE WHEN RAND() < 0.3 THEN 1 ELSE 0 END AS is_bounce
FROM date_seq d
CROSS JOIN session_nums s
WHERE RAND() < 0.9;  -- 일부 제외하여 자연스러운 분포


-- ============================================
-- 2. event_logs (이벤트 로그) - 약 3000건
-- ============================================

INSERT INTO event_logs (
    session_id, user_id, event_type, event_target, target_id, event_value, page_url, created_at
)
SELECT
    us.session_id,
    us.user_id,
    event_type,
    event_target,
    target_id,
    event_value,
    page_url,
    DATE_ADD(us.started_at, INTERVAL FLOOR(RAND() * 600) SECOND) AS created_at
FROM user_sessions us
CROSS JOIN (
    -- page_view (모든 세션)
    SELECT 'page_view' AS event_type, NULL AS event_target, NULL AS target_id, NULL AS event_value, '/' AS page_url, 1 AS weight
    UNION ALL SELECT 'page_view', NULL, NULL, NULL, '/dashboard', 1
    UNION ALL SELECT 'page_view', NULL, NULL, NULL, '/features', 1
    UNION ALL SELECT 'page_view', NULL, NULL, NULL, '/chat', 1
    UNION ALL SELECT 'page_view', NULL, NULL, NULL, '/profile', 1
    -- ingredient_click (40% 세션)
    UNION ALL SELECT 'ingredient_click', 'ingredient', '나이아신아마이드', NULL, '/chat', 2
    UNION ALL SELECT 'ingredient_click', 'ingredient', '히알루론산', NULL, '/chat', 2
    UNION ALL SELECT 'ingredient_click', 'ingredient', '레티놀', NULL, '/chat', 2
    UNION ALL SELECT 'ingredient_click', 'ingredient', '비타민C', NULL, '/features', 2
    UNION ALL SELECT 'ingredient_click', 'ingredient', '세라마이드', NULL, '/features', 2
    UNION ALL SELECT 'ingredient_click', 'ingredient', '판테놀', NULL, '/chat', 2
    -- favorite_add (25% 로그인 유저)
    UNION ALL SELECT 'favorite_add', 'product', CAST(FLOOR(1 + RAND() * 100) AS CHAR), NULL, '/features', 3
    UNION ALL SELECT 'favorite_add', 'product', CAST(FLOOR(1 + RAND() * 100) AS CHAR), NULL, '/chat', 3
    -- preference_add (20% 유저)
    UNION ALL SELECT 'preference_add', 'ingredient', '나이아신아마이드', '{"korean_name":"나이아신아마이드","ing_type":"preferred"}', '/profile', 4
    UNION ALL SELECT 'preference_add', 'ingredient', '히알루론산', '{"korean_name":"히알루론산","ing_type":"preferred"}', '/profile', 4
    -- caution_add (15% 유저)
    UNION ALL SELECT 'caution_add', 'ingredient', '향료', '{"korean_name":"향료","ing_type":"caution"}', '/profile', 5
    UNION ALL SELECT 'caution_add', 'ingredient', '알코올', '{"korean_name":"알코올","ing_type":"caution"}', '/profile', 5
    -- outbound_click (15% 전환)
    UNION ALL SELECT 'outbound_click', 'product', CAST(FLOOR(1 + RAND() * 100) AS CHAR), '{"url":"https://example.com/product","product_name":"테스트 제품"}', '/chat', 6
    UNION ALL SELECT 'outbound_click', 'product', CAST(FLOOR(1 + RAND() * 100) AS CHAR), '{"url":"https://example.com/product2","product_name":"추천 제품"}', '/features', 6
) AS events
WHERE us.started_at > DATE_SUB(NOW(), INTERVAL 31 DAY)
  AND (
    -- weight에 따른 확률 필터
    (events.weight = 1 AND RAND() < 1.0) OR  -- page_view: 100%
    (events.weight = 2 AND RAND() < 0.4) OR  -- ingredient_click: 40%
    (events.weight = 3 AND RAND() < 0.25 AND us.user_id IS NOT NULL) OR  -- favorite_add: 25% (로그인만)
    (events.weight = 4 AND RAND() < 0.2 AND us.user_id IS NOT NULL) OR   -- preference_add: 20% (로그인만)
    (events.weight = 5 AND RAND() < 0.15 AND us.user_id IS NOT NULL) OR  -- caution_add: 15% (로그인만)
    (events.weight = 6 AND RAND() < 0.15)    -- outbound_click: 15%
  );


-- ============================================
-- 3. search_queries (검색 쿼리) - 약 400건
-- ============================================

INSERT INTO search_queries (
    session_id, user_id, query_text, query_text_normalized, query_type,
    search_method, result_count, clicked_results, first_click_position,
    time_to_first_click_ms, created_at
)
SELECT
    us.session_id,
    us.user_id,
    query_text,
    LOWER(REPLACE(query_text, ' ', '')) AS query_text_normalized,
    query_type,
    ELT(1 + FLOOR(RAND() * 3), 'text', 'text', 'autocomplete') AS search_method,
    FLOOR(5 + RAND() * 50) AS result_count,
    -- 60% CTR
    CASE WHEN RAND() < 0.6 THEN FLOOR(1 + RAND() * 3) ELSE 0 END AS clicked_results,
    CASE WHEN RAND() < 0.6 THEN FLOOR(1 + RAND() * 5) ELSE NULL END AS first_click_position,
    CASE WHEN RAND() < 0.6 THEN FLOOR(500 + RAND() * 5000) ELSE NULL END AS time_to_first_click_ms,
    DATE_ADD(us.started_at, INTERVAL FLOOR(RAND() * 300) SECOND) AS created_at
FROM user_sessions us
CROSS JOIN (
    -- 인기 검색어 목록
    SELECT '나이아신아마이드' AS query_text, 'ingredient' AS query_type
    UNION ALL SELECT '히알루론산', 'ingredient'
    UNION ALL SELECT '레티놀', 'ingredient'
    UNION ALL SELECT '비타민C', 'ingredient'
    UNION ALL SELECT '세라마이드', 'ingredient'
    UNION ALL SELECT '판테놀', 'ingredient'
    UNION ALL SELECT '글리세린', 'ingredient'
    UNION ALL SELECT '알부틴', 'ingredient'
    UNION ALL SELECT '살리실산', 'ingredient'
    UNION ALL SELECT '녹차추출물', 'ingredient'
    UNION ALL SELECT '센텔라', 'ingredient'
    UNION ALL SELECT '아데노신', 'ingredient'
    UNION ALL SELECT '펩타이드', 'ingredient'
    UNION ALL SELECT '스쿠알란', 'ingredient'
    UNION ALL SELECT '카페인', 'ingredient'
) AS queries
WHERE us.started_at > DATE_SUB(NOW(), INTERVAL 31 DAY)
  AND RAND() < 0.06;  -- 세션당 약 50% 확률로 검색


-- ============================================
-- 4. recommendation_feedback (추천 피드백) - 약 300건
-- ============================================

INSERT INTO recommendation_feedback (
    session_id, user_id, recommendation_id, algorithm_type, algorithm_version,
    context_type, user_skin_type, shown_products, shown_count,
    clicked_products, clicked_count, favorited_products, favorited_count,
    impression_time_ms, created_at
)
SELECT
    us.session_id,
    us.user_id,
    UUID() AS recommendation_id,
    ELT(1 + FLOOR(RAND() * 4), 'routine', 'baumann_match', 'similar', 'popular') AS algorithm_type,
    'v1' AS algorithm_version,
    ELT(1 + FLOOR(RAND() * 4), 'home', 'search_result', 'product_detail', 'routine') AS context_type,
    ELT(1 + FLOOR(RAND() * 8), 'DRPT', 'DRNT', 'DSPT', 'DSNT', 'ORPT', 'ORNT', 'OSPT', 'OSNT') AS user_skin_type,
    -- 4~8개 제품 노출
    CONCAT('[', FLOOR(1 + RAND() * 100), ',', FLOOR(1 + RAND() * 100), ',', FLOOR(1 + RAND() * 100), ',', FLOOR(1 + RAND() * 100), ']') AS shown_products,
    4 AS shown_count,
    -- 40% 클릭
    CASE WHEN RAND() < 0.4 THEN CONCAT('[', FLOOR(1 + RAND() * 100), ']') ELSE NULL END AS clicked_products,
    CASE WHEN RAND() < 0.4 THEN 1 ELSE 0 END AS clicked_count,
    -- 15% 즐겨찾기
    CASE WHEN RAND() < 0.15 AND us.user_id IS NOT NULL THEN CONCAT('[', FLOOR(1 + RAND() * 100), ']') ELSE NULL END AS favorited_products,
    CASE WHEN RAND() < 0.15 AND us.user_id IS NOT NULL THEN 1 ELSE 0 END AS favorited_count,
    FLOOR(1000 + RAND() * 10000) AS impression_time_ms,
    DATE_ADD(us.started_at, INTERVAL FLOOR(RAND() * 600) SECOND) AS created_at
FROM user_sessions us
WHERE us.started_at > DATE_SUB(NOW(), INTERVAL 31 DAY)
  AND RAND() < 0.4;  -- 40% 세션에서 추천 노출


-- ============================================
-- 5. 데이터 검증 쿼리
-- ============================================

SELECT '=== 시뮬레이션 데이터 생성 완료 ===' AS status;

SELECT 'user_sessions' AS table_name, COUNT(*) AS row_count 
FROM user_sessions WHERE started_at > DATE_SUB(NOW(), INTERVAL 31 DAY)
UNION ALL
SELECT 'event_logs', COUNT(*) 
FROM event_logs WHERE created_at > DATE_SUB(NOW(), INTERVAL 31 DAY)
UNION ALL
SELECT 'search_queries', COUNT(*) 
FROM search_queries WHERE created_at > DATE_SUB(NOW(), INTERVAL 31 DAY)
UNION ALL
SELECT 'recommendation_feedback', COUNT(*) 
FROM recommendation_feedback WHERE created_at > DATE_SUB(NOW(), INTERVAL 31 DAY);

-- 이벤트 타입별 분포
SELECT event_type, COUNT(*) AS count
FROM event_logs
WHERE created_at > DATE_SUB(NOW(), INTERVAL 31 DAY)
GROUP BY event_type
ORDER BY count DESC;

-- 일별 DAU
SELECT DATE(created_at) AS date, COUNT(DISTINCT COALESCE(user_id, session_id)) AS dau
FROM event_logs
WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(created_at)
ORDER BY date DESC;
