"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Target,
  Calendar,
  BarChart3,
  MessageSquare,
  LogOut,
  BookOpen,
  Folder,
  Menu,
  X,
  User,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/react-app/hooks/useCustomAuth";
import LoginModal from "./LoginModal";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps): React.ReactElement {
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
  const [isMobileHelpOpen, setIsMobileHelpOpen] = useState(false);
  const isLanding = pathname === "/";
  const isAdminRoutes =
    pathname.startsWith("/admin") || pathname.startsWith("/agent");

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
    setIsHelpMenuOpen(false);
    setIsMobileHelpOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent): void => {
      const profileMenu = document.getElementById("header-profile-dropdown");
      const helpMenu = document.getElementById("header-help-dropdown");
      const target = e.target as Node;
      if (profileMenu && !profileMenu.contains(target))
        setIsProfileMenuOpen(false);
      if (helpMenu && !helpMenu.contains(target)) setIsHelpMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
    };
  }, []);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
    { name: "Today", href: "/daily", icon: Calendar },
    { name: "Goals", href: "/goals", icon: Target },
    { name: "Projects", href: "/projects", icon: Folder },
    { name: "Questions", href: "/questions", icon: MessageSquare },
    { name: "FAQ", href: "/faq", icon: BookOpen },
    { name: "AI Chat", href: "/chat", icon: MessageSquare },
  ];

  if (!isLanding && isLoading) {
    return (
      <div className="min-h-screen bg-purple-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Note: unauthenticated users can browse; actions will prompt login via modal

  // Admin and Agent routes render with their own chrome (no marketing header)
  if (isAdminRoutes) {
    return (
      <div className="min-h-screen bg-purple-950 text-white">{children}</div>
    );
  }

  // For the landing page, render children without the purple header or app chrome
  if (isLanding) {
    return (
      <div className="min-h-screen bg-purple-950 text-white">{children}</div>
    );
  }

  return (
    <div className="min-h-[100svh] flex flex-col">
      {/* Header */}
      <header className="bg-purple-950/60 backdrop-blur-sm border-b border-purple-900 fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <button
                onClick={() => {
                  setIsMobileMenuOpen((prev) => !prev);
                }}
                className="md:hidden text-gray-300 hover:text-white mr-2"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  GoalTracker AI
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-6">
              {/* Navigation */}
              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-8">
                {navigation
                  .filter(
                    (item) =>
                      !["Questions", "FAQ", "AI Chat"].includes(item.name),
                  )
                  .map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`${
                        pathname === item.href
                          ? "text-white border-b-2 border-purple-400"
                          : "text-gray-300 hover:text-white hover:border-b-2 hover:border-purple-400/50"
                      } px-3 py-2 text-sm font-medium transition-colors duration-200`}
                    >
                      {item.name}
                    </Link>
                  ))}
                {/* Help Center Dropdown */}
                <div id="header-help-dropdown" className="relative">
                  {(() => {
                    const helpActive =
                      pathname.startsWith("/questions") ||
                      pathname.startsWith("/faq") ||
                      pathname.startsWith("/chat");
                    return (
                      <button
                        onClick={() => {
                          setIsHelpMenuOpen((v) => !v);
                        }}
                        className={`${helpActive ? "text-white border-b-2 border-purple-400" : "text-gray-300 hover:text-white hover:border-b-2 hover:border-purple-400/50"} px-3 py-2 text-sm font-medium inline-flex items-center gap-1`}
                        aria-haspopup="menu"
                        aria-expanded={isHelpMenuOpen}
                        title="Help Center"
                      >
                        Help Center{" "}
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${isHelpMenuOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                    );
                  })()}
                  {isHelpMenuOpen && (
                    <div className="absolute left-0 mt-2 w-56 bg-purple-950/90 border border-purple-900 rounded-lg shadow-xl backdrop-blur-sm overflow-hidden">
                      <Link
                        href="/questions"
                        onClick={() => {
                          setIsHelpMenuOpen(false);
                        }}
                        className="block px-3 py-2 text-sm text-gray-200 hover:bg-white/10"
                      >
                        Questions
                      </Link>
                      <Link
                        href="/faq"
                        onClick={() => {
                          setIsHelpMenuOpen(false);
                        }}
                        className="block px-3 py-2 text-sm text-gray-200 hover:bg-white/10"
                      >
                        FAQ
                      </Link>
                      <Link
                        href="/chat"
                        onClick={() => {
                          setIsHelpMenuOpen(false);
                        }}
                        className="block px-3 py-2 text-sm text-gray-200 hover:bg-white/10"
                      >
                        AI Chat
                      </Link>
                    </div>
                  )}
                </div>
              </nav>
              {/* Desktop Profile Dropdown */}
              {user ? (
                <div
                  id="header-profile-dropdown"
                  className="relative hidden md:block"
                >
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen((v) => !v);
                    }}
                    className="w-9 h-9 rounded-full bg-purple-500 text-white font-medium grid place-items-center hover:opacity-90"
                    aria-haspopup="menu"
                    title="Account"
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </button>
                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-44 bg-purple-950/90 border border-purple-900 rounded-lg shadow-xl backdrop-blur-sm overflow-hidden">
                      <Link
                        href="/profile"
                        className={`block px-3 py-2 text-sm text-gray-200 hover:bg-white/10`}
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                        }}
                      >
                        Profile
                      </Link>
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          void logout();
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-white/10"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => {
                    setShowLoginModal(true);
                  }}
                  className="hidden md:flex px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm"
                >
                  Sign In
                </button>
              )}

              {/* Mobile Navigation moved below header */}
            </div>
          </div>
        </div>
      </header>
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-purple-950/90 backdrop-blur-sm">
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
            }}
            className="absolute top-4 right-4 p-2 rounded-full bg-purple-900 text-gray-200 hover:bg-purple-800"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
          <div className="pt-16 px-4">
            <nav className="flex flex-col space-y-2">
              {navigation
                .filter(
                  (item) =>
                    !["Questions", "FAQ", "AI Chat"].includes(item.name),
                )
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`${
                        pathname === item.href
                          ? "bg-purple-900 text-white"
                          : "text-gray-300 hover:bg-purple-900 hover:text-white"
                      } px-4 py-3 rounded-lg flex items-center space-x-3 text-base font-medium transition-colors duration-200`}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <Icon size={20} className="flex-shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}

              {/* Mobile Help Center Dropdown */}
              <button
                onClick={() => {
                  setIsMobileHelpOpen((s) => !s);
                }}
                className={`px-4 py-3 rounded-lg flex items-center justify-between text-base font-medium transition-colors duration-200 ${
                  pathname.startsWith("/questions") ||
                  pathname.startsWith("/faq") ||
                  pathname.startsWith("/chat")
                    ? "bg-purple-900 text-white"
                    : "text-gray-300 hover:bg-purple-900 hover:text-white"
                }`}
                aria-haspopup="menu"
                aria-expanded={isMobileHelpOpen}
                title="Help Center"
              >
                <span className="flex items-center gap-3">
                  <BookOpen size={20} className="flex-shrink-0" /> Help Center
                </span>
                <ChevronDown
                  size={18}
                  className={`transition-transform ${isMobileHelpOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isMobileHelpOpen && (
                <div className="ml-9 flex flex-col space-y-2">
                  <Link
                    href="/questions"
                    className={`${pathname === "/questions" ? "bg-purple-900 text-white" : "text-gray-300 hover:bg-purple-900 hover:text-white"} px-4 py-2 rounded-lg text-sm transition-colors`}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    Questions
                  </Link>
                  <Link
                    href="/faq"
                    className={`${pathname === "/faq" ? "bg-purple-900 text-white" : "text-gray-300 hover:bg-purple-900 hover:text-white"} px-4 py-2 rounded-lg text-sm transition-colors`}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    FAQ
                  </Link>
                  <Link
                    href="/chat"
                    className={`${pathname === "/chat" ? "bg-purple-900 text-white" : "text-gray-300 hover:bg-purple-900 hover:text-white"} px-4 py-2 rounded-lg text-sm transition-colors`}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    AI Chat
                  </Link>
                </div>
              )}
              {user && (
                <Link
                  href="/profile"
                  className={`${
                    pathname === "/profile"
                      ? "bg-purple-900 text-white"
                      : "text-gray-300 hover:bg-purple-900 hover:text-white"
                  } px-4 py-3 rounded-lg flex items-center space-x-3 text-base font-medium transition-colors duration-200`}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <User size={20} className="flex-shrink-0" />
                  <span>Profile</span>
                </Link>
              )}
            </nav>
            <div className="mt-6 pt-6 border-t border-purple-900">
              {user ? (
                <div className="flex items-center justify-between px-4 py-3 bg-purple-900/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-medium">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-200 truncate max-w-[150px]">
                      {user.email}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      void logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="p-1.5 rounded-full text-gray-400 hover:bg-purple-800 hover:text-white"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setShowLoginModal(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <main className="pt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col min-h-0">
        {children}
      </main>

      {/* Global Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
        }}
      />
    </div>
  );
}
