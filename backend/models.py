# backend/models.py
from sqlalchemy import Column, BigInteger, Integer, String, Date, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255))
    status = Column(Enum('active', 'blocked'), server_default='active')
    last_login_at = Column(DateTime)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

    profile = relationship("UserProfile", back_populates="user", uselist=False)

class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id = Column(BigInteger, ForeignKey("users.id"), primary_key=True)
    name = Column(String(255))
    nickname = Column(String(255))
    birth_date = Column(Date)
    gender = Column(Enum('female', 'male', 'other', 'na'))
    skin_type_code = Column(String(4))
    skin_axes_json = Column(Text)
    preferences_json = Column(Text)
    allergies_json = Column(Text)
    last_quiz_at = Column(DateTime)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

    user = relationship("User", back_populates="profile")

class UserFavoriteProduct(Base):
    __tablename__ = "user_favorite_products"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    
class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    korean_name = Column(String(255), nullable=False)
    english_name = Column(String(255))
    description = Column(Text)
    caution_grade = Column(String(50)) # 안전 / 주의 / 위험 / NULL
    keyword = Column(String(50), index=True)  # 효능 키워드: moisturizing, soothing 등


# ───────────────────────────────────────────────
# 이벤트 로깅 모델
# ───────────────────────────────────────────────

class UserSession(Base):
    """사용자 세션 정보"""
    __tablename__ = "user_sessions"

    session_id = Column(String(36), primary_key=True)  # UUID v4
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    device_type = Column(Enum('mobile', 'desktop', 'tablet'), nullable=False)
    browser = Column(String(50))
    os = Column(String(50))
    referrer_source = Column(String(100))
    referrer_url = Column(Text)
    utm_source = Column(String(50))
    utm_medium = Column(String(50))
    utm_campaign = Column(String(100))
    landing_page = Column(String(255))
    started_at = Column(DateTime, nullable=False)
    ended_at = Column(DateTime)
    page_view_count = Column(Integer, default=0)
    event_count = Column(Integer, default=0)
    is_bounce = Column(Integer, default=0)  # Boolean


class EventLog(Base):
    """모든 이벤트의 기본 로그"""
    __tablename__ = "event_logs"

    event_id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("user_sessions.session_id"), nullable=True)
    user_id = Column(BigInteger, nullable=True)
    event_type = Column(String(50), nullable=False)
    event_target = Column(String(50), nullable=True)  # ingredient, product, etc.
    target_id = Column(String(100), nullable=True)    # 대상 ID
    event_value = Column(Text)  # JSON
    page_url = Column(String(255))
    created_at = Column(DateTime, nullable=False)


class SearchQuery(Base):
    """검색 쿼리 로그"""
    __tablename__ = "search_queries"

    query_id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("user_sessions.session_id"), nullable=True)
    user_id = Column(BigInteger, nullable=True)
    query_text = Column(String(200), nullable=False)
    query_text_normalized = Column(String(200), nullable=True)
    query_type = Column(Enum('ingredient', 'product', 'brand', 'general'), nullable=False)
    search_method = Column(String(50), default='text')
    result_count = Column(Integer, default=0)
    clicked_results = Column(Integer, default=0)
    first_click_position = Column(Integer, nullable=True)
    time_to_first_click_ms = Column(Integer, nullable=True)
    filters_applied = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False)


class ProductViewLog(Base):
    """상품 조회 로그"""
    __tablename__ = "product_view_logs"

    view_id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("user_sessions.session_id"), nullable=False)
    user_id = Column(BigInteger, nullable=True)
    product_pid = Column(BigInteger, ForeignKey("product_data.pid"), nullable=False)
    view_source = Column(Enum('search', 'recommendation', 'category', 'direct', 'related'), nullable=False)
    source_detail = Column(String(100))
    source_position = Column(Integer)
    viewed_tabs = Column(Text)  # JSON
    time_on_page_ms = Column(Integer)
    scroll_depth_pct = Column(Integer)
    did_favorite = Column(Integer, default=0)  # Boolean
    did_outbound_click = Column(Integer, default=0)  # Boolean
    created_at = Column(DateTime, nullable=False)


class RecommendationFeedback(Base):
    """추천 피드백 로그"""
    __tablename__ = "recommendation_feedback"

    feedback_id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("user_sessions.session_id"), nullable=False)
    user_id = Column(BigInteger, nullable=True)
    recommendation_type = Column(Enum('skin_type', 'similar', 'popular', 'personal'), nullable=False)
    algorithm_version = Column(String(20))
    product_pid = Column(BigInteger, nullable=False)
    position_shown = Column(Integer)
    was_clicked = Column(Integer, default=0)  # Boolean
    was_favorited = Column(Integer, default=0)  # Boolean
    was_purchased = Column(Integer, default=0)  # Boolean
    feedback_score = Column(Integer)  # 1-5
    created_at = Column(DateTime, nullable=False)
