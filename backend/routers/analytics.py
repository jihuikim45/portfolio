# backend/routers/analytics.py
"""
Analytics Dashboard API
- 퍼널 분석, 리텐션, KPI 지표 등 제공
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from db import get_db
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# ============================================
# 1. KPI Summary (핵심 지표 카드)
# ============================================
@router.get("/kpi-summary")
def get_kpi_summary(
    days: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db)
):
    """
    핵심 KPI 요약:
    - DAU (Daily Active Users)
    - Search CTR
    - Recommendation CTR
    - Outbound CTR
    """
    try:
        # 기간 설정
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        prev_start = start_date - timedelta(days=days)
        
        # DAU (오늘 기준)
        dau_query = text("""
            SELECT COUNT(DISTINCT COALESCE(user_id, session_id)) as dau
            FROM event_logs
            WHERE DATE(created_at) = CURDATE()
        """)
        dau_result = db.execute(dau_query).fetchone()
        dau = dau_result[0] if dau_result else 0
        
        # 전일 DAU (비교용)
        prev_dau_query = text("""
            SELECT COUNT(DISTINCT COALESCE(user_id, session_id)) as dau
            FROM event_logs
            WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
        """)
        prev_dau_result = db.execute(prev_dau_query).fetchone()
        prev_dau = prev_dau_result[0] if prev_dau_result else 0
        
        # Search CTR (기간 내)
        search_ctr_query = text("""
            SELECT 
                COUNT(*) as total_searches,
                SUM(CASE WHEN clicked_results > 0 THEN 1 ELSE 0 END) as clicked_searches
            FROM search_queries
            WHERE created_at >= :start_date
        """)
        search_result = db.execute(search_ctr_query, {"start_date": start_date}).fetchone()
        total_searches = search_result[0] if search_result and search_result[0] else 0
        clicked_searches = search_result[1] if search_result and search_result[1] else 0
        search_ctr = round((clicked_searches / total_searches * 100), 1) if total_searches > 0 else 0
        
        # 이전 기간 Search CTR
        prev_search_query = text("""
            SELECT 
                COUNT(*) as total_searches,
                SUM(CASE WHEN clicked_results > 0 THEN 1 ELSE 0 END) as clicked_searches
            FROM search_queries
            WHERE created_at >= :prev_start AND created_at < :start_date
        """)
        prev_search_result = db.execute(prev_search_query, {"prev_start": prev_start, "start_date": start_date}).fetchone()
        prev_total = prev_search_result[0] if prev_search_result and prev_search_result[0] else 0
        prev_clicked = prev_search_result[1] if prev_search_result and prev_search_result[1] else 0
        prev_search_ctr = round((prev_clicked / prev_total * 100), 1) if prev_total > 0 else 0
        
        # Recommendation CTR (기간 내)
        rec_ctr_query = text("""
            SELECT 
                COUNT(*) as total_shown,
                SUM(CASE WHEN clicked_count > 0 THEN 1 ELSE 0 END) as clicked
            FROM recommendation_feedback
            WHERE created_at >= :start_date
        """)
        rec_result = db.execute(rec_ctr_query, {"start_date": start_date}).fetchone()
        total_rec = rec_result[0] if rec_result and rec_result[0] else 0
        clicked_rec = rec_result[1] if rec_result and rec_result[1] else 0
        rec_ctr = round((clicked_rec / total_rec * 100), 1) if total_rec > 0 else 0
        
        # Outbound CTR (기간 내)
        outbound_query = text("""
            SELECT 
                (SELECT COUNT(*) FROM event_logs WHERE event_type = 'page_view' AND created_at >= :start_date) as page_views,
                (SELECT COUNT(*) FROM event_logs WHERE event_type = 'outbound_click' AND created_at >= :start_date) as outbound_clicks
        """)
        outbound_result = db.execute(outbound_query, {"start_date": start_date}).fetchone()
        page_views = outbound_result[0] if outbound_result and outbound_result[0] else 0
        outbound_clicks = outbound_result[1] if outbound_result and outbound_result[1] else 0
        outbound_ctr = round((outbound_clicks / page_views * 100), 1) if page_views > 0 else 0
        
        return {
            "period_days": days,
            "dau": {
                "value": dau,
                "prev_value": prev_dau,
                "change_pct": round(((dau - prev_dau) / prev_dau * 100), 1) if prev_dau > 0 else 0
            },
            "search_ctr": {
                "value": search_ctr,
                "prev_value": prev_search_ctr,
                "change_pct": round(search_ctr - prev_search_ctr, 1)
            },
            "rec_ctr": {
                "value": rec_ctr,
                "total_shown": total_rec,
                "total_clicked": clicked_rec
            },
            "outbound_ctr": {
                "value": outbound_ctr,
                "total_views": page_views,
                "total_clicks": outbound_clicks
            }
        }
    except Exception as e:
        print(f"❌ KPI Summary 오류: {e}")
        return {"error": str(e)}


# ============================================
# 2. Conversion Funnel (전환 퍼널)
# ============================================
@router.get("/funnel")
def get_conversion_funnel(
    days: int = Query(default=30, ge=1, le=90),
    db: Session = Depends(get_db)
):
    """
    전환 퍼널:
    Visit → Search/Browse → Engage → Favorite → Outbound
    
    각 단계 정의:
    - Visit: page_view 이벤트 발생
    - Search/Browse: 검색 또는 성분 클릭
    - Engage: 선호/주의 성분 등록 또는 추천 클릭
    - Favorite: 즐겨찾기 추가
    - Outbound: 외부 링크 클릭 (구매 전환)
    """
    try:
        start_date = datetime.now() - timedelta(days=days)
        
        funnel_query = text("""
            SELECT 
                COUNT(DISTINCT CASE WHEN event_type = 'page_view' 
                    THEN COALESCE(user_id, session_id) END) as step1_visit,
                COUNT(DISTINCT CASE WHEN event_type IN ('ingredient_click', 'page_view') 
                    AND (event_type = 'ingredient_click' OR page_url IN ('/features', '/chat'))
                    THEN COALESCE(user_id, session_id) END) as step2_browse,
                COUNT(DISTINCT CASE WHEN event_type IN ('ingredient_click', 'preference_add', 'caution_add') 
                    THEN COALESCE(user_id, session_id) END) as step3_engage,
                COUNT(DISTINCT CASE WHEN event_type = 'favorite_add' 
                    THEN COALESCE(user_id, session_id) END) as step4_favorite,
                COUNT(DISTINCT CASE WHEN event_type = 'outbound_click' 
                    THEN COALESCE(user_id, session_id) END) as step5_outbound
            FROM event_logs
            WHERE created_at >= :start_date
        """)
        result = db.execute(funnel_query, {"start_date": start_date}).fetchone()
        
        visit = result[0] if result and result[0] else 0
        browse = result[1] if result and result[1] else 0
        engage = result[2] if result and result[2] else 0
        favorite = result[3] if result and result[3] else 0
        outbound = result[4] if result and result[4] else 0
        
        # 전환율 계산 (Visit 대비)
        def calc_rate(current, base):
            return round((current / base * 100), 1) if base > 0 else 0
        
        return {
            "period_days": days,
            "funnel": [
                {"step": "Visit", "count": visit, "rate": 100.0},
                {"step": "Search/Browse", "count": browse, "rate": calc_rate(browse, visit)},
                {"step": "Engage", "count": engage, "rate": calc_rate(engage, visit)},
                {"step": "Favorite", "count": favorite, "rate": calc_rate(favorite, visit)},
                {"step": "Outbound", "count": outbound, "rate": calc_rate(outbound, visit)}
            ]
        }
    except Exception as e:
        print(f"❌ Funnel 오류: {e}")
        return {"error": str(e)}


# ============================================
# 3. Retention Curve (리텐션)
# ============================================
@router.get("/retention")
def get_retention_curve(
    cohort_days: int = Query(default=30, ge=7, le=90),
    db: Session = Depends(get_db)
):
    """
    D1, D7, D14, D30 리텐션율
    """
    try:
        retention_query = text("""
            WITH first_visit AS (
                SELECT 
                    COALESCE(user_id, session_id) as uid,
                    MIN(DATE(created_at)) as first_date
                FROM event_logs
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL :cohort_days DAY)
                GROUP BY COALESCE(user_id, session_id)
            ),
            return_visits AS (
                SELECT 
                    fv.uid,
                    fv.first_date,
                    DATEDIFF(DATE(e.created_at), fv.first_date) as day_diff
                FROM first_visit fv
                JOIN event_logs e ON COALESCE(e.user_id, e.session_id) = fv.uid
                WHERE DATE(e.created_at) > fv.first_date
            )
            SELECT 
                (SELECT COUNT(DISTINCT uid) FROM first_visit) as d0_users,
                COUNT(DISTINCT CASE WHEN day_diff = 1 THEN uid END) as d1_users,
                COUNT(DISTINCT CASE WHEN day_diff = 7 THEN uid END) as d7_users,
                COUNT(DISTINCT CASE WHEN day_diff = 14 THEN uid END) as d14_users,
                COUNT(DISTINCT CASE WHEN day_diff = 30 THEN uid END) as d30_users
            FROM return_visits
        """)
        result = db.execute(retention_query, {"cohort_days": cohort_days}).fetchone()
        
        d0 = result[0] if result and result[0] else 0
        d1 = result[1] if result and result[1] else 0
        d7 = result[2] if result and result[2] else 0
        d14 = result[3] if result and result[3] else 0
        d30 = result[4] if result and result[4] else 0
        
        def calc_retention(dn, d0):
            return round((dn / d0 * 100), 1) if d0 > 0 else 0
        
        return {
            "cohort_days": cohort_days,
            "total_users": d0,
            "retention": [
                {"day": "D0", "users": d0, "rate": 100.0},
                {"day": "D1", "users": d1, "rate": calc_retention(d1, d0)},
                {"day": "D7", "users": d7, "rate": calc_retention(d7, d0)},
                {"day": "D14", "users": d14, "rate": calc_retention(d14, d0)},
                {"day": "D30", "users": d30, "rate": calc_retention(d30, d0)}
            ]
        }
    except Exception as e:
        print(f"❌ Retention 오류: {e}")
        return {"error": str(e)}


# ============================================
# 4. Daily Trend (일별 추이)
# ============================================
@router.get("/daily-trend")
def get_daily_trend(
    days: int = Query(default=14, ge=7, le=60),
    db: Session = Depends(get_db)
):
    """
    일별 DAU, 검색, 전환 추이
    """
    try:
        trend_query = text("""
            SELECT 
                DATE(created_at) as date,
                COUNT(DISTINCT COALESCE(user_id, session_id)) as dau,
                SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) as page_views,
                SUM(CASE WHEN event_type = 'favorite_add' THEN 1 ELSE 0 END) as favorites,
                SUM(CASE WHEN event_type = 'outbound_click' THEN 1 ELSE 0 END) as outbound_clicks
            FROM event_logs
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        """)
        results = db.execute(trend_query, {"days": days}).fetchall()
        
        trend_data = []
        for row in results:
            trend_data.append({
                "date": row[0].strftime("%Y-%m-%d") if row[0] else None,
                "dau": row[1] or 0,
                "page_views": row[2] or 0,
                "favorites": row[3] or 0,
                "outbound_clicks": row[4] or 0
            })
        
        return {
            "period_days": days,
            "trend": trend_data
        }
    except Exception as e:
        print(f"❌ Daily Trend 오류: {e}")
        return {"error": str(e)}


# ============================================
# 5. LTV Proxy Score Distribution
# ============================================
@router.get("/ltv-distribution")
def get_ltv_distribution(
    days: int = Query(default=30, ge=7, le=90),
    db: Session = Depends(get_db)
):
    """
    LTV Proxy Score 분포:
    - page_view: 1점
    - ingredient_click: 2점
    - preference_add: 3점
    - favorite_add: 5점
    - outbound_click: 15점
    """
    try:
        ltv_query = text("""
            WITH user_scores AS (
                SELECT 
                    COALESCE(user_id, session_id) as uid,
                    SUM(CASE 
                        WHEN event_type = 'page_view' THEN 1
                        WHEN event_type = 'ingredient_click' THEN 2
                        WHEN event_type = 'preference_add' THEN 3
                        WHEN event_type = 'caution_add' THEN 3
                        WHEN event_type = 'favorite_add' THEN 5
                        WHEN event_type = 'outbound_click' THEN 15
                        ELSE 0
                    END) as ltv_score
                FROM event_logs
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
                GROUP BY COALESCE(user_id, session_id)
            )
            SELECT 
                CASE 
                    WHEN ltv_score < 10 THEN 'Low (0-9)'
                    WHEN ltv_score < 30 THEN 'Medium (10-29)'
                    WHEN ltv_score < 60 THEN 'High (30-59)'
                    ELSE 'Very High (60+)'
                END as segment,
                COUNT(*) as user_count,
                ROUND(AVG(ltv_score), 1) as avg_score
            FROM user_scores
            GROUP BY segment
            ORDER BY MIN(ltv_score)
        """)
        results = db.execute(ltv_query, {"days": days}).fetchall()
        
        distribution = []
        total_users = 0
        for row in results:
            count = row[1] or 0
            total_users += count
            distribution.append({
                "segment": row[0],
                "user_count": count,
                "avg_score": row[2] or 0
            })
        
        # 비율 추가
        for item in distribution:
            item["percentage"] = round((item["user_count"] / total_users * 100), 1) if total_users > 0 else 0
        
        return {
            "period_days": days,
            "total_users": total_users,
            "distribution": distribution
        }
    except Exception as e:
        print(f"❌ LTV Distribution 오류: {e}")
        return {"error": str(e)}


# ============================================
# 6. Top Items (인기 성분/제품)
# ============================================
@router.get("/top-items")
def get_top_items(
    days: int = Query(default=7, ge=1, le=30),
    limit: int = Query(default=10, ge=5, le=20),
    db: Session = Depends(get_db)
):
    """
    인기 검색 성분 및 클릭 제품
    """
    try:
        # Top 검색어
        search_query = text("""
            SELECT query_text, COUNT(*) as count
            FROM search_queries
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
              AND query_text IS NOT NULL
              AND query_text != ''
            GROUP BY query_text
            ORDER BY count DESC
            LIMIT :limit
        """)
        search_results = db.execute(search_query, {"days": days, "limit": limit}).fetchall()
        
        # Top 클릭 성분
        ingredient_query = text("""
            SELECT target_id, COUNT(*) as count
            FROM event_logs
            WHERE event_type = 'ingredient_click'
              AND created_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
              AND target_id IS NOT NULL
            GROUP BY target_id
            ORDER BY count DESC
            LIMIT :limit
        """)
        ingredient_results = db.execute(ingredient_query, {"days": days, "limit": limit}).fetchall()
        
        # Top 즐겨찾기 제품
        favorite_query = text("""
            SELECT target_id, COUNT(*) as count
            FROM event_logs
            WHERE event_type = 'favorite_add'
              AND created_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
              AND target_id IS NOT NULL
            GROUP BY target_id
            ORDER BY count DESC
            LIMIT :limit
        """)
        favorite_results = db.execute(favorite_query, {"days": days, "limit": limit}).fetchall()
        
        return {
            "period_days": days,
            "top_searches": [{"query": row[0], "count": row[1]} for row in search_results],
            "top_ingredients": [{"name": row[0], "count": row[1]} for row in ingredient_results],
            "top_favorited": [{"product_id": row[0], "count": row[1]} for row in favorite_results]
        }
    except Exception as e:
        print(f"❌ Top Items 오류: {e}")
        return {"error": str(e)}


# ============================================
# 7. Event Type Distribution
# ============================================
@router.get("/event-distribution")
def get_event_distribution(
    days: int = Query(default=7, ge=1, le=30),
    db: Session = Depends(get_db)
):
    """
    이벤트 타입별 분포
    """
    try:
        query = text("""
            SELECT event_type, COUNT(*) as count
            FROM event_logs
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
            GROUP BY event_type
            ORDER BY count DESC
        """)
        results = db.execute(query, {"days": days}).fetchall()
        
        total = sum(row[1] for row in results) if results else 0
        
        distribution = []
        for row in results:
            distribution.append({
                "event_type": row[0],
                "count": row[1],
                "percentage": round((row[1] / total * 100), 1) if total > 0 else 0
            })
        
        return {
            "period_days": days,
            "total_events": total,
            "distribution": distribution
        }
    except Exception as e:
        print(f"❌ Event Distribution 오류: {e}")
        return {"error": str(e)}


# ============================================
# 8. A/B Test Experiments (실험 목록)
# ============================================
@router.get("/experiments")
def get_experiments(
    status: Optional[str] = Query(default=None),
    db: Session = Depends(get_db)
):
    """
    실험 목록 조회
    """
    try:
        query = text("""
            SELECT 
                experiment_id,
                experiment_name,
                description,
                hypothesis,
                primary_metric,
                secondary_metrics,
                status,
                traffic_allocation,
                start_date,
                end_date,
                created_at
            FROM experiments
            WHERE (:status IS NULL OR status = :status)
            ORDER BY created_at DESC
        """)
        results = db.execute(query, {"status": status}).fetchall()
        
        experiments = []
        for row in results:
            experiments.append({
                "experiment_id": row[0],
                "experiment_name": row[1],
                "description": row[2],
                "hypothesis": row[3],
                "primary_metric": row[4],
                "secondary_metrics": row[5],
                "status": row[6],
                "traffic_allocation": float(row[7]) if row[7] else 50.0,
                "start_date": row[8].strftime("%Y-%m-%d") if row[8] else None,
                "end_date": row[9].strftime("%Y-%m-%d") if row[9] else None,
                "created_at": row[10].isoformat() if row[10] else None
            })
        
        return {"experiments": experiments}
    except Exception as e:
        print(f"❌ Experiments 오류: {e}")
        return {"error": str(e)}


# ============================================
# 9. A/B Test Results (실험 결과 분석)
# ============================================
@router.get("/experiments/{experiment_id}/results")
def get_experiment_results(
    experiment_id: str,
    db: Session = Depends(get_db)
):
    """
    A/B 테스트 결과 분석:
    - 그룹별 세션/유저 수
    - 1차 지표: 검색 사용률
    - 2차 지표: Search CTR, 성분 등록 전환율
    - 통계적 유의성 계산
    """
    try:
        # 1. 실험 기본 정보
        exp_query = text("""
            SELECT experiment_name, hypothesis, primary_metric, 
                   start_date, end_date, traffic_allocation
            FROM experiments
            WHERE experiment_id = :exp_id
        """)
        exp_result = db.execute(exp_query, {"exp_id": experiment_id}).fetchone()
        
        if not exp_result:
            return {"error": "실험을 찾을 수 없습니다."}
        
        # 2. 그룹별 세션 수
        group_query = text("""
            SELECT 
                variant,
                COUNT(DISTINCT session_id) as total_sessions,
                COUNT(DISTINCT user_id) as unique_users
            FROM experiment_assignments
            WHERE experiment_id = :exp_id
            GROUP BY variant
        """)
        group_results = db.execute(group_query, {"exp_id": experiment_id}).fetchall()
        
        groups = {}
        for row in group_results:
            groups[row[0]] = {
                "total_sessions": row[1] or 0,
                "unique_users": row[2] or 0
            }
        
        # 3. 1차 지표: 검색 사용률
        search_usage_query = text("""
            SELECT 
                ea.variant,
                COUNT(DISTINCT ea.session_id) as total_sessions,
                COUNT(DISTINCT sq.session_id) as sessions_with_search
            FROM experiment_assignments ea
            LEFT JOIN search_queries sq ON ea.session_id = sq.session_id
            WHERE ea.experiment_id = :exp_id
            GROUP BY ea.variant
        """)
        search_usage_results = db.execute(search_usage_query, {"exp_id": experiment_id}).fetchall()
        
        search_usage = {}
        for row in search_usage_results:
            total = row[1] or 0
            searched = row[2] or 0
            rate = round((searched / total * 100), 2) if total > 0 else 0
            search_usage[row[0]] = {
                "total_sessions": total,
                "sessions_with_search": searched,
                "search_usage_rate": rate
            }
        
        # 4. 2차 지표: Search CTR
        search_ctr_query = text("""
            SELECT 
                ea.variant,
                COUNT(*) as total_searches,
                SUM(CASE WHEN sq.clicked_results > 0 THEN 1 ELSE 0 END) as searches_with_click
            FROM experiment_assignments ea
            INNER JOIN search_queries sq ON ea.session_id = sq.session_id
            WHERE ea.experiment_id = :exp_id
            GROUP BY ea.variant
        """)
        search_ctr_results = db.execute(search_ctr_query, {"exp_id": experiment_id}).fetchall()
        
        search_ctr = {}
        for row in search_ctr_results:
            total = row[1] or 0
            clicked = row[2] or 0
            ctr = round((clicked / total * 100), 2) if total > 0 else 0
            search_ctr[row[0]] = {
                "total_searches": total,
                "searches_with_click": clicked,
                "search_ctr": ctr
            }
        
        # 5. 2차 지표: 성분 등록 전환율 (검색 후 preference_add)
        registration_query = text("""
            SELECT 
                ea.variant,
                COUNT(DISTINCT sq.query_id) as searches_with_click,
                COUNT(DISTINCT el.event_id) as registrations
            FROM experiment_assignments ea
            INNER JOIN search_queries sq ON ea.session_id = sq.session_id
            LEFT JOIN event_logs el ON sq.session_id = el.session_id 
                AND el.event_type = 'preference_add'
                AND el.created_at > sq.created_at
                AND el.created_at < DATE_ADD(sq.created_at, INTERVAL 5 MINUTE)
            WHERE ea.experiment_id = :exp_id
              AND sq.clicked_results > 0
            GROUP BY ea.variant
        """)
        reg_results = db.execute(registration_query, {"exp_id": experiment_id}).fetchall()
        
        registration = {}
        for row in reg_results:
            clicked = row[1] or 0
            registered = row[2] or 0
            rate = round((registered / clicked * 100), 2) if clicked > 0 else 0
            registration[row[0]] = {
                "searches_with_click": clicked,
                "registrations": registered,
                "registration_rate": rate
            }
        
        # 6. 일별 추이
        daily_query = text("""
            SELECT 
                DATE(us.started_at) as date,
                ea.variant,
                COUNT(DISTINCT ea.session_id) as sessions,
                COUNT(DISTINCT sq.session_id) as sessions_searched
            FROM experiment_assignments ea
            LEFT JOIN user_sessions us ON ea.session_id = us.session_id
            LEFT JOIN search_queries sq ON ea.session_id = sq.session_id
            WHERE ea.experiment_id = :exp_id
            GROUP BY DATE(us.started_at), ea.variant
            ORDER BY date ASC, variant
        """)
        daily_results = db.execute(daily_query, {"exp_id": experiment_id}).fetchall()
        
        daily_trend = []
        for row in daily_results:
            if row[0]:  # date가 None이 아닌 경우
                sessions = row[2] or 0
                searched = row[3] or 0
                rate = round((searched / sessions * 100), 2) if sessions > 0 else 0
                daily_trend.append({
                    "date": row[0].strftime("%Y-%m-%d"),
                    "variant": row[1],
                    "sessions": sessions,
                    "sessions_searched": searched,
                    "search_rate": rate
                })
        
        # 7. Lift 계산
        control_rate = search_usage.get("control", {}).get("search_usage_rate", 0)
        treatment_rate = search_usage.get("treatment", {}).get("search_usage_rate", 0)
        lift_pct = round(((treatment_rate - control_rate) / control_rate * 100), 1) if control_rate > 0 else 0
        
        # 8. 간단한 통계적 유의성 체크 (Z-test 근사)
        import math
        control_n = search_usage.get("control", {}).get("total_sessions", 0)
        treatment_n = search_usage.get("treatment", {}).get("total_sessions", 0)
        control_p = control_rate / 100 if control_rate else 0
        treatment_p = treatment_rate / 100 if treatment_rate else 0
        
        # Pooled proportion
        if control_n + treatment_n > 0:
            pooled_p = (control_p * control_n + treatment_p * treatment_n) / (control_n + treatment_n)
            # Standard error
            se = math.sqrt(pooled_p * (1 - pooled_p) * (1/control_n + 1/treatment_n)) if pooled_p > 0 and pooled_p < 1 else 0
            # Z-score
            z_score = (treatment_p - control_p) / se if se > 0 else 0
            # p-value 근사 (양측검정)
            p_value = 2 * (1 - 0.5 * (1 + math.erf(abs(z_score) / math.sqrt(2)))) if z_score != 0 else 1
            is_significant = p_value < 0.05
        else:
            z_score = 0
            p_value = 1
            is_significant = False
        
        return {
            "experiment": {
                "id": experiment_id,
                "name": exp_result[0],
                "hypothesis": exp_result[1],
                "primary_metric": exp_result[2],
                "start_date": exp_result[3].strftime("%Y-%m-%d") if exp_result[3] else None,
                "end_date": exp_result[4].strftime("%Y-%m-%d") if exp_result[4] else None,
                "traffic_allocation": float(exp_result[5]) if exp_result[5] else 50.0
            },
            "groups": groups,
            "primary_metric": {
                "name": "search_usage_rate",
                "control": search_usage.get("control", {}),
                "treatment": search_usage.get("treatment", {}),
                "lift_pct": lift_pct,
                "statistical_significance": {
                    "z_score": round(z_score, 3),
                    "p_value": round(p_value, 4),
                    "is_significant": is_significant,
                    "confidence_level": "95%"
                }
            },
            "secondary_metrics": {
                "search_ctr": search_ctr,
                "registration_rate": registration
            },
            "daily_trend": daily_trend
        }
    except Exception as e:
        print(f"❌ Experiment Results 오류: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
