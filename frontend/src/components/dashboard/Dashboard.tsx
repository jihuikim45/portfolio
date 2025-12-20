'use client';

import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';

import DashboardHeader from './DashboardHeader';
import DashboardBottomNav from './DashboardBottomNav';

import SkinSummary from './SkinSummary';
import TrendsSection from './TrendsSection';

// 우측 카드(피부타입 가이드)
import SkinTypeGuide from './SkinTypeGuide';

// 검색 섹션 (실험: 대시보드 상단 노출)
import { IngredientSearchSection } from '@/features/add-ingredient';
import { Ingredient, IngredientType } from '@/entities/ingredient';
import { useUserStore } from '@/stores/auth/store';
import { logEvent, getOrCreateSessionId } from '@/lib/api';
import { API_BASE } from '@/lib/env';

// 아이콘
import { TestTube2, Sparkles, ArrowRight, RefreshCcw, Search } from 'lucide-react';

// 토스트
import { SimpleToast } from '@/shared/ui';
import { useToast } from '@/shared';

export interface DashboardProps {
  userName?: string;
  onNavigate?: (page: string) => void;
}

type AxisKey = 'OD' | 'SR' | 'PN' | 'WT';
type AxisBrief = { avg: number; letter: string; confidence: number };
type AxesJSON = Record<AxisKey, AxisBrief>;

