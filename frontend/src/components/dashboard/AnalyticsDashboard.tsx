// frontend/src/components/dashboard/AnalyticsDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, FunnelChart, Funnel, LabelList
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Search, Heart, ExternalLink,
  Activity, Target, Calendar, RefreshCw
} from 'lucide-react';
import DashboardHeader from './DashboardHeader';
import DashboardBottomNav from './DashboardBottomNav';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

// 색상 팔레트
const COLORS = {
  primary: '#ec4899',    // pink-500
  secondary: '#8b5cf6',  // violet-500
  success: '#10b981',    // emerald-500
  warning: '#f59e0b',    // amber-500
  danger: '#ef4444',     // red-500
  info: '#3b82f6',       // blue-500
  gray: '#6b7280',       // gray-500
};

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
const FUNNEL_COLORS = ['#ec4899', '#f472b6', '#f9a8d4', '#fbcfe8', '#fce7f3'];

interface KpiSummary {
  dau: { value: number; prev_value: number; change_pct: number };
  search_ctr: { value: number; prev_value: number; change_pct: number };
  rec_ctr: { value: number; total_shown: number; total_clicked: number };
  outbound_ctr: { value: number; total_views: number; total_clicks: number };
}

interface FunnelData {
  funnel: Array<{ step: string; count: number; rate: number }>;
}

interface RetentionData {
  retention: Array<{ day: string; users: number; rate: number }>;
  total_users: number;
}

interface TrendData {
  trend: Array<{
    date: string;
    dau: number;
    page_views: number;
    favorites: number;
    outbound_clicks: number;
  }>;
}

interface LtvData {
  distribution: Array<{
    segment: string;
    user_count: number;
    avg_score: number;
    percentage: number;
  }>;
  total_users: number;
}

interface TopItems {
  top_searches: Array<{ query: string; count: number }>;
  top_ingredients: Array<{ name: string; count: number }>;
  top_favorited: Array<{ product_id: string; count: number }>;
}

interface EventDistribution {
  distribution: Array<{
    event_type: string;
    count: number;
    percentage: number;
  }>;
  total_events: number;
}

