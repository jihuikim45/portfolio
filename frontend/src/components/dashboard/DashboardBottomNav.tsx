'use client';

import * as React from 'react';
import { Home, MessageSquare, UserCircle, Sparkles, Settings as SettingsIcon } from 'lucide-react';

interface DashboardBottomNavProps {
  onNavigate?: (page: string) => void;
  currentPage?: string;
}

export default function DashboardBottomNav({
  onNavigate,
  currentPage = 'dashboard',
}: DashboardBottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-pink-100 z-50">
      <div className="flex items-center justify-around px-2 py-3">
        <button
          onClick={() => onNavigate?.('dashboard')}
          className={`flex flex-col items-center space-y-1 ${currentPage === 'dashboard' ? 'text-pink-600' : 'text-gray-500 hover:text-pink-600'} transition-colors`}
        >
          <Home className="w-6 h-6" />
          <span className={`text-xs ${currentPage === 'dashboard' ? 'font-semibold' : ''}`}>홈</span>
        </button>
        <button
          onClick={() => onNavigate?.('features')}
          className={`flex flex-col items-center space-y-1 ${currentPage === 'features' ? 'text-pink-600' : 'text-gray-500 hover:text-pink-600'} transition-colors`}
        >
          <Sparkles className="w-6 h-6" />
          <span className={`text-xs ${currentPage === 'features' ? 'font-semibold' : ''}`}>추천받기</span>
        </button>
        <button
          onClick={() => onNavigate?.('chat')}
          className={`flex flex-col items-center space-y-1 ${currentPage === 'chat' ? 'text-pink-600' : 'text-gray-500 hover:text-pink-600'} transition-colors`}
        >
          <MessageSquare className="w-6 h-6" />
          <span className={`text-xs ${currentPage === 'chat' ? 'font-semibold' : ''}`}>AI 상담</span>
        </button>
        <button
          onClick={() => onNavigate?.('profile')}
          className={`flex flex-col items-center space-y-1 ${currentPage === 'profile' ? 'text-pink-600' : 'text-gray-500 hover:text-pink-600'} transition-colors`}
        >
          <UserCircle className="w-6 h-6" />
          <span className={`text-xs ${currentPage === 'profile' ? 'font-semibold' : ''}`}>프로필</span>
        </button>
        <button
          onClick={() => onNavigate?.('settings')}
          className={`flex flex-col items-center space-y-1 ${currentPage === 'settings' ? 'text-pink-600' : 'text-gray-500 hover:text-pink-600'} transition-colors`}
        >
          <SettingsIcon className="w-6 h-6" />
          <span className={`text-xs ${currentPage === 'settings' ? 'font-semibold' : ''}`}>설정</span>
        </button>
      </div>
    </nav>
  );
}