export default function Dashboard({ userName = 'Sarah', onNavigate }: DashboardProps) {
  // --- 대시보드 상태 ---
  const [selectedPeriod, setSelectedPeriod] = useState('7days');

  const [baumannType, setBaumannType] = useState<string>(''); // ← 빈 문자열로 초기화
  const [axes, setAxes] = useState<AxesJSON | null>(null);
  const [userId, setUserId] = useState<number | undefined>(undefined);

  // --- 검색 관련 상태 ---
  const { name, preferredIngredients, cautionIngredients } = useUserStore();
  const { toast, showToast } = useToast();
  const [isAddingIngredient, setIsAddingIngredient] = useState(false);

  // --- 축/라벨 계산 ---
  const code = (baumannType || 'ORNT').toUpperCase();
  const pick = { OD: code[0], SR: code[1], PN: code[2], WT: code[3] } as const;
  const koAxisWord = {
    OD: pick.OD === 'O' ? '지성' : '건성',
    SR: pick.SR === 'R' ? '저항성' : '민감성',
    PN: pick.PN === 'N' ? '비색소침착' : '색소침착',
    WT: pick.WT === 'T' ? '탱탱함' : '주름',
  };
  const concernLabel: Record<AxisKey, string> = {
    OD: pick.OD === 'O' ? 'OILY' : 'DRY',
    SR: pick.SR === 'R' ? 'RESISTANCE' : 'SENSITIVE',
    PN: pick.PN === 'N' ? 'NON-PIGMENTED' : 'PIGMENTED',
    WT: pick.WT === 'T' ? 'TIGHT' : 'WRINKLED',
  };
  const concerns = useMemo(() => {
    return (['OD', 'SR', 'PN', 'WT'] as AxisKey[]).map(ax => {
      const axisData = axes?.[ax];
      const confidence = axisData?.confidence ? Math.round(axisData.confidence) : 50;
      const letter = axisData?.letter || '';

      // letter가 O/S/P/W면 왼쪽(value 그대로)
      // letter가 D/R/N/T면 오른쪽(100 - value)
      let value = confidence;
      if (ax === 'OD' && letter === 'D') value = 100 - confidence;
      if (ax === 'SR' && letter === 'R') value = 100 - confidence;
      if (ax === 'PN' && letter === 'N') value = 100 - confidence;
      if (ax === 'WT' && letter === 'T') value = 100 - confidence;

      return {
        key: ax,
        label: concernLabel[ax],
        value: value,
        displayValue: confidence, // ← 화면 표시용 (항상 원래 confidence)
      };
    });
  }, [axes, baumannType]);

  // --- 프로필/축 로드 ---
  // 1) 최초 마운트: 캐시값 로드 + userId 상태 세팅
  useEffect(() => {
    try {
      const cachedType = localStorage.getItem('skin_type_code');
      const cachedAxes = localStorage.getItem('skin_axes_json');
      if (cachedType) setBaumannType(cachedType);
      if (cachedAxes)
        try {
          setAxes(JSON.parse(cachedAxes));
        } catch {}

      const userIdStr = localStorage.getItem('user_id') ?? '1';
      const id = Number.parseInt(userIdStr, 10);
      setUserId(Number.isFinite(id) ? id : 1);
    } catch (e) {
      setUserId(1);
    }
  }, []);

  // 2) userId가 준비되면 프로필 fetch
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const base = (await import('../../lib/env')).API_BASE;
        if (!base) return;
        const res = await fetch(`${base}/api/profile/${userId}`);
        if (!res.ok) {
          // 404면 진단 안 한 상태
          setBaumannType('');
          return;
        }
        const data = await res.json();

        if (data?.skin_type_code) {
          const newType = String(data.skin_type_code);
          setBaumannType(newType);
          localStorage.setItem('skin_type_code', newType);
        } else {
          // skin_type_code 없으면 빈 문자열
          setBaumannType('');
        }

        if (data?.skin_axes_json) {
          const json =
            typeof data.skin_axes_json === 'string'
              ? data.skin_axes_json
              : JSON.stringify(data.skin_axes_json);
          localStorage.setItem('skin_axes_json', json);
          try {
            setAxes(JSON.parse(json));
          } catch {}
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    })();
  }, [userId]);

  // --- 성분 추가 핸들러 (대시보드용) ---
  const handleAddIngredient = async (ingredient: Ingredient, type: IngredientType) => {
    if (!userId) {
      showToast('로그인이 필요합니다', 'warning');
      return;
    }

    if (!ingredient.korean_name?.trim()) {
      showToast('성분명이 올바르지 않습니다', 'warning');
      return;
    }

    // 중복 체크
    const isDuplicate =
      type === 'preferred'
        ? preferredIngredients.some(i => i.name === ingredient.korean_name)
        : cautionIngredients.some(i => i.name === ingredient.korean_name);

    if (isDuplicate) {
      showToast('이미 추가된 성분입니다', 'warning');
      return;
    }

    setIsAddingIngredient(true);

    try {
      const response = await fetch(`${API_BASE}/api/user-ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userName: name || '',
          koreanName: ingredient.korean_name,
          ingType: type,
        }),
      });

      if (!response.ok) {
        if (response.status === 409) {
          showToast('이미 추가된 성분입니다', 'warning');
          return;
        }
        throw new Error('Failed to add ingredient');
      }

      // 성분 추가 이벤트 로깅
      const sessionId = getOrCreateSessionId();
      logEvent({
        sessionId,
        userId,
        eventType: type === 'preferred' ? 'preference_add' : 'caution_add',
        eventTarget: 'ingredient',
        targetId: ingredient.korean_name,
        eventValue: { 
          korean_name: ingredient.korean_name, 
          ing_type: type,
          source: 'dashboard_search'  // 대시보드에서 추가됨을 표시
        },
      });

      // Store 업데이트
      const newIngredient = {
        id: Date.now(),
        name: ingredient.korean_name,
        ...(type === 'preferred'
          ? { benefit: ingredient.description || '' }
          : {
              reason: ingredient.description || '',
              severity: (ingredient.caution_grade?.includes('고')
                ? 'high'
                : ingredient.caution_grade?.includes('중')
                  ? 'mid'
                  : 'low') as 'low' | 'mid' | 'high',
            }),
      };

      useUserStore.getState().addIngredient({
        ...newIngredient,
        type,
      });

      showToast(
        `${ingredient.korean_name}을(를) ${type === 'preferred' ? '선호' : '주의'} 성분에 추가했습니다`,
        'success'
      );
    } catch (error) {
      console.error('성분 추가 실패:', error);
      showToast('성분 추가에 실패했습니다', 'error');
    } finally {
      setIsAddingIngredient(false);
    }
  };

  // ▼ 진단 필요 컴포넌트
  const DiagnosisNeeded = () => (
    <div className="relative flex flex-col items-center justify-center p-6 sm:p-8 text-center min-h-[400px] overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-32 h-32 rounded-full bg-gradient-to-br from-pink-200/30 to-purple-200/30 blur-2xl top-4 left-4"></div>
        <div className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-blue-200/30 to-pink-200/30 blur-xl bottom-8 right-8"></div>
        <div className="absolute w-40 h-40 rounded-full bg-gradient-to-br from-purple-200/20 to-pink-200/20 blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="relative z-10 w-full max-w-md">
        {/* 아이콘 */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center mb-5 shadow-lg transform hover:scale-105 transition-transform">
          <TestTube2 className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
        </div>

        {/* 제목 */}
        <h3 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
          피부타입 진단이 필요합니다
        </h3>

        {/* 부제 */}
        <p className="text-gray-500 text-sm mb-6">
          3분이면 당신의 피부를 완벽하게 이해할 수 있어요
        </p>

        {/* 이점 카드들 */}
        <div className="grid grid-cols-1 gap-3 mb-6">
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-pink-50 to-pink-100/50 rounded-xl border border-pink-200">
            <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="font-bold text-gray-800 text-sm">맞춤 제품 추천</p>
              <p className="text-xs text-gray-600">피부 타입에 딱 맞는 화장품</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-xl border border-purple-200">
            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
              <RefreshCcw className="w-5 h-5 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="font-bold text-gray-800 text-sm">개인화된 루틴</p>
              <p className="text-xs text-gray-600">계절/시간대별 스킨케어</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl border border-blue-200">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <ArrowRight className="w-5 h-5 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="font-bold text-gray-800 text-sm">정확한 AI 상담</p>
              <p className="text-xs text-gray-600">과학적 분석 기반 조언</p>
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <button
          onClick={() => onNavigate?.('diagnosis')}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #f5c6d9 0%, #e8b4d4 100%)',
          }}
        >
          <Sparkles className="w-5 h-5" />
          지금 진단하기
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* 하단 안내 */}
        <p className="text-xs text-gray-400 mt-4">약 3~5분 소요 · 무료 · 언제든 다시 진단 가능</p>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen w-full pb-16 md:pb-0"
      style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #f3e8ff 50%, #ddd6fe 100%)' }}
    >
      <DashboardHeader userName={userName} onNavigate={onNavigate} currentPage="dashboard" />

      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-7xl">
        {/* === 검색 섹션 (실험: Treatment 그룹) === */}
        <section className="mb-6">
          <IngredientSearchSection onAddIngredient={handleAddIngredient} />
        </section>

        {/* === 상단: 하나의 대형 카드(2열) === */}
        <section className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* 좌측: SkinSummary 또는 진단 필요 */}
            <div className="p-4 sm:p-6 embed-card md:border-r md:border-gray-100">
              {baumannType ? (
                <SkinSummary
                  code={code}
                  koAxisWord={koAxisWord}
                  concerns={concerns}
                  pick={pick}
                  onNavigate={onNavigate}
                />
              ) : (
                <DiagnosisNeeded />
              )}
            </div>

            {/* 우측: 피부타입 가이드 */}
            <div className="p-4 sm:p-6 max-h-[700px] overflow-y-auto">
              <SkinTypeGuide typeCode={baumannType} />
            </div>
          </div>
        </section>

        {/* ▼ 지금 뜨는 제품 랭킹 */}
        {/* <div className="mt-6">
          <TrendsSection />
        </div> */}
      </main>

      <DashboardBottomNav onNavigate={onNavigate} currentPage="dashboard" />

      {/* Toast */}
      <SimpleToast message={toast.message || ''} isVisible={toast.isVisible} />
    </div>
  );
}
