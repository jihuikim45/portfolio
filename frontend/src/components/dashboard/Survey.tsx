import { useMemo, useState } from 'react';
import { API_BASE } from '../../lib/env';
import { Droplets, Shield, CircleDot, Sparkles } from 'lucide-react';

type Axis = 'OD' | 'SR' | 'PN' | 'WT';

interface Item {
  id: string;
  axis: Axis;
  text: string;
  reverse: boolean;
  rightLetter: 'O' | 'S' | 'P' | 'W';
}

const SURVEY_V1: Item[] = [
  {
    id: 'Q1',
    axis: 'OD',
    text: '세안 후 30분 이내에 얼굴이 당기거나 건조하게 느껴진다.',
    reverse: false, // 그렇다=건성(D)
    rightLetter: 'O',
  },
  {
    id: 'Q2',
    axis: 'OD',
    text: '오후가 되면 T존(이마·코)이 번들거린다.',
    reverse: true, // 그렇다=지성(O) → reverse
    rightLetter: 'O',
  },
  {
    id: 'Q3',
    axis: 'OD',
    text: '파운데이션이 자주 뜨고 각질이 부각된다.',
    reverse: false, // 그렇다=건성(D)
    rightLetter: 'O',
  },

  {
    id: 'Q4',
    axis: 'SR',
    text: '새 제품 사용 시 화끈거림·따가움·가려움이 자주 생긴다.',
    reverse: true, // 그렇다=민감성(S)
    rightLetter: 'S',
  },
  {
    id: 'Q5',
    axis: 'SR',
    text: '계절/온도 변화에 따라 홍조가 쉽게 나타난다.',
    reverse: true, // 그렇다=민감성(S)
    rightLetter: 'S',
  },
  {
    id: 'Q6',
    axis: 'SR',
    text: '알레르기/아토피·여드름 등 피부 트러블 병력이 있다.',
    reverse: true, // 그렇다=민감성(S)
    rightLetter: 'S',
  },

  {
    id: 'Q7',
    axis: 'PN',
    text: '기미·잡티가 쉽게 생기거나 오래 남는다.',
    reverse: true,
    rightLetter: 'P',
  },
  {
    id: 'Q8',
    axis: 'PN',
    text: '외출 시 자외선 차단을 자주 빼먹는 편이다.',
    reverse: true,
    rightLetter: 'P',
  },
  {
    id: 'Q9',
    axis: 'PN',
    text: '여드름·상처 후 갈색/붉은 자국(PIH/PIE)이 오래 남는다.',
    reverse: true,
    rightLetter: 'P',
  },

  {
    id: 'Q10',
    axis: 'WT',
    text: '눈가/팔자 등 표정 주름이 점점 또렷해진다.',
    reverse: true,
    rightLetter: 'W',
  },
  {
    id: 'Q11',
    axis: 'WT',
    text: '밤샘/스트레스 후 피부 탄력이 확 떨어진다.',
    reverse: true,
    rightLetter: 'W',
  },
  {
    id: 'Q12',
    axis: 'WT',
    text: '건조한 곳에서 미세주름(건성주름)이 잘 생긴다.',
    reverse: true,
    rightLetter: 'W',
  },
];

