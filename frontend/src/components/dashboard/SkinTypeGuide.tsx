'use client';

import * as React from 'react';
import {
  Droplets,
  Shield,
  CircleDot,
  Sparkles,
  Heart,
  AlertTriangle,
  CheckCircle,
  Sun,
} from 'lucide-react';

interface SkinTypeGuideProps {
  typeCode?: string;
  className?: string;
}

// 타입별 상세 정보
const TYPE_DETAILS: Record<
  string,
  {
    title: string;
    summary: string;
    concerns: string[];
    priorities: string[];
    routine: { step: string; ingredients: string[] }[];
    tips: string[];
  }
> = {
  DSPT: {
    title: '예민하고 건조해서 색소침착이 쌓인 피부',
    summary: '진정과 장벽 회복이 모든 관리의 시작점이다.',
    concerns: [
      '피부가 쉽게 건조해지고 당김이 느껴짐',
      '트러블이나 염증이 반복되고, 그 자리에 색소침착이 남음',
      '자극에 예민하게 반응해 피부결이 고르지 않음',
      '주름은 많지 않지만 피부장벽이 약한 상태',
    ],
    priorities: ['피부장벽 강화', '염증과 자극 진정', '그 다음 색소침착 케어'],
    routine: [
      { step: '보습 · 장벽 강화', ingredients: ['세라마이드', '판테놀', '마데카소사이드'] },
      { step: '항염 · 진정 케어', ingredients: ['병풀추출물', '알란토인', '카렌듈라'] },
      { step: '색소침착 케어', ingredients: ['나이아신아마이드', '알부틴', '비타민C 유도체'] },
      { step: '자외선 차단', ingredients: ['SPF 30 이상', '저자극 선크림'] },
    ],
    tips: ['급격한 온도 변화 피하기', '향료, 알코올 없는 화장품 선택', '세안과 각질 제거는 최소화'],
  },
  DSNT: {
    title: '건조한데 예민해서 쉽게 붉어지고 트러블이 나는 피부',
    summary: '자극 차단 + 장벽 보습이 전부다.',
    concerns: [
      '당김, 각질, 건조로 화장이 들뜸',
      '바람·온도 변화·화장품에 쉽게 따가움/붉어짐',
      '트러블이 잦고 장벽이 약해짐',
      '톤은 비교적 균일, 주름은 적은 편',
    ],
    priorities: ['장벽 강화 보습', '항염·진정', '트러블 재발 방지', '자외선 차단'],
    routine: [
      { step: '보습 · 장벽 강화', ingredients: ['세라마이드', '판테놀', '마데카소사이드'] },
      { step: '항염 · 진정', ingredients: ['병풀추출물', '알란토인', '녹차'] },
      { step: '클렌징', ingredients: ['무향료', '약산성', '크림·젤 클렌저'] },
      { step: '자외선 차단', ingredients: ['민감성용 저자극 선크림'] },
    ],
    tips: ['제품 개수 늘리지 말고 기본 루틴 고정', '오메가-3/LA/GLA 식이 보충'],
  },
  DSPW: {
    title: '건조하고 예민해서 염증이 반복되고, 색소+주름으로 남는 피부',
    summary: '장벽 회복 → 진정 → 색소 → 주름 순서가 고정이다.',
    concerns: [
      '건조 + 민감으로 자극에 바로 트러블',
      '트러블 후 색소침착이 잘 남음',
      '건조로 잔주름이 빨리 늘어남',
      '장벽이 약해 악화-회복을 반복',
    ],
    priorities: ['장벽 강화', '염증/자극 진정', '저자극 색소침착 케어', '저자극 주름 케어'],
    routine: [
      { step: '보습 · 장벽 강화', ingredients: ['세라마이드', '판테놀', '마데카소사이드'] },
      { step: '항염 · 진정', ingredients: ['병풀', '알란토인', '카렌듈라'] },
      { step: '색소침착 케어', ingredients: ['나이아신아마이드', '알부틴', '비타민C 유도체'] },
      { step: '주름 케어 + 선케어', ingredients: ['저자극 레티놀', '펩타이드', 'SPF30+'] },
    ],
    tips: ['순서를 거꾸로 하면 오히려 트러블이 더 심해질 수 있다'],
  },
  DSNW: {
    title: '건조하고 예민한데 색소는 거의 없고, 주름이 빨리 오는 피부',
    summary: '장벽 보습 + 노화 예방을 같이 해야 한다.',
    concerns: [
      '건조로 당김·각질이 잦음',
      '자극에 쉽게 붉어짐/따가움',
      '톤은 균일하지만 주름이 빠르게 보일 수 있음',
      '장벽이 약해 쉽게 손상',
    ],
    priorities: ['장벽 강화 보습', '진정(염증 억제)', '항산화/주름 케어', '자외선 차단'],
    routine: [
      { step: '보습 · 장벽 강화', ingredients: ['세라마이드', '판테놀', '마데카소사이드'] },
      { step: '항염 · 진정', ingredients: ['병풀', '알란토인', '카모마일'] },
      {
        step: '항산화/주름 케어',
        ingredients: ['비타민C', '녹차', '코엔자임Q10', '저강도 레티노이드'],
      },
      { step: '자외선 차단', ingredients: ['민감성용 SPF30+'] },
    ],
    tips: ['저강도부터 천천히 시작'],
  },
  OSPT: {
    title: '유분은 많은데 예민해서 염증이 잦고, 그 뒤에 색소가 남는 피부',
    summary: '염증 조절이 곧 색소 예방이다.',
    concerns: [
      '번들거림 + 트러블(염증성)',
      '여드름 자국/색소침착이 쉽게 남음',
      '자극에 민감해서 강한 제품 못 씀',
      '주름은 비교적 적은 편',
    ],
    priorities: ['염증/자극 진정', '유분·모공 막힘 관리', '저자극 톤 케어', '자외선 차단'],
    routine: [
      { step: '클렌징', ingredients: ['약산성', '논코메도제닉', '과세정 금지'] },
      { step: '항염 · 진정', ingredients: ['병풀', '알란토인', '판테놀'] },
      { step: '색소침착 케어', ingredients: ['나이아신아마이드', '알부틴', '비타민C 유도체'] },
      { step: '선케어', ingredients: ['가벼운 제형', '민감성용', 'SPF30+'] },
    ],
    tips: ['과세정 금지', '저자극 제품 선택'],
  },
  OSNT: {
    title: '유분은 많고 예민해서 트러블은 잘 나지만, 색소·주름은 적은 피부',
    summary: '트러블만 잡으면 가장 깔끔한 피부로 가기 쉬운 타입이다.',
    concerns: [
      '번들거림, 모공 막힘, 여드름',
      '자극에 민감해서 쉽게 붉어짐',
      '톤은 비교적 균일, 주름은 적음',
    ],
    priorities: ['자극 줄이기', '트러블/염증 억제', '장벽 보습(가볍게)', '자외선 차단'],
    routine: [
      { step: '순한 클렌징', ingredients: ['약산성', '과도한 유분 제거 금지'] },
      { step: '항염 케어', ingredients: ['녹차', '병풀', '트러블 케어 성분'] },
      { step: '가벼운 장벽 보습', ingredients: ['세라마이드', '판테놀'] },
      { step: '선케어', ingredients: ['민감성용 SPF30+'] },
    ],
    tips: ['트러블 관리에 집중하면 좋은 피부 유지 가능'],
  },
  OSPW: {
    title: '유분 많은데 예민하고, 색소+주름이 같이 오는 피부',
    summary: '자극 줄이면서 항산화·선케어를 강하게 가져가야 한다.',
    concerns: [
      '트러블/자극 반응이 잦음',
      '톤이 고르지 않고 칙칙함',
      '주름이 점점 늘어남',
      '알코올/향료 등에 쉽게 악화',
    ],
    priorities: ['자극 차단·진정', '항산화 + 톤 케어', '주름 예방/개선', '자외선 차단'],
    routine: [
      { step: '항염 · 진정', ingredients: ['병풀', '알란토인'] },
      { step: '항산화/톤 케어', ingredients: ['비타민C/E', '자극 낮은 제형'] },
      { step: '주름 케어', ingredients: ['펩타이드', '저자극 레티노이드'] },
      { step: '선케어', ingredients: ['SPF30+', '무향료', '저자극'] },
    ],
    tips: ['강한 성분은 피하고 천천히'],
  },
  OSNW: {
    title: '유분 많은 예민 피부인데, 색소는 적고 주름이 잘 생기는 타입',
    summary: '진정 + 노화 케어 + 가벼운 보습이 핵심이다.',
    concerns: [
      '번들거림 + 트러블',
      '민감해서 쉽게 붉어짐',
      '색소는 적지만 주름이 늘기 쉬움',
      '강한 클렌징/스크럽에 악화',
    ],
    priorities: ['자극 최소화', '항염·진정', '항산화/주름 케어', '자외선 차단'],
    routine: [
      { step: '순한 클렌징', ingredients: ['약산성', '젤/로션 타입'] },
      { step: '진정', ingredients: ['병풀', '판테놀'] },
      { step: '항산화/주름 케어', ingredients: ['비타민C', '녹차', '레티노이드(저강도)'] },
      { step: '선케어', ingredients: ['SPF30+'] },
    ],
    tips: ['저강도부터 시작'],
  },
  ORPT: {
    title: '유분 많고 튼튼한데, 색소침착만 잘 생기는 피부',
    summary: '톤 관리(미백) + 선케어가 메인이다.',
    concerns: [
      '피부는 강한 편(자극에 둔감)',
      '주름은 적음',
      '대신 칙칙함/잡티/색소가 잘 생김',
      '유분 때문에 모공 관리도 필요',
    ],
    priorities: ['자외선 차단', '미백/톤 개선', '각질 정돈', '유분 밸런스'],
    routine: [
      { step: '미백 케어', ingredients: ['비타민C', '알부틴', '나이아신아마이드'] },
      { step: '가벼운 보습', ingredients: ['유수분 밸런스 맞추기'] },
      { step: '각질 정돈', ingredients: ['주 1~2회', '자극 낮은 방식'] },
      { step: '선케어', ingredients: ['SPF30+ PA+++'] },
    ],
    tips: ['비교적 적극적인 미백 케어 가능'],
  },
  ORNT: {
    title: '유분도 있고 튼튼하고, 색소·주름도 적은 균형형 피부',
    summary: '유분 막힘만 관리하면 오래 좋은 피부다.',
    concerns: ['번들거림/블랙헤드 정도', '트러블·자극은 비교적 적음', '톤 균일, 주름 적음'],
    priorities: ['모공 막힘 예방', '과세정 피하기', '기본 선케어', '필요할 때만 보습'],
    routine: [
      { step: '클렌징', ingredients: ['세정력 확보', '강한 건 피하기'] },
      { step: '주기적 각질 정돈', ingredients: ['모공 막힘 예방 목적'] },
      { step: '보습', ingredients: ['필요할 때만 가볍게'] },
      { step: '선케어', ingredients: ['SPF30+'] },
    ],
    tips: ['기본만 잘 해도 좋은 피부 유지'],
  },
  ORPW: {
    title: '튼튼한 지성인데, 색소+주름이 같이 오는 타입',
    summary: '항산화 + 주름 + 톤을 세게 해도 버티는 편이다.',
    concerns: [
      '유분은 많아 건조는 덜함',
      '칙칙함/잡티가 쌓임',
      '주름·탄력 저하가 같이 옴',
      '피부는 자극에 강한 편',
    ],
    priorities: ['항산화', '주름 케어', '각질 정돈', '자외선 차단'],
    routine: [
      { step: '항산화/톤 케어', ingredients: ['비타민C/E', '페룰산'] },
      { step: '주름 케어', ingredients: ['레티놀', '펩타이드'] },
      { step: '각질 케어', ingredients: ['AHA/BHA', '주 1~2회'] },
      { step: '선케어', ingredients: ['SPF30+'] },
    ],
    tips: ['적극적인 케어 가능한 피부'],
  },
  ORNW: {
    title: '튼튼한 지성인데 색소는 적고, 주름이 잘 생기는 타입',
    summary: '주름 케어를 늦추면 그대로 늘다. 선케어 포함 빨리 시작해야 한다.',
    concerns: [
      '유분은 충분해서 겉은 편함',
      '트러블/색소는 비교적 적음',
      '그런데 탄력 저하·주름이 눈에 띄기 쉬움',
    ],
    priorities: ['자외선 차단', '주름(콜라겐) 케어', '각질 정돈', '순한 클렌징'],
    routine: [
      { step: '주름 케어', ingredients: ['레티노이드', '펩타이드'] },
      { step: '각질 정돈', ingredients: ['AHA/BHA', '주 1~2회'] },
      { step: '클렌징', ingredients: ['젤/로션 타입'] },
      { step: '선케어', ingredients: ['SPF30+'] },
    ],
    tips: ['주름 케어 빨리 시작할수록 좋다'],
  },
  DRNT: {
    title: '건조하지만 튼튼해서 트러블·색소·주름이 적은 피부',
    summary: '보습만 제대로 하면 안정적으로 유지된다.',
    concerns: ['건조로 당김, 각질', '화장 들뜸', '자극 반응은 적은 편'],
    priorities: ['보습', '각질 정돈', '항산화(예방)', '자외선 차단'],
    routine: [
      { step: '고보습', ingredients: ['히알루론산', '글리세린', '세라마이드'] },
      { step: '순한 클렌징', ingredients: ['크림/젤 타입'] },
      { step: '각질 관리', ingredients: ['AHA/효소', '주 1~2회'] },
      { step: '선케어', ingredients: ['SPF15~30 이상'] },
    ],
    tips: ['보습이 핵심'],
  },
  DRPT: {
    title: '건조하지만 튼튼해서, 색소침착만 잘 생기는 피부',
    summary: '보습 + 미백 + 선케어 3가지만 꾸준히 하면 된다.',
    concerns: [
      '당김, 수분 부족',
      '기미/잡티가 쉽게 생김',
      '자극에는 비교적 강함',
      '주름은 적은 편',
    ],
    priorities: ['자외선 차단', '미백/톤 케어', '보습', '각질 정돈'],
    routine: [
      { step: '보습', ingredients: ['세라마이드', '글리세린', '히알루론산'] },
      { step: '미백 케어', ingredients: ['나이아신아마이드', '알부틴', '비타민C'] },
      { step: '각질 정돈', ingredients: ['주 1회 정도 부드럽게'] },
      { step: '선케어', ingredients: ['SPF30+', '덧바르기'] },
    ],
    tips: ['선케어가 색소 예방 1순위'],
  },
  DRNW: {
    title: '건조하지만 튼튼한데, 주름이 잘 생기는 피부',
    summary: '수분 유지 + 레티노이드 + 선케어가 답이다.',
    concerns: [
      '건조로 잔주름이 잘 보임',
      '노화 속도가 빨라 보일 수 있음',
      '톤은 비교적 균일(색소 적음)',
      '민감하지 않아 기능성 활용 가능',
    ],
    priorities: ['강력 보습', '주름 케어', '항산화', '자외선 차단'],
    routine: [
      { step: '고보습', ingredients: ['세라마이드', '히알루론산', '스쿠알란'] },
      { step: '주름 케어', ingredients: ['레티놀/레티날(밤에)'] },
      { step: '항산화', ingredients: ['비타민C/E', '녹차', '나이아신아마이드'] },
      { step: '선케어', ingredients: ['SPF30+'] },
    ],
    tips: ['기능성 제품 적극 활용 가능'],
  },
  DRPW: {
    title: '건조한데 튼튼해서, 색소+주름이 같이 쌓이는 피부',
    summary: '강한 기능성도 사용 가능하지만, 선케어 없으면 다 무의미다.',
    concerns: [
      '건조로 푸석·각질',
      '잡티/기미로 톤 불균',
      '주름이 쉽게 늘어남',
      '민감하지 않아 적극 케어 가능',
    ],
    priorities: ['자외선 차단', '항산화', '레티노이드(주름)', '보습 + 각질 정돈'],
    routine: [
      { step: '보습', ingredients: ['세라마이드', '히알루론산', '스쿠알란'] },
      { step: '항산화/미백', ingredients: ['비타민C/E', '녹차', '나이아신아마이드'] },
      { step: '주름 케어', ingredients: ['레티노이드(밤)', '펩타이드'] },
      { step: '각질 케어 + 선케어', ingredients: ['AHA(주기적)', 'SPF30+'] },
    ],
    tips: ['적극적인 케어 가능, 선케어 필수'],
  },
};

