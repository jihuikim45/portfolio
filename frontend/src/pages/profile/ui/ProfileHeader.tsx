import {
  Home,
  MessageSquare,
  UserCircle,
  Settings as SettingsIcon,
  Bell,
  Menu,
  X,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

export interface ProfileHeaderProps {
  userName: string;
  onNavigate?: (page: string) => void;
}

export const ProfileHeader = ({ userName, onNavigate }: ProfileHeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="bg-white/80 backdrop-blur-lg border-b border-pink-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo - 클릭 시 대시보드로 이동 */}
            <button
              onClick={() => onNavigate?.('dashboard')}
              className="text-5xl sm:text-6xl font-light tracking-wide hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none"
              style={{ fontFamily: "'Italianno', cursive", color: '#9b87f5' }}
              aria-label="대시보드로 이동"
            >
              aller
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => onNavigate?.('dashboard')}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-pink-50 font-medium transition-colors"
              >
                <Home className="w-5 h-5" /> <span>홈</span>
              </button>
              {/* ✅추천받기 버튼 - AI 상담 앞으로 이동 */}
              <button
                onClick={() => onNavigate?.('features')}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-pink-50 font-medium transition-colors"
              >
                <Sparkles className="w-5 h-5" /> <span>추천받기</span>
              </button>
              <button
                onClick={() => onNavigate?.('chat')}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-pink-50 font-medium transition-colors"
              >
                <MessageSquare className="w-5 h-5" /> <span>AI 상담</span>
              </button>
              <button
                onClick={() => onNavigate?.('profile')}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  background: 'linear-gradient(135deg, #f5c6d9 0%, #e8b4d4 100%)',
                  color: 'white',
                }}
              >
                <UserCircle className="w-5 h-5" /> <span>프로필</span>
              </button>
              <button
                onClick={() => onNavigate?.('analytics')}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-pink-50 font-medium transition-colors"
              >
                <BarChart3 className="w-5 h-5" /> <span>Analytics</span>
              </button>
              <button
                onClick={() => onNavigate?.('settings')}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-pink-50 font-medium transition-colors"
              >
                <SettingsIcon className="w-5 h-5" /> <span>설정</span>
              </button>
            </nav>

            {/* Right side */}
            <div className="hidden md:flex items-center space-x-4">
              <button className="p-2 text-gray-600 hover:text-pink-600 transition-colors relative">
                <Bell className="w-6 h-6" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button
                onClick={() => onNavigate?.('profile')}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold hover:scale-110 hover:shadow-lg transition-all cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #f5c6d9 0%, #e8b4d4 100%)' }}
                aria-label="프로필 페이지로 이동"
              >
                {userName.charAt(0).toUpperCase()}
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-pink-600 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu - Full Screen (헤더 외부) */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="md:hidden fixed top-[60px] left-0 right-0 bottom-[70px] bg-white z-[100] flex flex-col px-6 py-8 space-y-2 overflow-y-auto"
        >
          <button
            onClick={() => {
              onNavigate?.('dashboard');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center space-x-3 px-4 py-4 rounded-xl text-lg text-gray-700 hover:bg-pink-50"
          >
            <Home className="w-6 h-6" /> <span>홈</span>
          </button>
          <button
            onClick={() => {
              onNavigate?.('features');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center space-x-3 px-4 py-4 rounded-xl text-lg text-gray-700 hover:bg-pink-50"
          >
            <Sparkles className="w-6 h-6" /> <span>추천받기</span>
          </button>
          <button
            onClick={() => {
              onNavigate?.('chat');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center space-x-3 px-4 py-4 rounded-xl text-lg text-gray-700 hover:bg-pink-50"
          >
            <MessageSquare className="w-6 h-6" /> <span>AI 상담</span>
          </button>
          <button
            onClick={() => {
              onNavigate?.('profile');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center space-x-3 px-4 py-4 rounded-xl text-lg"
            style={{
              background: 'linear-gradient(135deg, #f5c6d9 0%, #e8b4d4 100%)',
              color: 'white',
            }}
          >
            <UserCircle className="w-6 h-6" /> <span>프로필</span>
          </button>
          <button
            onClick={() => {
              onNavigate?.('analytics');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center space-x-3 px-4 py-4 rounded-xl text-lg text-gray-700 hover:bg-pink-50"
          >
            <BarChart3 className="w-6 h-6" /> <span>Analytics</span>
          </button>
          <button
            onClick={() => {
              onNavigate?.('settings');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center space-x-3 px-4 py-4 rounded-xl text-lg text-gray-700 hover:bg-pink-50"
          >
            <SettingsIcon className="w-6 h-6" /> <span>설정</span>
          </button>
        </motion.div>
      )}
    </>
  );
};