const TIEBREAKERS: Record<Axis, Item[]> = {
  OD: [
    {
      id: 'OD_TB1',
      axis: 'OD',
      text: '스킨/토너만 바르고 1시간 뒤 T존 번들거림을 닦아낸 적이 자주 있다.',
      reverse: false,
      rightLetter: 'O',
    },
    {
      id: 'OD_TB2',
      axis: 'OD',
      text: '파데·쿠션이 자주 뜨고 각질이 부각된다.',
      reverse: true,
      rightLetter: 'O',
    },
  ],
  SR: [
    {
      id: 'SR_TB1',
      axis: 'SR',
      text: '약한 각질제거제·레티노이드에도 따가움/홍조가 쉽게 생긴다.',
      reverse: false,
      rightLetter: 'S',
    },
    {
      id: 'SR_TB2',
      axis: 'SR',
      text: '향/알코올/에센셜오일에도 자극을 거의 느끼지 않는다.',
      reverse: true,
      rightLetter: 'S',
    },
  ],
  PN: [
    {
      id: 'PN_TB1',
      axis: 'PN',
      text: '여름 야외활동 후 피부 톤이 쉽게 어두워지고 오래 돌아오지 않는다.',
      reverse: false,
      rightLetter: 'P',
    },
    {
      id: 'PN_TB2',
      axis: 'PN',
      text: '트러블이 사라진 뒤 자국(PIH/PIE)이 수주 이상 남는다.',
      reverse: false,
      rightLetter: 'P',
    },
  ],
  WT: [
    {
      id: 'WT_TB1',
      axis: 'WT',
      text: '표정 습관(찌푸림 등) 자국/잔주름이 쉽게 사라지지 않는다.',
      reverse: false,
      rightLetter: 'W',
    },
    {
      id: 'WT_TB2',
      axis: 'WT',
      text: '수분크림만으로도 건조 주름이 금방 펴지는 편이다.',
      reverse: true,
      rightLetter: 'W',
    },
  ],
};

const AXES: Axis[] = ['OD', 'SR', 'PN', 'WT'];
const LEFT_LETTER: Record<Axis, 'D' | 'R' | 'N' | 'T'> = { OD: 'D', SR: 'R', PN: 'N', WT: 'T' };
const RIGHT_LETTER: Record<Axis, 'O' | 'S' | 'P' | 'W'> = { OD: 'O', SR: 'S', PN: 'P', WT: 'W' };

// 타입별 한줄 요약문
const TYPE_SUMMARIES: Record<string, string> = {
  DSPT: '예민하고 건조해서 기미·잡티가 쌓인 피부',
  DSNT: '건조한데 예민해서 쉽게 붉어지고 트러블이 나는 피부',
  DSPW: '건조하고 예민해서 염증이 반복되고, 그게 색소와 주름으로 남는 피부',
  DSNW: '건조하고 예민하지만 색소는 거의 없고, 주름이 빨리 오는 피부',
  OSPT: '유분이 많으며 예민해서 염증이 잦고, 그 뒤에 색소가 남는 피부',
  OSNT: '유분이 많으며 예민해서 트러블은 잘 나지만, 색소·주름은 적은 피부',
  OSPW: '유분이 많으며 예민하고, 색소와 주름이 같이 오는 피부',
  OSNW: '유분이 많은 예민 피부인데, 색소는 적고 주름이 잘 생기는 피부',
  ORPT: '유분이 많고 튼튼하지만, 잡티가 잘 생기는 피부',
  ORNT: '유분이 많고 튼튼하며 기미·주름도 적은 균형형 피부',
  ORPW: '튼튼한 지성이지만 잡티와 주름이 같이 오는 피부',
  ORNW: '튼튼한 지성이지만 기미는 적고 주름이 잘 생기는 피부',
  DRNT: '건조하지만 튼튼해서 트러블·색소·주름이 적은 피부',
  DRPT: '건조하고 튼튼하지만 기미·잡티가 잘 생기는 피부',
  DRNW: '건조하고 튼튼하지만 주름이 잘 생기는 피부',
  DRPW: '건조하고 튼튼하지만 기미와 주름이 같이 쌓이는 피부',
};

// 축별 설정 (아이콘, 색상, 라벨)
const AXIS_CONFIG: Record<
  Axis,
  {
    icon: typeof Droplets;
    color: string;
    bgColor: string;
    label: string;
    leftLabel: string;
    rightLabel: string;
  }
> = {
  OD: {
    icon: Droplets,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    label: '수분',
    leftLabel: '건성', // D = 건성
    rightLabel: '지성', // O = 지성
  },
  SR: {
    icon: Shield,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500',
    label: '민감도',
    leftLabel: '저항성',
    rightLabel: '민감성',
  },
  PN: {
    icon: CircleDot,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500',
    label: '색소침착',
    leftLabel: '비색소',
    rightLabel: '색소침착',
  },
  WT: {
    icon: Sparkles,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500',
    label: '탄력성',
    leftLabel: '탱탱함',
    rightLabel: '주름',
  },
};

