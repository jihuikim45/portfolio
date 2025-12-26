// frontend/src/lib/api.ts

// ------------------------------------------------------------------
// 공용 타입
// ------------------------------------------------------------------
export type RecProduct = {
  pid: number;
  brand?: string;
  product_name?: string;
  category?: string;
  price_krw?: number;
  image_url?: string;
  rag_text?: string;
  score?: number;
  product_url?: string;
  ingredients?: string[];
  ingredients_detail?: { name: string; caution_grade: '위험' | '주의' | '안전' | null }[];
};

export interface IngredientInfo {
  name: string;
  description: string | null;
  caution_grade: CautionGrade;
}
export type CautionGrade = '위험' | '주의' | '안전' | null;

// ------------------------------------------------------------------
// API BASE (절대경로; 끝 슬래시 제거)
//  - .env 예) VITE_API_BASE=http://<EC2-PUBLIC-IP>:8000
// ------------------------------------------------------------------
const API_BASE =
  ((import.meta as any).env?.VITE_API_BASE as string | undefined)?.replace(/\/+$/, '') ||
  'http://127.0.0.1:8000';

// ------------------------------------------------------------------
// 추천 카드 + intent + cache_key 조회
//  - 절대경로(백엔드 8000) + /api/chat/recommend
//  - 검색 + intent 판별 + 카드 + cache_key 까지 한 번에
// ------------------------------------------------------------------
export type RecommendResponse = {
  intent: 'GENERAL' | 'PRODUCT_FIND';
  message: string | null;
  cache_key: string | null;
  products: RecProduct[];
};

export async function fetchRecommendations(
  query: string,
  top_k = 12,
  cache_key?: string
): Promise<RecommendResponse> {
  const res = await fetch(`${API_BASE}/api/chat/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, top_k, cache_key }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<RecommendResponse>;
}

// ------------------------------------------------------------------
// LLM 요약 스트리밍 (Finalize 전용)
//  - 절대경로(백엔드 8000) + /api/chat/finalize
//  - recommend 에서 받은 cache_key 를 꼭 함께 전달해야 함
// ------------------------------------------------------------------
export async function chatStream(query: string, cacheKey: string, signal?: AbortSignal) {
  if (!cacheKey) {
    throw new Error(
      'chatStream 호출 시 cacheKey가 필요합니다. (먼저 fetchRecommendations를 호출하세요)'
    );
  }

  const res = await fetch(`${API_BASE}/api/chat/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, cache_key: cacheKey }),
    signal,
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!res.body) throw new Error('No response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');

  return {
    async *iter() {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        yield decoder.decode(value);
      }
    },
  };
}

// ------------------------------------------------------------------
// OCR 업로드/검색 API (기존 유지)
//  - 서버 직접 호출: VITE_API_BASE 필요
// ------------------------------------------------------------------
type OcrRender = { text: string; image_url?: string | null };
type OcrOk = { success: true; analysis: any; render: OcrRender };
type OcrFail = { success: false; error?: string | null; analysis?: any; render?: OcrRender };

export async function uploadOcrImage(
  file: File
): Promise<{ analysis: any; render: { text: string; image_url?: string } }> {
  const fd = new FormData();
  fd.append('image', file); // ✅ 필드명 image 유지

  const res = await fetch(`${API_BASE}/api/ocr/analyze-image`, {
    method: 'POST',
    body: fd,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`OCR 업로드 실패: ${res.status} ${msg}`);
  }

  const json = await res.json();

  // ✅ 백엔드 형태를 프론트가 쓰는 공통 형태로 변환
  return {
    analysis: json?.raw?.data ?? null,
    render: {
      text: json?.markdown ?? '분석 결과가 없습니다.',
      image_url: json?.image_url ?? undefined,
    },
  };
}

export async function searchOcrByName(
  productName: string
): Promise<{ analysis: any; render: OcrRender }> {
  // ✅ 백엔드 스펙: POST /api/ocr/by-name + FormData(product_name)
  const fd = new FormData();
  fd.append('product_name', productName);

  const res = await fetch(`${API_BASE}/api/ocr/by-name`, {
    method: 'POST',
    body: fd,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`제품명 검색 실패: ${res.status} ${msg}`);
  }

  // ✅ 백엔드 응답(success, markdown, image_url, raw)을 공통 형태로 변환
  const json = await res.json();
  return {
    analysis: json?.raw?.data ?? null,
    render: {
      text: json?.markdown ?? '분석 결과가 없습니다.',
      image_url: json?.image_url ?? null,
    },
  };
}

