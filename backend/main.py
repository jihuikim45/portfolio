# backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 전부 backend 패키지 기준 상대 import로 통일
from routers import (
    profile, analysis, auth, routine, user, trends,
    favorite_products, product, ocr, stats, delete, ingredients,
    search_ingredients, events, analytics,
)
# from routers import perfume  # 비활성화: perfumes 테이블 미사용
from routers import user_ingredients as user_ingredients_router
from routers.chat import router as chat_router
from routers import search_ingredients

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 필요하면 ["http://localhost:5173"] 등으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----- 특정 라우터 개별 prefix/alias -----
app.include_router(user_ingredients_router.router, prefix="/api/user-ingredients")
app.include_router(
    user_ingredients_router.router,
    prefix="/user-ingredients",
    include_in_schema=False,
)

# ES 성분 검색
app.include_router(search_ingredients.router)


@app.get("/")
def root():
    return {"message": "Backend is running"}


# 라우터 등록 (기존 유지)
app.include_router(profile.router)
app.include_router(analysis.router)
app.include_router(auth.router)
app.include_router(routine.router)
# app.include_router(perfume.router)  # 비활성화
app.include_router(user.router)
app.include_router(trends.router)
app.include_router(favorite_products.router)
app.include_router(product.router)
# search_ingredients.router는 위에서 이미 등록됨 (ES 성분 검색)

# prefix가 필요한 라우터 (기존 유지)
app.include_router(ocr.router, prefix="/api")
app.include_router(stats.router, prefix="/api")

# 기타 (기존 유지)
app.include_router(delete.router)
app.include_router(ingredients.router)

# chat 라우터: /api/chat (정식 경로)
app.include_router(chat_router, prefix="/api")

# chat 라우터: /chat (호환용 별칭, 문서에는 숨김)
app.include_router(chat_router, include_in_schema=False)

# 이벤트 로깅 라우터
app.include_router(events.router, prefix="/api")

# 분석 대시보드 라우터
app.include_router(analytics.router)


@app.get("/healthz")
def healthz():
    return {"ok": True}