// 스텝별 아이콘
const STEP_ICONS: Record<string, React.ReactNode> = {
  보습: <Droplets className="w-5 h-5 text-blue-500" />,
  장벽: <Shield className="w-5 h-5 text-emerald-500" />,
  항염: <Heart className="w-5 h-5 text-pink-500" />,
  진정: <Heart className="w-5 h-5 text-pink-500" />,
  색소: <CircleDot className="w-5 h-5 text-orange-500" />,
  미백: <CircleDot className="w-5 h-5 text-orange-500" />,
  주름: <Sparkles className="w-5 h-5 text-purple-500" />,
  항산화: <Sparkles className="w-5 h-5 text-purple-500" />,
  선케어: <Sun className="w-5 h-5 text-yellow-500" />,
  자외선: <Sun className="w-5 h-5 text-yellow-500" />,
  클렌징: <Droplets className="w-5 h-5 text-cyan-500" />,
  각질: <Sparkles className="w-5 h-5 text-amber-500" />,
};

function getStepIcon(step: string) {
  for (const [key, icon] of Object.entries(STEP_ICONS)) {
    if (step.includes(key)) return icon;
  }
  return <CheckCircle className="w-5 h-5 text-gray-400" />;
}

export default function SkinTypeGuide({ typeCode, className }: SkinTypeGuideProps) {
  const code = typeCode?.toUpperCase() || '';
  const details = TYPE_DETAILS[code];

  if (!details) {
    return (
      <div className={`bg-white rounded-2xl border border-gray-100 p-6 ${className || ''}`}>
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-6 h-6 text-pink-500" />
          <h3 className="text-lg font-bold text-gray-800">피부 타입 가이드</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <p>피부 타입 진단을 완료하면</p>
          <p>맞춤 스킨케어 가이드를 볼 수 있어요!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-6 ${className || ''}`}>
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-6 h-6 text-pink-500" />
        <h3 className="text-lg font-bold text-gray-800">피부 타입 가이드</h3>
      </div>

      {/* 타입 뱃지 + 타이틀 */}
      <div className="mb-6">
        <span className="inline-block px-4 py-1.5 rounded-full border-2 border-pink-400 text-pink-600 font-bold text-lg mb-3">
          {code}
        </span>
        <h4 className="text-xl font-semibold text-gray-800 mb-2">{details.title}</h4>
        <p className="text-gray-600">{details.summary}</p>
      </div>

      {/* 이런 고민이 많아요 */}
      <div className="mb-6">
        <h5 className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          이런 고민이 많아요
        </h5>
        <ul className="space-y-2">
          {details.concerns.map((concern, i) => (
            <li key={i} className="flex items-start gap-2 text-gray-600">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
              {concern}
            </li>
          ))}
        </ul>
      </div>

      {/* 관리 우선순위 */}
      <div className="mb-6">
        <h5 className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          피부 관리 우선순위
        </h5>
        <div className="flex flex-wrap gap-2">
          {details.priorities.map((priority, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium"
              style={{
                backgroundColor: i === 0 ? '#fce7f3' : i === 1 ? '#e0f2fe' : '#f0fdf4',
                color: i === 0 ? '#be185d' : i === 1 ? '#0369a1' : '#166534',
              }}
            >
              <span className="font-bold">{i + 1}</span>
              {priority}
            </span>
          ))}
        </div>
      </div>

      {/* 추천 성분 */}
      <div className="mb-6">
        <h5 className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
          <Sparkles className="w-5 h-5 text-purple-500" />
          추천 성분
        </h5>
        <div className="space-y-4">
          {details.routine.map((item, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                {getStepIcon(item.step)}
                <span className="font-medium text-gray-800">{item.step}</span>
              </div>
              <div className="flex flex-wrap gap-2 ml-7">
                {item.ingredients.map((ing, j) => (
                  <span
                    key={j}
                    className="px-2.5 py-1 bg-white rounded-lg text-sm text-gray-600 border border-gray-200"
                  >
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 생활 습관 팁 */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4">
        <h5 className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
          <Sun className="w-5 h-5 text-yellow-500" />
          생활 습관 팁
        </h5>
        <ul className="space-y-1.5">
          {details.tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-gray-600 text-sm">
              <span className="text-pink-500">✓</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
