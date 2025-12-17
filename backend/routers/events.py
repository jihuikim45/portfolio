# backend/routers/events.py
"""
이벤트 로깅 API 엔드포인트
- 세션 생성/업데이트
- 일반 이벤트 로깅
- 검색 이벤트 로깅
- 상품 조회 로깅
- 추천 피드백 로깅
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from db import get_db
from models import UserSession, EventLog, SearchQuery, ProductViewLog, RecommendationFeedback

router = APIRouter(prefix="/events", tags=["events"])


# ───────────────────────────────────────────────
# Pydantic 스키마 (요청 데이터 검증용)
# ───────────────────────────────────────────────

class SessionCreateRequest(BaseModel):
    """세션 생성 요청"""
    session_id: str = Field(..., description="UUID v4")
    user_id: Optional[int] = None
    device_type: str = Field(..., description="mobile, desktop, tablet")
    browser: Optional[str] = None
    os: Optional[str] = None
    referrer_source: Optional[str] = None
    referrer_url: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    landing_page: Optional[str] = None


class SessionUpdateRequest(BaseModel):
    """세션 업데이트 요청 (종료 시)"""
    session_id: str
    ended_at: Optional[datetime] = None
    page_view_count: Optional[int] = None
    event_count: Optional[int] = None
    is_bounce: Optional[bool] = None


class EventLogRequest(BaseModel):
    """일반 이벤트 로깅 요청"""
    session_id: str
    user_id: Optional[int] = None
    event_type: str = Field(..., description="click, page_view, preference_add, caution_add, etc.")
    event_target: Optional[str] = None  # ingredient, product, etc.
    target_id: Optional[str] = None     # 대상 ID
    event_value: Optional[str] = None   # JSON string
    page_url: Optional[str] = None


class SearchEventRequest(BaseModel):
    """검색 이벤트 요청"""
    session_id: str
    user_id: Optional[int] = None
    query_text: str = Field(..., description="검색어")
    query_type: str = Field(..., description="ingredient, product, brand, general")
    search_method: str = Field(default="text", description="text, voice, autocomplete")
    result_count: int = 0
    filters_applied: Optional[str] = None


class SearchClickRequest(BaseModel):
    """검색 결과 클릭 요청"""
    query_id: int
    clicked_results: int = 1
    first_click_position: Optional[int] = None
    time_to_first_click_ms: Optional[int] = None


class ProductViewRequest(BaseModel):
    """상품 조회 요청"""
    session_id: str
    user_id: Optional[int] = None
    product_pid: int
    view_source: str = Field(..., description="search, recommendation, category, direct, related")
    source_detail: Optional[str] = None
    source_position: Optional[int] = None


class ProductViewUpdateRequest(BaseModel):
    """상품 조회 업데이트 (페이지 이탈 시)"""
    view_id: int
    viewed_tabs: Optional[str] = None  # JSON: ["info", "ingredient", "review"]
    time_on_page_ms: Optional[int] = None
    scroll_depth_pct: Optional[int] = None
    did_favorite: bool = False
    did_outbound_click: bool = False


class RecommendationFeedbackRequest(BaseModel):
    """추천 피드백 요청 (배치 방식)"""
    session_id: str
    user_id: Optional[int] = None
    recommendation_id: str = Field(..., description="추천 요청 ID (UUID)")
    algorithm_type: str = Field(..., description="routine, baumann_match, similar, popular, personal")
    algorithm_version: str = Field(default="v1")
    context_type: str = Field(..., description="home, product_detail, search_result, profile, routine")
    user_skin_type: Optional[str] = None  # DRPT 등
    shown_products: List[int] = Field(..., description="노출된 제품 PID 목록")
    clicked_products: Optional[List[int]] = None
    favorited_products: Optional[List[int]] = None
    impression_time_ms: Optional[int] = None


# ───────────────────────────────────────────────
# 세션 관리 API
# ───────────────────────────────────────────────

@router.post("/session")
def create_session(request: SessionCreateRequest, db: Session = Depends(get_db)):
    """
    새 세션 생성 (사용자가 사이트 방문 시)
    """
    # 이미 존재하는 세션인지 확인
    existing = db.query(UserSession).filter_by(session_id=request.session_id).first()
    if existing:
        return {"message": "세션이 이미 존재합니다", "session_id": request.session_id}
    
    session = UserSession(
        session_id=request.session_id,
        user_id=request.user_id,
        device_type=request.device_type,
        browser=request.browser,
        os=request.os,
        referrer_source=request.referrer_source,
        referrer_url=request.referrer_url,
        utm_source=request.utm_source,
        utm_medium=request.utm_medium,
        utm_campaign=request.utm_campaign,
        landing_page=request.landing_page,
        started_at=datetime.utcnow(),
        page_view_count=0,
        event_count=0,
        is_bounce=1  # 기본값: bounce (1페이지만 보면 bounce)
    )
    db.add(session)
    db.commit()
    
    return {"message": "세션 생성 완료", "session_id": request.session_id}


@router.patch("/session")
def update_session(request: SessionUpdateRequest, db: Session = Depends(get_db)):
    """
    세션 업데이트 (페이지 이동, 종료 시)
    """
    session = db.query(UserSession).filter_by(session_id=request.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")
    
    if request.ended_at:
        session.ended_at = request.ended_at
    if request.page_view_count is not None:
        session.page_view_count = request.page_view_count
        # 2페이지 이상 보면 bounce 아님
        if request.page_view_count > 1:
            session.is_bounce = 0
    if request.event_count is not None:
        session.event_count = request.event_count
    if request.is_bounce is not None:
        session.is_bounce = 1 if request.is_bounce else 0
    
    db.commit()
    
    return {"message": "세션 업데이트 완료"}


# ───────────────────────────────────────────────
# 일반 이벤트 로깅 API
# ───────────────────────────────────────────────

@router.post("/log")
def log_event(request: EventLogRequest, db: Session = Depends(get_db)):
    """
    일반 이벤트 기록 (클릭, 페이지뷰, 성분 추가 등)
    """
    event = EventLog(
        session_id=request.session_id,
        user_id=request.user_id,
        event_type=request.event_type,
        event_target=request.event_target,
        target_id=request.target_id,
        event_value=request.event_value,
        page_url=request.page_url,
        created_at=datetime.utcnow()
    )
    db.add(event)
    
    # 세션의 이벤트 카운트 증가
    session = db.query(UserSession).filter_by(session_id=request.session_id).first()
    if session:
        session.event_count = (session.event_count or 0) + 1
    
    db.commit()
    
    return {"message": "이벤트 기록 완료", "event_id": event.event_id}


# ───────────────────────────────────────────────
# 검색 이벤트 API
# ───────────────────────────────────────────────

@router.post("/search")
def log_search(request: SearchEventRequest, db: Session = Depends(get_db)):
    """
    검색 이벤트 기록
    """
    search = SearchQuery(
        session_id=request.session_id,
        user_id=request.user_id,
        query_text=request.query_text,
        query_type=request.query_type,
        search_method=request.search_method,
        result_count=request.result_count,
        filters_applied=request.filters_applied,
        created_at=datetime.utcnow()
    )
    db.add(search)
    db.commit()
    
    return {"message": "검색 기록 완료", "query_id": search.query_id}


@router.patch("/search/click")
def log_search_click(request: SearchClickRequest, db: Session = Depends(get_db)):
    """
    검색 결과 클릭 기록 (CTR 측정용)
    """
    search = db.query(SearchQuery).filter_by(query_id=request.query_id).first()
    if not search:
        raise HTTPException(status_code=404, detail="검색 기록을 찾을 수 없습니다")
    
    search.clicked_results = request.clicked_results
    search.first_click_position = request.first_click_position
    search.time_to_first_click_ms = request.time_to_first_click_ms
    
    db.commit()
    
    return {"message": "검색 클릭 기록 완료"}


# ───────────────────────────────────────────────
# 상품 조회 API
# ───────────────────────────────────────────────

@router.post("/product-view")
def log_product_view(request: ProductViewRequest, db: Session = Depends(get_db)):
    """
    상품 상세페이지 조회 기록
    """
    view = ProductViewLog(
        session_id=request.session_id,
        user_id=request.user_id,
        product_pid=request.product_pid,
        view_source=request.view_source,
        source_detail=request.source_detail,
        source_position=request.source_position,
        created_at=datetime.utcnow()
    )
    db.add(view)
    db.commit()
    
    return {"message": "상품 조회 기록 완료", "view_id": view.view_id}


@router.patch("/product-view")
def update_product_view(request: ProductViewUpdateRequest, db: Session = Depends(get_db)):
    """
    상품 조회 업데이트 (페이지 이탈 시 체류시간, 스크롤 깊이 등)
    """
    view = db.query(ProductViewLog).filter_by(view_id=request.view_id).first()
    if not view:
        raise HTTPException(status_code=404, detail="조회 기록을 찾을 수 없습니다")
    
    if request.viewed_tabs:
        view.viewed_tabs = request.viewed_tabs
    if request.time_on_page_ms:
        view.time_on_page_ms = request.time_on_page_ms
    if request.scroll_depth_pct:
        view.scroll_depth_pct = request.scroll_depth_pct
    view.did_favorite = 1 if request.did_favorite else 0
    view.did_outbound_click = 1 if request.did_outbound_click else 0
    
    db.commit()
    
    return {"message": "상품 조회 업데이트 완료"}


# ───────────────────────────────────────────────
# 추천 피드백 API
# ───────────────────────────────────────────────

@router.post("/recommendation-feedback")
def log_recommendation_feedback(request: RecommendationFeedbackRequest, db: Session = Depends(get_db)):
    """
    추천 상품에 대한 피드백 기록 (배치 방식)
    """
    import json
    
    feedback = RecommendationFeedback(
        session_id=request.session_id,
        user_id=request.user_id,
        recommendation_id=request.recommendation_id,
        algorithm_type=request.algorithm_type,
        algorithm_version=request.algorithm_version,
        context_type=request.context_type,
        user_skin_type=request.user_skin_type,
        shown_products=json.dumps(request.shown_products),
        shown_count=len(request.shown_products),
        clicked_products=json.dumps(request.clicked_products) if request.clicked_products else None,
        clicked_count=len(request.clicked_products) if request.clicked_products else 0,
        favorited_products=json.dumps(request.favorited_products) if request.favorited_products else None,
        favorited_count=len(request.favorited_products) if request.favorited_products else 0,
        impression_time_ms=request.impression_time_ms,
        created_at=datetime.utcnow()
    )
    db.add(feedback)
    db.commit()
    
    return {"message": "추천 피드백 기록 완료", "feedback_id": feedback.feedback_id, "recommendation_id": request.recommendation_id}


class RecommendationFeedbackUpdateRequest(BaseModel):
    """추천 피드백 업데이트 요청"""
    recommendation_id: str
    clicked_product: Optional[int] = None    # 클릭한 제품 PID
    favorited_product: Optional[int] = None  # 즐겨찾기한 제품 PID
    impression_time_ms: Optional[int] = None # 노출 시간 (ms)


@router.patch("/recommendation-feedback")
def update_recommendation_feedback(request: RecommendationFeedbackUpdateRequest, db: Session = Depends(get_db)):
    """
    추천 피드백 업데이트 (클릭/즐겨찾기 추가)
    """
    import json
    
    feedback = db.query(RecommendationFeedback).filter_by(recommendation_id=request.recommendation_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="추천 기록을 찾을 수 없습니다")
    
    # 클릭 추가
    if request.clicked_product:
        current_clicked = json.loads(feedback.clicked_products) if feedback.clicked_products else []
        if request.clicked_product not in current_clicked:
            current_clicked.append(request.clicked_product)
            feedback.clicked_products = json.dumps(current_clicked)
            feedback.clicked_count = len(current_clicked)
    
    # 즐겨찾기 추가
    if request.favorited_product:
        current_favorited = json.loads(feedback.favorited_products) if feedback.favorited_products else []
        if request.favorited_product not in current_favorited:
            current_favorited.append(request.favorited_product)
            feedback.favorited_products = json.dumps(current_favorited)
            feedback.favorited_count = len(current_favorited)
    
    # 노출 시간 업데이트
    if request.impression_time_ms:
        feedback.impression_time_ms = request.impression_time_ms
    
    db.commit()
    
    return {"message": "피드백 업데이트 완료"}


# ───────────────────────────────────────────────
# 배치 이벤트 (여러 이벤트 한번에)
# ───────────────────────────────────────────────

class BatchEventRequest(BaseModel):
    """여러 이벤트를 한번에 전송"""
    events: List[EventLogRequest]


@router.post("/batch")
def log_batch_events(request: BatchEventRequest, db: Session = Depends(get_db)):
    """
    여러 이벤트를 한번에 기록 (네트워크 효율성)
    """
    event_ids = []
    
    for event_data in request.events:
        event = EventLog(
            session_id=event_data.session_id,
            user_id=event_data.user_id,
            event_type=event_data.event_type,
            event_target=event_data.event_target,
            target_id=event_data.target_id,
            event_value=event_data.event_value,
            page_url=event_data.page_url,
            created_at=datetime.utcnow()
        )
        db.add(event)
        db.flush()  # ID 생성을 위해
        event_ids.append(event.event_id)
    
    db.commit()
    
    return {"message": f"{len(event_ids)}개 이벤트 기록 완료", "event_ids": event_ids}