function applyReverse(x: number, reverse: boolean) {
  return reverse ? 6 - x : x;
}
function avgAndStats(values: (number | null)[], items: Item[]) {
  let unknown = 0;
  const scored = values.map((v, i) => {
    if (v == null) {
      unknown += 1;
      v = 3;
    }
    return applyReverse(v, items[i].reverse);
  });
  const avg = scored.reduce((a, b) => a + b, 0) / scored.length;
  const mean = avg;
  const variance = scored.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (scored.length || 1);
  const stdev = Math.sqrt(variance);
  return { avg, unknown, stdev, scored };
}
function decideLetter(avg: number, axis: Axis): string | null {
  if (avg <= 2.6) return LEFT_LETTER[axis];
  if (avg >= 3.4) return RIGHT_LETTER[axis];
  return null;
}
function confidence(stdev: number, unknownCnt: number, usedTb: boolean) {
  const base = 100;
  const penalty = stdev * 10 + unknownCnt * 5 + (usedTb ? 5 : 0);
  return Math.max(0, Math.min(100, Math.round(base - penalty)));
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}

type Responses = Record<string, number | null>;

function evaluate(resps: Responses, tbResps: Responses) {
  const result: {
    axes: Record<
      Axis,
      { avg: number; letter: string | null; conf: number; usedTb: boolean; tbId?: string }
    >;
    neededTB: { axis: Axis; item: Item }[];
    typeCode: string | null;
    confOverall: number | null;
  } = { axes: {} as any, neededTB: [], typeCode: null, confOverall: null };

  const letters: (string | null)[] = [];
  const confs: number[] = [];

  for (const axis of AXES) {
    const baseItems = SURVEY_V1.filter(it => it.axis === axis);
    const baseVals = baseItems.map(it => resps[it.id] ?? null);
    let { avg, unknown, stdev } = avgAndStats(baseVals, baseItems);
    let letter = decideLetter(avg, axis);
    let usedTb = false;
    let tbId: string | undefined;

    if (!letter) {
      const tb = TIEBREAKERS[axis][0];
      tbId = tb.id;
      if (tbResps[tb.id] == null) {
        const conf = confidence(stdev, unknown, false);
        result.axes[axis] = { avg: round2(avg), letter: null, conf, usedTb: false };
        result.neededTB.push({ axis, item: tb });
        letters.push(null);
        continue;
      }
      const tbVal = tbResps[tb.id] ?? 3;
      const tbScored = applyReverse(tbVal, tb.reverse);
      avg = (avg * baseItems.length + tbScored) / (baseItems.length + 1);
      letter = decideLetter(avg, axis) ?? (avg >= 3.0 ? RIGHT_LETTER[axis] : LEFT_LETTER[axis]);
      stdev += 0.2;
      usedTb = true;
    }

    const conf = confidence(stdev, unknown, usedTb);
    result.axes[axis] = { avg: round2(avg), letter, conf, usedTb, tbId };
    letters.push(letter);
    confs.push(conf);
  }

  result.typeCode = letters.every(l => !!l) ? (letters as string[]).join('') : null;
  result.confOverall = confs.length
    ? round1(confs.reduce((a, b) => a + b, 0) / confs.length)
    : null;
  return result;
}

