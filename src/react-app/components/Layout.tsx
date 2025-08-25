 'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Target, Calendar, BarChart3, Sparkles, MessageSquare, LogOut, User, BookOpen, Folder } from 'lucide-react';
import { useAuth } from '@/react-app/hooks/useCustomAuth';
import LoginModal from './LoginModal';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const isLanding = pathname === '/';

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Today', href: '/daily', icon: Calendar },
    { name: 'Goals', href: '/goals', icon: Target },
    { name: 'Projects', href: '/projects', icon: Folder },
    { name: 'Questions', href: '/questions', icon: MessageSquare },
    { name: 'FAQ', href: '/faq', icon: BookOpen },
    { name: 'AI Chat', href: '/chat', icon: MessageSquare },
  ];

  if (!isLanding && isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Note: unauthenticated users can browse; actions will prompt login via modal

  // For the landing page, render children without the purple header or app chrome
  if (isLanding) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">GoalTracker AI</h1>
                <p className="text-sm text-purple-200">Achieve more with AI guidance</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Navigation */}
              <nav className="flex space-x-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-white/20 text-white shadow-lg'
                          : 'text-purple-100 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* User/Menu */}
              <div className="flex items-center gap-4">
                {user ? (
                  <>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 text-white hover:text-purple-200 transition-colors"
                    >
                      <User className="h-4 w-4" />
                      <span className="text-sm">{user.name || user.email || user.phone}</span>
                    </Link>
                    <button
                      onClick={logout}
                      className="text-white/70 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                      title="Logout"
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                  >
                    Login / Sign Up
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col min-h-0">
        {children}
      </main>

      {/* Global Login Modal */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
}
