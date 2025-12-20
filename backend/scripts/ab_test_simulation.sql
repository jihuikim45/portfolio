-- ============================================
-- A/B 테스트 시뮬레이션 데이터 생성 스크립트
-- 실험: 대시보드 검색창 노출 테스트
-- MySQL 8.0+ / HeidiSQL / MySQL Workbench 호환
-- ============================================

-- 외래 키 체크 비활성화 (시뮬레이션 데이터 생성용)
SET FOREIGN_KEY_CHECKS = 0;


-- ============================================
-- 0-1. 테스트용 Users 생성 (없는 경우)
-- ============================================
INSERT IGNORE INTO users (id, email, name, status, created_at, updated_at)
SELECT n, CONCAT('test', n, '@aller.com'), CONCAT('테스트유저', n), 'active', NOW(), NOW()
FROM (
    SELECT 1 AS n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
    UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
    UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15
) AS nums
WHERE n NOT IN (SELECT id FROM users);


-- ============================================
-- 0-2. 새로운 테이블 생성 (실험 관리용)
-- ============================================

-- 실험 정의 테이블
CREATE TABLE IF NOT EXISTS experiments (
    experiment_id VARCHAR(50) PRIMARY KEY,
    experiment_name VARCHAR(200) NOT NULL,
    description TEXT,
    hypothesis TEXT,
    primary_metric VARCHAR(100),
    secondary_metrics TEXT,  -- JSON
    guardrail_metrics TEXT,  -- JSON
    status ENUM('draft', 'running', 'paused', 'completed', 'cancelled') DEFAULT 'draft',
    traffic_allocation DECIMAL(5,2) DEFAULT 50.00,  -- Treatment 비율 (%)
    start_date DATE,
    end_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 실험 그룹 할당 테이블 (세션 기반)
CREATE TABLE IF NOT EXISTS experiment_assignments (
    assignment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    experiment_id VARCHAR(50) NOT NULL,
    session_id VARCHAR(36) NOT NULL,
    user_id BIGINT,
    variant ENUM('control', 'treatment') NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_experiment_session (experiment_id, session_id),
    INDEX idx_experiment_variant (experiment_id, variant),
    INDEX idx_user_experiment (user_id, experiment_id)
);


-- ============================================
-- 1. 실험 정의 생성
-- ============================================

INSERT INTO experiments (
    experiment_id, experiment_name, description, hypothesis,
    primary_metric, secondary_metrics, guardrail_metrics,
    status, traffic_allocation, start_date, end_date
) VALUES (
    'exp_dashboard_search_v1',
    '대시보드 검색창 노출 테스트',
    '검색창을 대시보드 상단에 배치하여 검색 접근성을 개선하는 실험. 기존에는 프로필 → 성분관리 → 검색 (3 depth)으로 접근해야 했음.',
    '검색창을 대시보드 상단에 배치하면 검색 사용률이 20% 이상 증가할 것이다',
    'search_usage_rate',
    '["search_ctr", "ingredient_registration_rate", "searches_per_user"]',
    '["other_feature_usage", "session_duration", "bounce_rate"]',
    'running',
    50.00,
    DATE_SUB(CURDATE(), INTERVAL 14 DAY),
    CURDATE()
) ON DUPLICATE KEY UPDATE updated_at = NOW();


-- ============================================
-- 2. 실험용 세션 데이터 생성 (14일, 약 600 세션)
-- ============================================

INSERT INTO user_sessions (
    session_id, user_id, device_type, browser, os,
    referrer_source, utm_source, utm_medium, utm_campaign,
    landing_page, started_at, ended_at,
    page_view_count, event_count, is_bounce
)
WITH RECURSIVE date_seq AS (
    SELECT DATE_SUB(CURDATE(), INTERVAL 14 DAY) AS dt
    UNION ALL
    SELECT DATE_ADD(dt, INTERVAL 1 DAY) FROM date_seq WHERE dt < CURDATE()
),
session_nums AS (
    SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
    UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
    UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
    UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20
    UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24 UNION ALL SELECT 25
    UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL SELECT 29 UNION ALL SELECT 30
    UNION ALL SELECT 31 UNION ALL SELECT 32 UNION ALL SELECT 33 UNION ALL SELECT 34 UNION ALL SELECT 35
    UNION ALL SELECT 36 UNION ALL SELECT 37 UNION ALL SELECT 38 UNION ALL SELECT 39 UNION ALL SELECT 40
    UNION ALL SELECT 41 UNION ALL SELECT 42 UNION ALL SELECT 43 UNION ALL SELECT 44 UNION ALL SELECT 45
    UNION ALL SELECT 46 UNION ALL SELECT 47 UNION ALL SELECT 48 UNION ALL SELECT 49 UNION ALL SELECT 50
)
SELECT
    UUID() AS session_id,
    -- 70% 로그인 유저 (user_id 1~15 중 랜덤), 30% 비로그인
    CASE WHEN RAND() < 0.7 THEN FLOOR(1 + RAND() * 15) ELSE NULL END AS user_id,
    -- 디바이스: mobile 60%, desktop 35%, tablet 5%
    ELT(1 + FLOOR(RAND() * 20), 
        'mobile','mobile','mobile','mobile','mobile','mobile','mobile','mobile','mobile','mobile','mobile','mobile',
        'desktop','desktop','desktop','desktop','desktop','desktop','desktop',
        'tablet'
    ) AS device_type,
    ELT(1 + FLOOR(RAND() * 4), 'Chrome', 'Safari', 'Firefox', 'Edge') AS browser,
    ELT(1 + FLOOR(RAND() * 4), 'Windows', 'macOS', 'iOS', 'Android') AS os,
    ELT(1 + FLOOR(RAND() * 5), 'direct', 'google', 'naver', 'instagram', 'kakao') AS referrer_source,
    NULL AS utm_source,
    NULL AS utm_medium,
    NULL AS utm_campaign,
    -- 랜딩 페이지는 동일하게 시작 (대시보드)
    '/dashboard' AS landing_page,
    DATE_ADD(d.dt, INTERVAL FLOOR(RAND() * 86400) SECOND) AS started_at,
    DATE_ADD(DATE_ADD(d.dt, INTERVAL FLOOR(RAND() * 86400) SECOND), INTERVAL FLOOR(120 + RAND() * 1800) SECOND) AS ended_at,
    FLOOR(3 + RAND() * 12) AS page_view_count,
    FLOOR(2 + RAND() * 15) AS event_count,
    CASE WHEN RAND() < 0.25 THEN 1 ELSE 0 END AS is_bounce
FROM date_seq d
CROSS JOIN session_nums s
WHERE RAND() < 0.85;  -- 약 85% 생성 (하루 ~42.5 세션)


-- ============================================
-- 3. 실험 그룹 할당 (50/50 분배)
-- ============================================

INSERT INTO experiment_assignments (experiment_id, session_id, user_id, variant, assigned_at)
SELECT
    'exp_dashboard_search_v1' AS experiment_id,
    session_id,
    user_id,
    -- 50/50 랜덤 할당 (user_id 기반으로 일관성 유지)
    CASE 
        WHEN user_id IS NOT NULL THEN
            CASE WHEN MOD(user_id, 2) = 0 THEN 'control' ELSE 'treatment' END
        ELSE
            CASE WHEN RAND() < 0.5 THEN 'control' ELSE 'treatment' END
    END AS variant,
    started_at AS assigned_at
FROM user_sessions
WHERE started_at > DATE_SUB(NOW(), INTERVAL 15 DAY)
  AND session_id NOT IN (
      SELECT session_id FROM experiment_assignments WHERE experiment_id = 'exp_dashboard_search_v1'
  );


-- ============================================
-- 4. Control 그룹 검색 데이터 (낮은 사용률: ~8%)
-- ============================================
-- Control: 3-depth 접근 → 발견하기 어려움 → 검색 적음

INSERT INTO search_queries (
    session_id, user_id, query_text, query_text_normalized, query_type,
    search_method, result_count, clicked_results, first_click_position,
    time_to_first_click_ms, created_at
)
SELECT
    us.session_id,
    us.user_id,
    queries.query_text,
    LOWER(REPLACE(queries.query_text, ' ', '')) AS query_text_normalized,
    queries.query_type,
    ELT(1 + FLOOR(RAND() * 3), 'text', 'text', 'autocomplete') AS search_method,
    FLOOR(5 + RAND() * 50) AS result_count,
    -- Control: CTR 55% (사용자가 적극적으로 찾아온 경우라 의도가 명확)
    CASE WHEN RAND() < 0.55 THEN FLOOR(1 + RAND() * 3) ELSE 0 END AS clicked_results,
    CASE WHEN RAND() < 0.55 THEN FLOOR(1 + RAND() * 5) ELSE NULL END AS first_click_position,
    CASE WHEN RAND() < 0.55 THEN FLOOR(800 + RAND() * 4000) ELSE NULL END AS time_to_first_click_ms,
    DATE_ADD(us.started_at, INTERVAL FLOOR(RAND() * 300) SECOND) AS created_at
FROM user_sessions us
INNER JOIN experiment_assignments ea ON us.session_id = ea.session_id
CROSS JOIN (
    SELECT '나이아신아마이드' AS query_text, 'ingredient' AS query_type
    UNION ALL SELECT '히알루론산', 'ingredient'
    UNION ALL SELECT '레티놀', 'ingredient'
    UNION ALL SELECT '비타민C', 'ingredient'
    UNION ALL SELECT '세라마이드', 'ingredient'
    UNION ALL SELECT '판테놀', 'ingredient'
    UNION ALL SELECT '글리세린', 'ingredient'
    UNION ALL SELECT '알부틴', 'ingredient'
    UNION ALL SELECT '센텔라', 'ingredient'
    UNION ALL SELECT '펩타이드', 'ingredient'
) AS queries
WHERE ea.experiment_id = 'exp_dashboard_search_v1'
  AND ea.variant = 'control'
  AND us.is_bounce = 0
  AND RAND() < 0.008;  -- 세션당 약 8% 검색 확률 (3-depth라 접근 어려움)


-- ============================================
-- 5. Treatment 그룹 검색 데이터 (높은 사용률: ~30%)
-- ============================================
-- Treatment: 1-depth 접근 → 대시보드에서 바로 보임 → 검색 많음

INSERT INTO search_queries (
    session_id, user_id, query_text, query_text_normalized, query_type,
    search_method, result_count, clicked_results, first_click_position,
    time_to_first_click_ms, created_at
)
SELECT
    us.session_id,
    us.user_id,
    queries.query_text,
    LOWER(REPLACE(queries.query_text, ' ', '')) AS query_text_normalized,
    queries.query_type,
    -- Treatment: autocomplete 더 많이 사용 (검색창이 눈에 띄니까)
    ELT(1 + FLOOR(RAND() * 5), 'text', 'text', 'autocomplete', 'autocomplete', 'autocomplete') AS search_method,
    FLOOR(5 + RAND() * 50) AS result_count,
    -- Treatment: CTR 48% (캐주얼 검색이 많아서 약간 낮음)
    CASE WHEN RAND() < 0.48 THEN FLOOR(1 + RAND() * 3) ELSE 0 END AS clicked_results,
    CASE WHEN RAND() < 0.48 THEN FLOOR(1 + RAND() * 5) ELSE NULL END AS first_click_position,
    CASE WHEN RAND() < 0.48 THEN FLOOR(500 + RAND() * 3500) ELSE NULL END AS time_to_first_click_ms,
    DATE_ADD(us.started_at, INTERVAL FLOOR(RAND() * 180) SECOND) AS created_at  -- 더 빠른 검색 시작
FROM user_sessions us
INNER JOIN experiment_assignments ea ON us.session_id = ea.session_id
CROSS JOIN (
    SELECT '나이아신아마이드' AS query_text, 'ingredient' AS query_type
    UNION ALL SELECT '히알루론산', 'ingredient'
    UNION ALL SELECT '레티놀', 'ingredient'
    UNION ALL SELECT '비타민C', 'ingredient'
    UNION ALL SELECT '세라마이드', 'ingredient'
    UNION ALL SELECT '판테놀', 'ingredient'
    UNION ALL SELECT '글리세린', 'ingredient'
    UNION ALL SELECT '알부틴', 'ingredient'
    UNION ALL SELECT '센텔라', 'ingredient'
    UNION ALL SELECT '펩타이드', 'ingredient'
    UNION ALL SELECT '살리실산', 'ingredient'
    UNION ALL SELECT '녹차', 'ingredient'
    UNION ALL SELECT '카페인', 'ingredient'
    -- Treatment에서 더 다양한 탐색적 검색 발생
    UNION ALL SELECT '여드름', 'ingredient'
    UNION ALL SELECT '미백', 'ingredient'
    UNION ALL SELECT '보습', 'ingredient'
) AS queries
WHERE ea.experiment_id = 'exp_dashboard_search_v1'
  AND ea.variant = 'treatment'
  AND us.is_bounce = 0
  AND RAND() < 0.03;  -- 세션당 약 30% 검색 확률 (1-depth라 접근 쉬움)


-- ============================================
-- 6. 이벤트 로그 생성 (검색 후 행동 차이)
-- ============================================

-- Control 그룹: 검색 → 성분 등록 전환 (적극적 사용자라 전환율 높음)
INSERT INTO event_logs (
    session_id, user_id, event_type, event_target, target_id, event_value, page_url, created_at
)
SELECT
    sq.session_id,
    sq.user_id,
    'preference_add' AS event_type,
    'ingredient' AS event_target,
    sq.query_text AS target_id,
    JSON_OBJECT('korean_name', sq.query_text, 'ing_type', 'preferred', 'source', 'search') AS event_value,
    '/profile/ingredients' AS page_url,
    DATE_ADD(sq.created_at, INTERVAL FLOOR(10 + RAND() * 60) SECOND) AS created_at
FROM search_queries sq
INNER JOIN experiment_assignments ea ON sq.session_id = ea.session_id
WHERE ea.experiment_id = 'exp_dashboard_search_v1'
  AND ea.variant = 'control'
  AND sq.clicked_results > 0
  AND sq.created_at > DATE_SUB(NOW(), INTERVAL 15 DAY)
  AND RAND() < 0.35;  -- Control: 클릭 후 35% 전환 (의도가 명확)


-- Treatment 그룹: 검색 → 성분 등록 전환 (캐주얼 검색 많아서 전환율 조금 낮음)
INSERT INTO event_logs (
    session_id, user_id, event_type, event_target, target_id, event_value, page_url, created_at
)
SELECT
    sq.session_id,
    sq.user_id,
    'preference_add' AS event_type,
    'ingredient' AS event_target,
    sq.query_text AS target_id,
    JSON_OBJECT('korean_name', sq.query_text, 'ing_type', 'preferred', 'source', 'search') AS event_value,
    '/dashboard' AS page_url,  -- Treatment는 대시보드에서 바로 등록
    DATE_ADD(sq.created_at, INTERVAL FLOOR(5 + RAND() * 30) SECOND) AS created_at  -- 더 빠른 전환
FROM search_queries sq
INNER JOIN experiment_assignments ea ON sq.session_id = ea.session_id
WHERE ea.experiment_id = 'exp_dashboard_search_v1'
  AND ea.variant = 'treatment'
  AND sq.clicked_results > 0
  AND sq.created_at > DATE_SUB(NOW(), INTERVAL 15 DAY)
  AND RAND() < 0.25;  -- Treatment: 클릭 후 25% 전환 (탐색적 검색이 많아서)


-- ============================================
-- 7. Guardrail: 다른 기능 사용 데이터 (cannibalization 체크)
-- ============================================

-- 두 그룹 모두 다른 기능 사용은 비슷하게 유지 (cannibalization 없음)
INSERT INTO event_logs (
    session_id, user_id, event_type, event_target, target_id, event_value, page_url, created_at
)
SELECT
    us.session_id,
    us.user_id,
    event_type,
    event_target,
    target_id,
    NULL AS event_value,
    page_url,
    DATE_ADD(us.started_at, INTERVAL FLOOR(RAND() * 600) SECOND) AS created_at
FROM user_sessions us
INNER JOIN experiment_assignments ea ON us.session_id = ea.session_id
CROSS JOIN (
    -- 추천 조회 (두 그룹 동일)
    SELECT 'recommendation_view' AS event_type, 'routine' AS event_target, 'morning_routine' AS target_id, '/dashboard' AS page_url
    UNION ALL SELECT 'recommendation_view', 'routine', 'night_routine', '/dashboard'
    -- 프로필 조회 (두 그룹 동일)
    UNION ALL SELECT 'page_view', NULL, NULL, '/profile'
    -- 채팅 사용 (두 그룹 동일)
    UNION ALL SELECT 'chat_start', 'ai', NULL, '/chat'
) AS events
WHERE ea.experiment_id = 'exp_dashboard_search_v1'
  AND us.is_bounce = 0
  AND RAND() < 0.15;  -- 15% 확률로 다른 기능 사용


-- ============================================
-- 외래 키 체크 다시 활성화
-- ============================================
SET FOREIGN_KEY_CHECKS = 1;


-- ============================================
-- 8. 검증 및 결과 확인 쿼리
-- ============================================

SELECT '=== A/B 테스트 시뮬레이션 데이터 생성 완료 ===' AS status;

-- 테스트 유저 확인
SELECT '--- 테스트 유저 ---' AS info;
SELECT COUNT(*) AS test_users FROM users WHERE email LIKE 'test%@aller.com';

-- 실험 그룹별 세션 수
SELECT '--- 그룹별 세션 수 ---' AS info;
SELECT 
    ea.variant,
    COUNT(DISTINCT ea.session_id) AS total_sessions,
    COUNT(DISTINCT ea.user_id) AS unique_users
FROM experiment_assignments ea
WHERE ea.experiment_id = 'exp_dashboard_search_v1'
GROUP BY ea.variant;

-- 1차 지표: 검색 사용률 (searches / DAU)
SELECT '--- 1차 지표: 검색 사용률 ---' AS info;
SELECT 
    ea.variant,
    COUNT(DISTINCT ea.session_id) AS total_sessions,
    COUNT(DISTINCT sq.session_id) AS sessions_with_search,
    ROUND(COUNT(DISTINCT sq.session_id) * 100.0 / COUNT(DISTINCT ea.session_id), 2) AS search_usage_rate_pct
FROM experiment_assignments ea
LEFT JOIN search_queries sq ON ea.session_id = sq.session_id
    AND sq.created_at > DATE_SUB(NOW(), INTERVAL 15 DAY)
WHERE ea.experiment_id = 'exp_dashboard_search_v1'
GROUP BY ea.variant;

-- 2차 지표: Search CTR
SELECT '--- 2차 지표: Search CTR ---' AS info;
SELECT 
    ea.variant,
    COUNT(*) AS total_searches,
    SUM(CASE WHEN sq.clicked_results > 0 THEN 1 ELSE 0 END) AS searches_with_click,
    ROUND(SUM(CASE WHEN sq.clicked_results > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS search_ctr_pct
FROM experiment_assignments ea
INNER JOIN search_queries sq ON ea.session_id = sq.session_id
WHERE ea.experiment_id = 'exp_dashboard_search_v1'
  AND sq.created_at > DATE_SUB(NOW(), INTERVAL 15 DAY)
GROUP BY ea.variant;

-- 2차 지표: 성분 등록 전환율 (검색 후)
SELECT '--- 2차 지표: 성분 등록 전환율 ---' AS info;
SELECT 
    ea.variant,
    COUNT(DISTINCT sq.query_id) AS searches_with_click,
    COUNT(DISTINCT el.event_id) AS registrations,
    ROUND(COUNT(DISTINCT el.event_id) * 100.0 / NULLIF(COUNT(DISTINCT sq.query_id), 0), 2) AS registration_rate_pct
FROM experiment_assignments ea
INNER JOIN search_queries sq ON ea.session_id = sq.session_id
LEFT JOIN event_logs el ON sq.session_id = el.session_id 
    AND el.event_type = 'preference_add'
    AND el.created_at > sq.created_at
    AND el.created_at < DATE_ADD(sq.created_at, INTERVAL 5 MINUTE)
WHERE ea.experiment_id = 'exp_dashboard_search_v1'
  AND sq.created_at > DATE_SUB(NOW(), INTERVAL 15 DAY)
  AND sq.clicked_results > 0
GROUP BY ea.variant;

-- Lift 계산
SELECT '--- Lift 계산 ---' AS info;
SELECT 
    ROUND(
        (t.search_rate - c.search_rate) / c.search_rate * 100, 
        1
    ) AS lift_pct
FROM (
    SELECT COUNT(DISTINCT sq.session_id) * 100.0 / COUNT(DISTINCT ea.session_id) AS search_rate
    FROM experiment_assignments ea
    LEFT JOIN search_queries sq ON ea.session_id = sq.session_id
    WHERE ea.experiment_id = 'exp_dashboard_search_v1' AND ea.variant = 'control'
) c,
(
    SELECT COUNT(DISTINCT sq.session_id) * 100.0 / COUNT(DISTINCT ea.session_id) AS search_rate
    FROM experiment_assignments ea
    LEFT JOIN search_queries sq ON ea.session_id = sq.session_id
    WHERE ea.experiment_id = 'exp_dashboard_search_v1' AND ea.variant = 'treatment'
) t;