export default function Survey({ onDone }: { onDone: () => void }) {
  const [responses, setResponses] = useState<Responses>(() =>
    Object.fromEntries(SURVEY_V1.map(i => [i.id, null]))
  );
  const [tbResponses, setTbResponses] = useState<Responses>({});
  const [neededTB, setNeededTB] = useState<{ axis: Axis; item: Item }[]>([]);
  const [final, setFinal] = useState<null | ReturnType<typeof evaluate>>(null);
  const [saving, setSaving] = useState(false);

  // 동그라미 크기 (양쪽이 크고 가운데가 작음)
  const circleSizes = [40, 36, 28, 36, 40];

  // 색상 그라데이션 (초록 → 회색 → 보라)
  const getCircleColor = (index: number, isSelected: boolean) => {
    if (!isSelected) {
      // 선택 안됨: 테두리만
      const borderColors = [
        'border-pink-500',
        'border-pink-400',
        'border-gray-300',
        'border-purple-400',
        'border-purple-500',
      ];
      return borderColors[index];
    }
    // 선택됨: 채워진 색상
    const bgColors = [
      'bg-pink-500 border-pink-500',
      'bg-pink-400 border-pink-400',
      'bg-gray-400 border-gray-400',
      'bg-purple-400 border-purple-400',
      'bg-purple-500 border-purple-500',
    ];
    return bgColors[index];
  };

  const Radio = (v: number | null, onChange: (x: number | null) => void) => (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      {/* 그렇다 라벨 */}
      <span className="text-sm font-medium text-pink-600 whitespace-nowrap">그렇다</span>

      {/* 동그라미들 */}
      <div className="flex items-center gap-2 sm:gap-3">
        {[1, 2, 3, 4, 5].map((n, index) => {
          const isSelected = v === n;
          const size = circleSizes[index];
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`rounded-full border-2 transition-all duration-200 hover:scale-110 ${getCircleColor(
                index,
                isSelected
              )} ${isSelected ? 'shadow-md' : 'hover:shadow-sm'}`}
              style={{ width: size, height: size }}
              aria-label={`${n}점`}
            />
          );
        })}
      </div>

      {/* 아니다 라벨 */}
      <span className="text-sm font-medium text-purple-600 whitespace-nowrap">아니다</span>
    </div>
  );

  const scoreOnce = () => {
    const r1 = evaluate(responses, tbResponses);
    setNeededTB(r1.neededTB);
    setFinal(r1);
  };

  const scoreFinal = () => {
    const r2 = evaluate(responses, tbResponses);
    setFinal(r2);
    setNeededTB([]);
  };

  const resetAll = () => {
    setResponses(Object.fromEntries(SURVEY_V1.map(i => [i.id, null])));
    setTbResponses({});
    setNeededTB([]);
    setFinal(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveAndGo = async () => {
    if (!final?.typeCode) return;

    const axesPayload = Object.fromEntries(
      AXES.map(ax => {
        const a = final.axes[ax];
        return [ax, { avg: a.avg, letter: a.letter, confidence: a.conf }];
      })
    );

    const userIdStr = localStorage.getItem('user_id') ?? '1';
    const user_id = Number.parseInt(userIdStr, 10) || 1;
    const nickname = localStorage.getItem('nickname') ?? null;
    const birth_date_str = localStorage.getItem('birth_date') ?? '';
    const birth_date = birth_date_str ? Number(birth_date_str) : undefined;
    const gender = localStorage.getItem('gender') ?? 'na';

    localStorage.setItem('skin_type_code', final.typeCode);
    localStorage.setItem('skin_axes_json', JSON.stringify(axesPayload));

    if (!API_BASE) {
      onDone();
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/profile/skin-diagnosis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id,
          skin_type_code: final.typeCode,
          skin_axes_json: JSON.stringify(axesPayload),
          nickname,
          birth_date,
          gender,
        }),
      });

      if (!res.ok) {
        alert('서버 저장은 실패했어요. 화면만 대시보드로 돌아갈게요.');
        onDone();
        return;
      }

      onDone();
    } catch (err) {
      alert('서버 저장은 실패했어요. 화면만 대시보드로 돌아갈게요.');
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: 'linear-gradient(135deg,#fce7f3 0%,#f3e8ff 50%,#ddd6fe 100%)' }}
    >
      {/* 이 컨테이너 폭에 맞춰서 버튼도 정렬 */}
      <div className="max-w-3xl mx-auto px-4 pt-8">
        {/* 제목 + 버튼 한 줄 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">바우만 피부타입 설문</h1>
          <button
            onClick={onDone}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 border border-gray-300 bg-white/80 hover:bg-white shadow-sm transition-all"
          >
            돌아가기
          </button>
        </div>

        {/* 문항들 */}
        {AXES.map(axis => {
          const titleMap: Record<Axis, string> = {
            OD: '지성↔건성 (OD)',
            SR: '민감↔저항 (SR)',
            PN: '색소↔비색소 (PN)',
            WT: '주름↔탄탄 (WT)',
          };
          const items = SURVEY_V1.filter(i => i.axis === axis);
          return (
            <div
              key={axis}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5"
            >
              <h2 className="font-semibold text-gray-800 mb-3">{titleMap[axis]}</h2>
              <ul className="space-y-4">
                {items.map(it => (
                  <li key={it.id} className="flex flex-col gap-2">
                    <div className="text-gray-800">{it.text}</div>
                    {Radio(responses[it.id] ?? null, x =>
                      setResponses(prev => ({ ...prev, [it.id]: x }))
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {/* 1차 채점 */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            onClick={scoreOnce}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-purple-600 text-white font-semibold hover:opacity-95"
          >
            결과 보기
          </button>
        </div>

        {/* 타이브레이커 */}
        {neededTB.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-5 mb-6">
            <h3 className="font-semibold text-amber-700 mb-3">추가 확인 문항</h3>
            <ul className="space-y-4">
              {neededTB.map(({ axis, item }) => (
                <li key={item.id} className="flex flex-col gap-2">
                  <div className="text-gray-800">
                    [{axis}] {item.text}
                  </div>
                  {Radio(tbResponses[item.id] ?? null, x =>
                    setTbResponses(prev => ({ ...prev, [item.id]: x }))
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-center">
              <button
                onClick={scoreFinal}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-pink-500 text-white font-semibold hover:opacity-85"
              >
                최종 결과 보기
              </button>
            </div>
          </div>
        )}

        {/* 최종 결과 - 그래프 형식 */}
        {final?.typeCode && neededTB.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-violet-100 p-6 mb-6">
            {/* 타입 코드 뱃지 */}
            <div className="flex justify-center mb-4">
              <span className="inline-block px-6 py-2 rounded-full border-2 border-pink-400 text-pink-600 font-bold text-xl">
                {final.typeCode}
              </span>
            </div>

            {/* 한줄 요약문 */}
            <p className="text-center text-gray-700 mb-8 text-lg">
              {TYPE_SUMMARIES[final.typeCode] || '나만의 피부 타입'}
            </p>

            {/* 그래프 영역 */}
            <div className="space-y-6">
              {AXES.map(ax => {
                const a = final.axes[ax];
                const config = AXIS_CONFIG[ax];
                const Icon = config.icon;
                const isLeft = a.letter === LEFT_LETTER[ax];

                // 결과 방향에 따라 강도 계산
                // LEFT(D,R,N,T): avg가 낮을수록 강함 → (5 - avg) / 4 * 100
                // RIGHT(O,S,P,W): avg가 높을수록 강함 → (avg - 1) / 4 * 100
                const percent = isLeft ? ((5 - a.avg) / 4) * 100 : ((a.avg - 1) / 4) * 100;

                // 최소 15% 보장 (너무 작으면 안 보임)
                const displayPercent = Math.max(15, percent);

                return (
                  <div key={ax} className="space-y-2">
                    {/* 라벨 + 결과 텍스트 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${config.color}`} />
                        <span className="font-medium text-gray-800">{config.label}</span>
                      </div>
                      <span className={`font-semibold ${config.color}`}>
                        {isLeft ? config.leftLabel : config.rightLabel}
                      </span>
                    </div>

                    {/* 바 그래프 */}
                    <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${config.bgColor}`}
                        style={{ width: `${displayPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 확신도 표시 */}
            <div className="mt-6 pt-4 border-t border-gray-100 text-center">
              <span className="text-sm text-gray-500">
                분석 확신도: <b className="text-purple-600">{final.confOverall}%</b>
              </span>
            </div>
          </div>
        )}

        {/* 하단 버튼 - 결과가 있을 때만 표시 */}
        {final?.typeCode && (
          <div className="flex items-center justify-center gap-3 mb-10">
            <button
              onClick={handleSaveAndGo}
              disabled={saving || !final?.typeCode}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-pink-500 text-white font-semibold hover:opacity-85 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? '저장 중...' : '저장하고 대시보드로'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