/** 성분 상세 정보 조회
 *  - 절대경로(백엔드 8000) + /api/chat/ingredient/:name
 */
export async function fetchIngredientDetail(name: string): Promise<IngredientInfo> {
  const res = await fetch(`${API_BASE}/api/chat/ingredient/${encodeURIComponent(name)}`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error('성분 정보를 불러오지 못했습니다.');
  return res.json();
}

// ------------------------------------------------------------------
// 사용자 성분 보관함 API (추가)
//  - 라우터 스펙에 맞춰 절대경로 + 스키마 일치
// ------------------------------------------------------------------

/** 목록: GET /api/user-ingredients?userId=... */
export async function getUserIngredients(userId: number) {
  const url = `${API_BASE}/api/user-ingredients?userId=${encodeURIComponent(userId)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`getUserIngredients HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json() as Promise<
    Array<{
      userId: number;
      userName: string;
      koreanName: string;
      ingType: 'preferred' | 'caution';
      createAt?: string | null;
    }>
  >;
}

/** 추가: POST /api/user-ingredients  (body: { userId, koreanName, ingType, userName? }) */
export async function addUserIngredient(params: {
  userId: number;
  koreanName: string;
  ingType: 'preferred' | 'caution';
  userName?: string;
}) {
  const res = await fetch(`${API_BASE}/api/user-ingredients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`addUserIngredient HTTP ${res.status}: ${t.slice(0, 200)}`);
  }

  // 성분 추가 이벤트 로깅
  const sessionId = getOrCreateSessionId();
  console.log('[EVENT] logEvent 호출 (addUserIngredient):', {
    sessionId,
    userId: params.userId,
    eventType: params.ingType === 'preferred' ? 'preference_add' : 'caution_add',
    targetId: params.koreanName,
  });
  logEvent({
    sessionId,
    userId: params.userId,
    eventType: params.ingType === 'preferred' ? 'preference_add' : 'caution_add',
    eventTarget: 'ingredient',
    targetId: params.koreanName,
    eventValue: { korean_name: params.koreanName, ing_type: params.ingType },
  }).then(res => {
    console.log('[EVENT] logEvent 응답:', res);
  });

  return res.json();
}

/** 삭제: DELETE /api/user-ingredients/{userId}/{key}?ingType=preferred|caution */
export async function deleteUserIngredient(
  userId: number,
  key: string | number,
  ingType?: 'preferred' | 'caution'
) {
  const base = `${API_BASE}/api/user-ingredients/${encodeURIComponent(
    userId
  )}/${encodeURIComponent(String(key))}`;
  const url = ingType ? `${base}?ingType=${encodeURIComponent(ingType)}` : base;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`deleteUserIngredient HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

// ------------------------------------------------------------------
// 이벤트 로깅 API
// ------------------------------------------------------------------

/** 세션 ID 생성/조회 (localStorage 기반) */
export function getOrCreateSessionId(): string {
  const key = 'aller_session_id';
  let sessionId = localStorage.getItem(key);
  if (!sessionId) {
    sessionId = generateUUID();
    localStorage.setItem(key, sessionId);
  }
  return sessionId;
}

/** 세션 생성 */
export async function createSession(params: {
  sessionId: string;
  userId?: number;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}) {
  const res = await fetch(`${API_BASE}/api/events/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: params.sessionId,
      user_id: params.userId,
      device_type: params.deviceType,
      referrer: params.referrer,
      utm_source: params.utmSource,
      utm_medium: params.utmMedium,
      utm_campaign: params.utmCampaign,
    }),
  });
  if (!res.ok) {
    console.warn('세션 생성 실패:', res.status);
    return null;
  }
  return res.json();
}

/** 일반 이벤트 로깅 */
export async function logEvent(params: {
  sessionId: string;
  userId?: number;
  eventType: string;
  eventTarget?: string;  // ingredient, product, etc.
  targetId?: string;     // 대상 ID
  eventValue?: Record<string, any>;
  pageUrl?: string;
}) {
  try {
    const res = await fetch(`${API_BASE}/api/events/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: params.sessionId,
        user_id: params.userId,
        event_type: params.eventType,
        event_target: params.eventTarget,
        target_id: params.targetId,
        event_value: params.eventValue ? JSON.stringify(params.eventValue) : undefined,
        page_url: params.pageUrl || window.location.href,
      }),
    });
    return res.ok;
  } catch (e) {
    console.warn('이벤트 로깅 실패:', e);
    return false;
  }
}

