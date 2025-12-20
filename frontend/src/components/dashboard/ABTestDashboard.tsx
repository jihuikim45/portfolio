// frontend/src/components/dashboard/ABTestDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  FlaskConical,
  TrendingUp,
  TrendingDown,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import DashboardHeader from './DashboardHeader';
import DashboardBottomNav from './DashboardBottomNav';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

// 색상 상수
const COLORS = {
  control: '#6b7280', // gray-500
  treatment: '#ec4899', // pink-500
  success: '#10b981', // emerald-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
};

// 타입 정의
interface Experiment {
  experiment_id: string;
  experiment_name: string;
  description: string;
  hypothesis: string;
  status: string;
  start_date: string;
  end_date: string;
  traffic_allocation: number;
}

interface GroupData {
  total_sessions: number;
  unique_users: number;
}

interface MetricData {
  total_sessions: number;
  sessions_with_search: number;
  search_usage_rate: number;
}

interface StatisticalSignificance {
  z_score: number;
  p_value: number;
  is_significant: boolean;
  confidence_level: string;
}

interface ExperimentResults {
  experiment: {
    id: string;
    name: string;
    hypothesis: string;
    primary_metric: string;
    start_date: string;
    end_date: string;
    traffic_allocation: number;
  };
  groups: {
    control?: GroupData;
    treatment?: GroupData;
  };
  primary_metric: {
    name: string;
    control: MetricData;
    treatment: MetricData;
    lift_pct: number;
    statistical_significance: StatisticalSignificance;
  };
  secondary_metrics: {
    search_ctr: Record<
      string,
      { total_searches: number; searches_with_click: number; search_ctr: number }
    >;
    registration_rate: Record<
      string,
      { searches_with_click: number; registrations: number; registration_rate: number }
    >;
  };
  daily_trend: Array<{
    date: string;
    variant: string;
    sessions: number;
    sessions_searched: number;
    search_rate: number;
  }>;
}