// KPI 카드 컴포넌트
function KpiCard({ 
  title, 
  value, 
  unit = '', 
  change, 
  icon: Icon,
  color = 'pink'
}: {
  title: string;
  value: number | string;
  unit?: string;
  change?: number;
  icon: React.ElementType;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    pink: 'bg-pink-50 text-pink-600',
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{title}</span>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-gray-900">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        <span className="text-sm text-gray-500 mb-1">{unit}</span>
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-sm ${
          change >= 0 ? 'text-emerald-600' : 'text-red-500'
        }`}>
          {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{change >= 0 ? '+' : ''}{change}%</span>
          <span className="text-gray-400 text-xs">vs 이전</span>
        </div>
      )}
    </motion.div>
  );
}

// 섹션 헤더 컴포넌트
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

export default function AnalyticsDashboard({ 
  userName = 'Admin',
  onNavigate 
}: { 
  userName?: string;
  onNavigate?: (page: string) => void;
}) {
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 데이터 상태
  const [kpi, setKpi] = useState<KpiSummary | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [retention, setRetention] = useState<RetentionData | null>(null);
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [ltv, setLtv] = useState<LtvData | null>(null);
  const [topItems, setTopItems] = useState<TopItems | null>(null);
  const [eventDist, setEventDist] = useState<EventDistribution | null>(null);

  // 데이터 로드
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [kpiRes, funnelRes, retentionRes, trendRes, ltvRes, topRes, eventRes] = await Promise.all([
        fetch(`${API_BASE}/api/analytics/kpi-summary?days=${days}`),
        fetch(`${API_BASE}/api/analytics/funnel?days=${days}`),
        fetch(`${API_BASE}/api/analytics/retention?cohort_days=${days}`),
        fetch(`${API_BASE}/api/analytics/daily-trend?days=${Math.min(days, 14)}`),
        fetch(`${API_BASE}/api/analytics/ltv-distribution?days=${days}`),
        fetch(`${API_BASE}/api/analytics/top-items?days=${days}`),
        fetch(`${API_BASE}/api/analytics/event-distribution?days=${days}`),
      ]);

      if (kpiRes.ok) setKpi(await kpiRes.json());
      if (funnelRes.ok) setFunnel(await funnelRes.json());
      if (retentionRes.ok) setRetention(await retentionRes.json());
      if (trendRes.ok) setTrend(await trendRes.json());
      if (ltvRes.ok) setLtv(await ltvRes.json());
      if (topRes.ok) setTopItems(await topRes.json());
      if (eventRes.ok) setEventDist(await eventRes.json());
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [days]);

  // 퍼널 데이터 변환
  const funnelChartData = funnel?.funnel.map((item, idx) => ({
    ...item,
    fill: FUNNEL_COLORS[idx] || FUNNEL_COLORS[0],
  })) || [];

  // 리텐션 데이터 변환
  const retentionChartData = retention?.retention || [];

  // 트렌드 데이터 변환
  const trendChartData = trend?.trend.map(item => ({
    ...item,
    date: item.date.slice(5), // MM-DD 형식
  })) || [];

  return (
    <div
      className="min-h-screen w-full flex flex-col pb-16 md:pb-0"
      style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #f3e8ff 50%, #ddd6fe 100%)' }}
    >
      <DashboardHeader
        userName={userName}
        onNavigate={onNavigate}
        currentPage="analytics"
      />

      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* 헤더 영역 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-sm text-gray-500">비즈니스 핵심 지표를 한눈에 확인하세요</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* 기간 선택 */}
              <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border">
                <Calendar className="w-4 h-4 text-gray-400" />
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="text-sm border-none focus:ring-0 bg-transparent"
                >
                  <option value={7}>최근 7일</option>
                  <option value={14}>최근 14일</option>
                  <option value={30}>최근 30일</option>
                </select>
              </div>
              
              {/* 새로고침 버튼 */}
              <button
                onClick={fetchAllData}
                disabled={loading}
                className="p-2 bg-white rounded-lg shadow-sm border hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* KPI 카드 그리드 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
              title="DAU"
              value={kpi?.dau.value || 0}
              unit="명"
              change={kpi?.dau.change_pct}
              icon={Users}
              color="pink"
            />
            <KpiCard
              title="Search CTR"
              value={kpi?.search_ctr.value || 0}
              unit="%"
              change={kpi?.search_ctr.change_pct}
              icon={Search}
              color="violet"
            />
            <KpiCard
              title="Rec CTR"
              value={kpi?.rec_ctr.value || 0}
              unit="%"
              icon={Target}
              color="emerald"
            />
            <KpiCard
              title="Outbound CTR"
              value={kpi?.outbound_ctr.value || 0}
              unit="%"
              icon={ExternalLink}
              color="blue"
            />
          </div>

          {/* 메인 차트 그리드 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* 전환 퍼널 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl p-5 shadow-sm border"
            >
              <SectionHeader 
                title="Conversion Funnel" 
                subtitle="단계별 전환율"
              />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={funnelChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="step" />
                    <Tooltip 
                      formatter={(value: number, name: string) => [`${value}%`, '전환율']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                      {funnelChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* 리텐션 커브 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl p-5 shadow-sm border"
            >
              <SectionHeader 
                title="Retention Curve" 
                subtitle={`코호트 ${retention?.total_users || 0}명`}
              />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={retentionChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip 
                      formatter={(value: number) => [`${value}%`, '리텐션율']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="rate"
                      stroke={COLORS.primary}
                      fill={COLORS.primary}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* 일별 트렌드 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl p-5 shadow-sm border"
            >
              <SectionHeader 
                title="Daily Trend" 
                subtitle="일별 활동 추이"
              />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="dau" name="DAU" stroke={COLORS.primary} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="favorites" name="즐겨찾기" stroke={COLORS.danger} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="outbound_clicks" name="외부클릭" stroke={COLORS.info} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* LTV 분포 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl p-5 shadow-sm border"
            >
              <SectionHeader 
                title="LTV Score Distribution" 
                subtitle={`총 ${ltv?.total_users || 0}명`}
              />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ltv?.distribution || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="user_count"
                      nameKey="segment"
                      label={({ segment, percentage }) => `${segment.split(' ')[0]} ${percentage}%`}
                      labelLine={false}
                    >
                      {(ltv?.distribution || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string, props: any) => [
                        `${value}명 (평균 ${props.payload.avg_score}점)`,
                        props.payload.segment
                      ]}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* 하단 테이블 그리드 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top 검색어 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-xl p-5 shadow-sm border"
            >
              <SectionHeader title="Top Searches" subtitle="인기 검색어" />
              <div className="space-y-2">
                {topItems?.top_searches.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        idx === 0 ? 'bg-pink-100 text-pink-600' :
                        idx === 1 ? 'bg-violet-100 text-violet-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-sm text-gray-700">{item.query}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-500">{item.count}회</span>
                  </div>
                ))}
                {(!topItems?.top_searches || topItems.top_searches.length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-4">데이터 없음</p>
                )}
              </div>
            </motion.div>

            {/* Top 성분 클릭 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-xl p-5 shadow-sm border"
            >
              <SectionHeader title="Top Ingredients" subtitle="인기 성분 클릭" />
              <div className="space-y-2">
                {topItems?.top_ingredients.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        idx === 0 ? 'bg-emerald-100 text-emerald-600' :
                        idx === 1 ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-sm text-gray-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-500">{item.count}회</span>
                  </div>
                ))}
                {(!topItems?.top_ingredients || topItems.top_ingredients.length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-4">데이터 없음</p>
                )}
              </div>
            </motion.div>

            {/* 이벤트 분포 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white rounded-xl p-5 shadow-sm border"
            >
              <SectionHeader 
                title="Event Distribution" 
                subtitle={`총 ${eventDist?.total_events?.toLocaleString() || 0}건`}
              />
              <div className="space-y-2">
                {eventDist?.distribution.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{item.event_type}</span>
                      <span className="text-gray-500">{item.percentage}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: PIE_COLORS[idx % PIE_COLORS.length]
                        }}
                      />
                    </div>
                  </div>
                ))}
                {(!eventDist?.distribution || eventDist.distribution.length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-4">데이터 없음</p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <DashboardBottomNav onNavigate={onNavigate} currentPage="analytics" />
    </div>
  );
}