/** 검색 이벤트 로깅 */
export async function logSearch(params: {
  sessionId: string;
  userId?: number;
  queryText: string;
  queryType: 'ingredient' | 'product' | 'general';
  searchMethod?: 'text' | 'voice' | 'autocomplete';
  resultCount?: number;
  filtersApplied?: Record<string, any>;
}) {
  try {
    const res = await fetch(`${API_BASE}/api/events/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: params.sessionId,
        user_id: params.userId,
        query_text: params.queryText,
        query_type: params.queryType,
        search_method: params.searchMethod || 'text',
        result_count: params.resultCount || 0,
        filters_applied: params.filtersApplied ? JSON.stringify(params.filtersApplied) : undefined,
      }),
    });
    if (!res.ok) return null;
    return res.json() as Promise<{ query_id: number }>;
  } catch (e) {
    console.warn('검색 로깅 실패:', e);
    return null;
  }
}

/** 추천 피드백 업데이트 (클릭/즐겨찾기/노출시간) */
export async function updateRecommendationFeedback(params: {
  recommendationId: string;
  clickedProduct?: number;
  favoritedProduct?: number;
  impressionTimeMs?: number;
}) {
  try {
    console.log('[EVENT] updateRecommendationFeedback 호출:', params);
    const res = await fetch(`${API_BASE}/api/events/recommendation-feedback`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recommendation_id: params.recommendationId,
        clicked_product: params.clickedProduct,
        favorited_product: params.favoritedProduct,
        impression_time_ms: params.impressionTimeMs,
      }),
    });
    if (!res.ok) {
      console.warn('추천 피드백 업데이트 실패:', res.status);
      return null;
    }
    return res.json();
  } catch (e) {
    console.warn('추천 피드백 업데이트 실패:', e);
    return null;
  }
}

/** 검색 결과 클릭 추적 */
export async function logSearchClick(params: {
  queryId: number;
  clickedResults?: number;
  firstClickPosition?: number;
  timeToFirstClickMs?: number;
}) {
  try {
    await fetch(`${API_BASE}/api/events/search/click`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query_id: params.queryId,
        clicked_results: params.clickedResults || 1,
        first_click_position: params.firstClickPosition,
        time_to_first_click_ms: params.timeToFirstClickMs,
      }),
    });
  } catch (e) {
    console.warn('검색 클릭 로깅 실패:', e);
  }
}

/** 제품 조회 로깅 */
export async function logProductView(params: {
  sessionId: string;
  userId?: number;
  productPid: number;
  source: 'search_result' | 'recommendation' | 'direct' | 'product_detail';
  position?: number;
}) {
  try {
    const res = await fetch(`${API_BASE}/api/events/product-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: params.sessionId,
        user_id: params.userId,
        product_pid: params.productPid,
        source: params.source,
        position: params.position,
      }),
    });
    if (!res.ok) return null;
    return res.json() as Promise<{ view_id: number }>;
  } catch (e) {
    console.warn('제품 조회 로깅 실패:', e);
    return null;
  }
}

/** 추천 피드백 로깅 (배치 방식) */
export async function logRecommendationFeedback(params: {
  sessionId: string;
  userId?: number;
  recommendationId: string;  // UUID
  algorithmType: 'routine' | 'baumann_match' | 'similar' | 'popular' | 'personal';
  algorithmVersion?: string;
  contextType: 'home' | 'product_detail' | 'search_result' | 'profile' | 'routine';
  userSkinType?: string;
  shownProducts: number[];   // 노출된 제품 PID 목록
  clickedProducts?: number[];
  favoritedProducts?: number[];
  impressionTimeMs?: number;
}) {
  try {
    console.log('[EVENT] logRecommendationFeedback 호출:', params);
    const res = await fetch(`${API_BASE}/api/events/recommendation-feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: params.sessionId,
        user_id: params.userId,
        recommendation_id: params.recommendationId,
        algorithm_type: params.algorithmType,
        algorithm_version: params.algorithmVersion || 'v1',
        context_type: params.contextType,
        user_skin_type: params.userSkinType,
        shown_products: params.shownProducts,
        clicked_products: params.clickedProducts,
        favorited_products: params.favoritedProducts,
        impression_time_ms: params.impressionTimeMs,
      }),
    });
    if (!res.ok) {
      console.warn('추천 피드백 로깅 실패:', res.status);
      return null;
    }
    return res.json();
  } catch (e) {
    console.warn('추천 피드백 로깅 실패:', e);
    return null;
  }
}