// 메트릭 카드 컴포넌트
function MetricComparisonCard({
  title,
  controlValue,
  treatmentValue,
  unit = '%',
  isHigherBetter = true,
}: {
  title: string;
  controlValue: number;
  treatmentValue: number;
  unit?: string;
  isHigherBetter?: boolean;
}) {
  const diff = treatmentValue - controlValue;
  const diffPct = controlValue > 0 ? (diff / controlValue) * 100 : 0;
  const isPositive = isHigherBetter ? diff > 0 : diff < 0;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border">
      <h4 className="text-sm text-gray-500 mb-3">{title}</h4>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-1">Control</div>
          <div className="text-lg font-semibold text-gray-600">
            {controlValue.toFixed(1)}
            {unit}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-1">Treatment</div>
          <div className="text-lg font-semibold text-pink-600">
            {treatmentValue.toFixed(1)}
            {unit}
          </div>
        </div>
      </div>
      <div
        className={`mt-3 flex items-center justify-center gap-1 text-sm ${
          isPositive ? 'text-emerald-600' : 'text-red-500'
        }`}
      >
        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span>
          {diff >= 0 ? '+' : ''}
          {diff.toFixed(1)}
          {unit}
        </span>
        <span className="text-gray-400">
          ({diffPct >= 0 ? '+' : ''}
          {diffPct.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}

// 통계적 유의성 배지
function SignificanceBadge({ significance }: { significance: StatisticalSignificance }) {
  const { is_significant, p_value, confidence_level } = significance;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${
        is_significant
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-amber-50 text-amber-700 border border-amber-200'
      }`}
    >
      {is_significant ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      <span className="text-sm font-medium">
        {is_significant ? '통계적으로 유의함' : '유의하지 않음'}
      </span>
      <span className="text-xs opacity-75">
        (p={p_value.toFixed(4)}, {confidence_level})
      </span>
    </div>
  );
}

// 일별 추이 차트용 데이터 변환
function transformDailyData(dailyTrend: ExperimentResults['daily_trend']) {
  const dateMap = new Map<string, { date: string; control: number; treatment: number }>();

  dailyTrend.forEach(item => {
    const existing = dateMap.get(item.date) || { date: item.date, control: 0, treatment: 0 };
    if (item.variant === 'control') {
      existing.control = item.search_rate;
    } else {
      existing.treatment = item.search_rate;
    }
    dateMap.set(item.date, existing);
  });

  return Array.from(dateMap.values()).map(item => ({
    ...item,
    date: item.date.slice(5), // MM-DD 형식
  }));
}

export default function ABTestDashboard({
  userName = 'Admin',
  onNavigate,
}: {
  userName?: string;
  onNavigate?: (page: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExpId, setSelectedExpId] = useState<string | null>(null);
  const [results, setResults] = useState<ExperimentResults | null>(null);

  // 실험 목록 로드
  useEffect(() => {
    const fetchExperiments = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/analytics/experiments`);
        if (res.ok) {
          const data = await res.json();
          setExperiments(data.experiments || []);
          // 첫 번째 실험 자동 선택
          if (data.experiments?.length > 0) {
            setSelectedExpId(data.experiments[0].experiment_id);
          }
        }
      } catch (err) {
        console.error('Experiments fetch error:', err);
        setError('실험 목록을 불러오는데 실패했습니다.');
      }
    };
    fetchExperiments();
  }, []);

  // 선택된 실험 결과 로드
  useEffect(() => {
    if (!selectedExpId) {
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/analytics/experiments/${selectedExpId}/results`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        } else {
          setError('실험 결과를 불러오는데 실패했습니다.');
        }
      } catch (err) {
        console.error('Results fetch error:', err);
        setError('실험 결과를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [selectedExpId]);

  // 일별 차트 데이터
  const dailyChartData = results ? transformDailyData(results.daily_trend) : [];

  // 그룹 비교 바 차트 데이터
  const comparisonData = results
    ? [
        {
          name: '검색 사용률',
          control: results.primary_metric.control.search_usage_rate,
          treatment: results.primary_metric.treatment.search_usage_rate,
        },
        {
          name: 'Search CTR',
          control: results.secondary_metrics.search_ctr.control?.search_ctr || 0,
          treatment: results.secondary_metrics.search_ctr.treatment?.search_ctr || 0,
        },
        {
          name: '성분 등록률',
          control: results.secondary_metrics.registration_rate.control?.registration_rate || 0,
          treatment: results.secondary_metrics.registration_rate.treatment?.registration_rate || 0,
        },
      ]
    : [];

  return (
    <div
      className="min-h-screen w-full flex flex-col pb-16 md:pb-0"
      style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #f3e8ff 50%, #ddd6fe 100%)' }}
    >
      <DashboardHeader userName={userName} onNavigate={onNavigate} currentPage="abtest" />

      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* 헤더 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-100 rounded-lg">
                <FlaskConical className="w-6 h-6 text-pink-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">A/B Test Dashboard</h1>
                <p className="text-sm text-gray-500">실험 결과를 분석하고 의사결정을 내리세요</p>
              </div>
            </div>

            {/* 실험 선택 드롭다운 */}
            <div className="relative">
              <select
                value={selectedExpId || ''}
                onChange={e => setSelectedExpId(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 shadow-sm"
              >
                {experiments.map(exp => (
                  <option key={exp.experiment_id} value={exp.experiment_id}>
                    {exp.experiment_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
            </div>
          ) : results ? (
            <>
              {/* 실험 정보 카드 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-5 shadow-sm border mb-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-[300px]">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">
                      {results.experiment.name}
                    </h2>
                    <p className="text-sm text-gray-600 mb-3">
                      <span className="font-medium">가설:</span> {results.experiment.hypothesis}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {results.experiment.start_date} ~ {results.experiment.end_date}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Traffic: {results.experiment.traffic_allocation}% treatment
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <SignificanceBadge
                      significance={results.primary_metric.statistical_significance}
                    />
                    <div
                      className={`text-2xl font-bold ${
                        results.primary_metric.lift_pct >= 0 ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {results.primary_metric.lift_pct >= 0 ? '+' : ''}
                      {results.primary_metric.lift_pct.toFixed(1)}% Lift
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* 그룹 요약 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-xl p-4 shadow-sm border"
                >
                  <div className="text-xs text-gray-500 mb-1">Control 세션</div>
                  <div className="text-2xl font-bold text-gray-600">
                    {results.groups.control?.total_sessions.toLocaleString() || 0}
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-white rounded-xl p-4 shadow-sm border"
                >
                  <div className="text-xs text-gray-500 mb-1">Treatment 세션</div>
                  <div className="text-2xl font-bold text-pink-600">
                    {results.groups.treatment?.total_sessions.toLocaleString() || 0}
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-xl p-4 shadow-sm border"
                >
                  <div className="text-xs text-gray-500 mb-1">Control 유저</div>
                  <div className="text-2xl font-bold text-gray-600">
                    {results.groups.control?.unique_users.toLocaleString() || 0}
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="bg-white rounded-xl p-4 shadow-sm border"
                >
                  <div className="text-xs text-gray-500 mb-1">Treatment 유저</div>
                  <div className="text-2xl font-bold text-pink-600">
                    {results.groups.treatment?.unique_users.toLocaleString() || 0}
                  </div>
                </motion.div>
              </div>

              {/* 메트릭 비교 카드들 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <MetricComparisonCard
                    title="🎯 1차 지표: 검색 사용률"
                    controlValue={results.primary_metric.control.search_usage_rate}
                    treatmentValue={results.primary_metric.treatment.search_usage_rate}
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <MetricComparisonCard
                    title="🎯 2차 지표: Search CTR"
                    controlValue={results.secondary_metrics.search_ctr.control?.search_ctr || 0}
                    treatmentValue={results.secondary_metrics.search_ctr.treatment?.search_ctr || 0}
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <MetricComparisonCard
                    title="🎯 2차 지표: 성분 등록 전환율"
                    controlValue={
                      results.secondary_metrics.registration_rate.control?.registration_rate || 0
                    }
                    treatmentValue={
                      results.secondary_metrics.registration_rate.treatment?.registration_rate || 0
                    }
                  />
                </motion.div>
              </div>

              {/* 차트 영역 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 그룹별 메트릭 비교 바 차트 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="bg-white rounded-xl p-5 shadow-sm border"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">메트릭 비교</h3>
                  <p className="text-sm text-gray-500 mb-4">Control vs Treatment 그룹 비교</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" domain={[0, 'auto']} tickFormatter={v => `${v}%`} />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip
                          formatter={(value: number) => [`${value.toFixed(1)}%`]}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                        />
                        <Legend />
                        <Bar
                          dataKey="control"
                          name="Control"
                          fill={COLORS.control}
                          radius={[0, 4, 4, 0]}
                        />
                        <Bar
                          dataKey="treatment"
                          name="Treatment"
                          fill={COLORS.treatment}
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* 일별 검색 사용률 추이 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white rounded-xl p-5 shadow-sm border"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    일별 검색 사용률 추이
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">실험 기간 동안의 일별 변화</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 'auto']} tickFormatter={v => `${v}%`} />
                        <Tooltip
                          formatter={(value: number) => [`${value.toFixed(1)}%`]}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="control"
                          name="Control"
                          stroke={COLORS.control}
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="treatment"
                          name="Treatment"
                          stroke={COLORS.treatment}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>

              {/* 결론 및 권장 사항 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="mt-6 bg-gradient-to-r from-pink-50 to-violet-50 rounded-xl p-5 border border-pink-100"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 분석 요약</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>
                    <strong>1차 지표 결과:</strong> Treatment 그룹의 검색 사용률이 Control 대비{' '}
                    <span
                      className={
                        results.primary_metric.lift_pct >= 0
                          ? 'text-emerald-600 font-semibold'
                          : 'text-red-500 font-semibold'
                      }
                    >
                      {results.primary_metric.lift_pct >= 0 ? '+' : ''}
                      {results.primary_metric.lift_pct.toFixed(1)}%
                    </span>{' '}
                    변화.
                  </p>
                  <p>
                    <strong>통계적 유의성:</strong>{' '}
                    {results.primary_metric.statistical_significance.is_significant ? (
                      <span className="text-emerald-600">
                        p-value {results.primary_metric.statistical_significance.p_value.toFixed(4)}
                        로 95% 신뢰수준에서 유의함
                      </span>
                    ) : (
                      <span className="text-amber-600">
                        p-value {results.primary_metric.statistical_significance.p_value.toFixed(4)}
                        로 아직 유의하지 않음 (더 많은 샘플 필요)
                      </span>
                    )}
                  </p>
                  <p>
                    <strong>권장 사항:</strong>{' '}
                    {results.primary_metric.statistical_significance.is_significant &&
                    results.primary_metric.lift_pct > 0
                      ? '실험 결과가 긍정적이며 통계적으로 유의합니다. Treatment를 전체 사용자에게 배포하는 것을 권장합니다.'
                      : results.primary_metric.lift_pct > 0
                        ? '긍정적인 트렌드가 보이지만 통계적 유의성을 확보하기 위해 실험 기간을 연장하거나 샘플 크기를 늘리는 것을 권장합니다.'
                        : '현재 결과로는 Treatment가 Control보다 나은 성과를 보이지 않습니다. 가설을 재검토하거나 다른 접근법을 고려해주세요.'}
                  </p>
                </div>
              </motion.div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>실험 데이터가 없습니다.</p>
              <p className="text-sm mt-2">
                SQL 스크립트를 실행하여 시뮬레이션 데이터를 생성해주세요.
              </p>
            </div>
          )}
        </div>
      </main>

      <DashboardBottomNav onNavigate={onNavigate} currentPage="abtest" />
    </div>
  );
}
