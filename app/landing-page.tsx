"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Brain,
  TrendingUp,
  Sparkles,
  Plug,
  CheckCircle,
  Star,
  Github,
  Twitter,
  Linkedin,
} from "lucide-react";
import { PulsingBorderShader } from "./pulsing-border-shader";
import { useRouter } from "next/navigation";
import LoginModal from "@/react-app/components/LoginModal";
import { useAuth } from "@/react-app/hooks/useCustomAuth";
import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setShowLogin(true);
  };

  const goToDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-purple-950 text-white">
      <Header
        onLogin={() => {
          openAuth("login");
        }}
        onSignup={() => {
          openAuth("signup");
        }}
        onCTA={goToDashboard}
      />

      <Hero onPrimaryCTA={goToDashboard} />

      <Stats />

      <Features />

      <HowItWorks />

      <Testimonials />

      <Pricing onCTA={goToDashboard} />

      <FAQ />

      <Footer />
      {/* Auth Modal */}
      <LoginModal
        isOpen={showLogin}
        onClose={() => {
          setShowLogin(false);
        }}
        initialMode={authMode}
      />
    </div>
  );
}

function Header({
  onLogin,
  onSignup,
  onCTA,
}: {
  onLogin: () => void;
  onSignup: () => void;
  onCTA: () => void;
}) {
  const { user, isLoading } = useAuth();
  return (
    <header className="sticky top-0 z-50 border-b border-purple-900 bg-purple-950/60 backdrop-blur">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-8 w-8">
              <div className="absolute inset-0 rotate-45 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600" />
              <div className="absolute inset-1 rotate-45 rounded-md bg-white" />
            </div>
            <span className="text-xl font-bold">Goal Tracker AI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-medium text-gray-300 hover:text-white"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-gray-300 hover:text-white"
            >
              How It Works
            </a>
            <a
              href="#testimonials"
              className="text-sm font-medium text-gray-300 hover:text-white"
            >
              Testimonials
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-gray-300 hover:text-white"
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="text-sm font-medium text-gray-300 hover:text-white"
            >
              FAQ
            </a>
            {!isLoading && user ? (
              <button
                onClick={onCTA}
                className="rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-95"
              >
                Go to Dashboard
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onLogin}
                  className="rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
                >
                  Login
                </button>
                <button
                  onClick={onSignup}
                  className="rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-95"
                >
                  Sign Up
                </button>
              </div>
            )}
          </nav>
          <button
            onClick={onCTA}
            className="md:hidden rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow"
          >
            {user ? "Go to Dashboard" : "Start Free"}
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero({ onPrimaryCTA }: { onPrimaryCTA: () => void }) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-700/20 via-indigo-700/15 to-purple-900/20" />
        <div className="pointer-events-none absolute -top-24 -right-24 opacity-30">
          <PulsingBorderShader className="h-56 w-56" color="#7c3aed" />
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 opacity-20">
          <PulsingBorderShader className="h-72 w-72" color="#4338ca" />
        </div>
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 relative">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-white">
            <Brain className="h-4 w-4" />
            <span className="text-xs font-semibold">
              AI-Powered Goal Tracking
            </span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Achieve Your Goals Smarter with AI
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-purple-200">
            Your personal AI coach for daily progress, motivation, and results.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={onPrimaryCTA}
              className="group rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-3 text-base font-semibold text-white shadow-lg hover:opacity-95"
            >
              Start Tracking Free
              <ArrowRight className="ml-2 inline h-5 w-5 translate-x-0 transition-transform group-hover:translate-x-1" />
            </button>
            <a
              href="#how-it-works"
              className="rounded-full border border-white/20 bg-white/10 px-8 py-3 text-base font-semibold text-white hover:bg-white/20"
            >
              See How It Works
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className="py-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              <CountUp to={25000} />+
            </div>
            <div className="mt-2 text-sm text-purple-200">Goals created</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              <CountUp to={1200000} compact />
            </div>
            <div className="mt-2 text-sm text-purple-200">Daily check-ins</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              <CountUp to={87} />%
            </div>
            <div className="mt-2 text-sm text-purple-200">
              Users achieving more
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    {
      icon: Brain,
      title: "Smart Goal Setting",
      desc: "AI refines your goals into SMART goals with milestones.",
    },
    {
      icon: TrendingUp,
      title: "Daily Progress Tracking",
      desc: "Beautiful dashboard, streaks, and reminders.",
    },
    {
      icon: Sparkles,
      title: "Personalized Insights",
      desc: "Get tailored tips to stay on track and motivated.",
    },
    {
      icon: Plug,
      title: "Integrations",
      desc: "Google Calendar, Notion, Trello and more (Pro).",
    },
  ];
  return (
    <section id="features" className="py-16 sm:py-20 scroll-mt-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Everything you need to achieve more
          </h2>
          <p className="mt-3 text-purple-200">
            Designed for focus, built for momentum.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <Reveal key={it.title} delay={i * 60}>
              <div className="h-full rounded-2xl border border-white/15 bg-white/10 p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white">
                  <it.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{it.title}</h3>
                <p className="mt-2 text-sm text-purple-200">{it.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      title: "Set your goal",
      desc: "Describe what you want to achieve in plain English.",
    },
    {
      title: "Get AI roadmap",
      desc: "We generate milestones and a daily plan tailored to you.",
    },
    {
      title: "Track progress daily",
      desc: "Log progress, keep streaks, and get nudges.",
    },
    {
      title: "Achieve with motivation",
      desc: "Celebrate wins and keep momentum with insights.",
    },
  ];
  return (
    <section id="how-it-works" className="py-16 sm:py-20 scroll-mt-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">How it works</h2>
          <p className="mt-3 text-purple-200">Simple steps to big results.</p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 60}>
              <div className="h-full rounded-2xl border border-white/15 bg-white/10 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-purple-200">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    {
      quote:
        "I finally stayed consistent. The AI tips helped me finish a course I’d postponed for months.",
      name: "Alex Rivera",
      role: "Product Designer",
      img: "https://i.pravatar.cc/100?img=12",
    },
    {
      quote:
        "I set a fitness goal and actually stuck with it. The progress dashboard is so motivating!",
      name: "Priya Sharma",
      role: "Software Engineer",
      img: "https://i.pravatar.cc/100?img=32",
    },
    {
      quote:
        "The AI roadmap made my goals realistic. I hit milestones faster than ever.",
      name: "Michael Chen",
      role: "Founder",
      img: "https://i.pravatar.cc/100?img=22",
    },
  ];
  return (
    <section id="testimonials" className="py-16 sm:py-20 scroll-mt-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Loved by motivated people
          </h2>
          <p className="mt-3 text-purple-200">Here’s what our users say.</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {items.map((t, i) => (
            <Reveal key={t.name} delay={i * 60}>
              <figure className="h-full rounded-2xl border border-white/15 bg-white/10 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <Image
                    src={t.img}
                    alt={t.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-purple-300">{t.role}</div>
                  </div>
                  <div className="ml-auto flex items-center gap-0.5 text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                </div>
                <blockquote className="mt-4 text-sm text-purple-200">
                  “{t.quote}”
                </blockquote>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing({ onCTA }: { onCTA: () => void }) {
  interface Tier {
    name: string;
    monthly: number; // monthly price
    highlight: boolean;
    badge?: string | null;
    features: string[];
  }

  const [yearly, setYearly] = useState(false);

  const tiers: Tier[] = [
    {
      name: "Free",
      monthly: 0,
      highlight: false,
      badge: null,
      features: ["Basic tracking", "Daily check-ins", "Community support"],
    },
    {
      name: "Pro",
      monthly: 9,
      highlight: true,
      badge: "Most Popular",
      features: [
        "AI insights",
        "Integrations",
        "Priority support",
        "Unlimited goals",
        "Streaks & reminders",
      ],
    },
    {
      name: "Ultimate",
      monthly: 19,
      highlight: false,
      badge: "Best Value",
      features: [
        "Everything in Pro",
        "Advanced analytics",
        "Custom AI coach",
        "Team sharing (soon)",
      ],
    },
  ];

  const priceFor = (t: Tier) =>
    yearly ? Math.round(t.monthly * 0.8) : t.monthly;
  const billedYearly = (t: Tier) => Math.round(t.monthly * 12 * 0.8);

  return (
    <section
      id="pricing"
      className="relative overflow-hidden bg-slate-50 py-16 sm:py-20 scroll-mt-24"
    >
      <div className="pointer-events-none absolute -top-16 -right-16 opacity-25">
        <PulsingBorderShader className="h-56 w-56" color="#6366f1" />
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 opacity-20">
        <PulsingBorderShader className="h-72 w-72" color="#7c3aed" />
      </div>
      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">Simple pricing</h2>
          <p className="mt-3 text-slate-600">
            Start free. Upgrade when you’re ready.
          </p>
          <div className="mt-6 flex justify-center">
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1 text-sm shadow-sm">
              <button
                onClick={() => {
                  setYearly(false);
                }}
                className={`${!yearly ? "bg-slate-900 text-white" : "text-slate-700"} rounded-full px-4 py-1.5 transition`}
              >
                Monthly
              </button>
              <button
                onClick={() => {
                  setYearly(true);
                }}
                className={`${yearly ? "bg-slate-900 text-white" : "text-slate-700"} rounded-full px-4 py-1.5 transition`}
              >
                Yearly{" "}
                <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <Reveal key={t.name}>
              <div
                className={`relative h-full rounded-2xl border p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  t.highlight
                    ? "border-indigo-200 bg-gradient-to-br from-white to-indigo-50 ring-1 ring-indigo-500/20"
                    : "border-slate-200 bg-white"
                }`}
              >
                {t.badge && (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-indigo-600/10 px-2.5 py-1 text-xs font-semibold text-indigo-700 animate-pulse">
                    <Sparkles className="h-3.5 w-3.5" /> {t.badge}
                  </span>
                )}
                <div className="flex items-baseline gap-2">
                  <h3 className="text-lg font-semibold">{t.name}</h3>
                </div>
                <div className="mt-3 flex items-end gap-1">
                  <div className="text-4xl font-extrabold">${priceFor(t)}</div>
                  <div className="pb-1 text-slate-600">/mo</div>
                </div>
                {yearly && t.monthly > 0 && (
                  <>
                    <div className="mt-1 text-xs text-slate-500">
                      Billed ${billedYearly(t)} per year
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      <span className="mr-1 line-through opacity-70">
                        ${t.monthly}
                      </span>
                      <span>per month</span>
                    </div>
                  </>
                )}
                <ul className="mt-5 space-y-2 text-sm">
                  {t.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-slate-700"
                    >
                      <CheckCircle className="mt-0.5 h-4 w-4 text-indigo-600" />{" "}
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onCTA}
                  className={`mt-6 w-full rounded-full px-5 py-3 text-sm font-semibold shadow-sm ${
                    t.highlight
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-95"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {t.monthly === 0
                    ? "Get Started"
                    : yearly
                      ? "Start Yearly"
                      : "Start Monthly"}
                </button>
                {t.monthly > 0 && (
                  <div className="mt-2 text-center text-xs text-slate-500">
                    {t.name === "Ultimate"
                      ? "14-day free trial"
                      : "7-day free trial"}
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>

        <p className="mx-auto mt-6 max-w-md text-center text-xs text-slate-500">
          No credit card required to start. Cancel anytime.
        </p>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    {
      q: "How does the AI generate recommendations?",
      a: "We analyze your goal type, activity, and progress to suggest actionable steps tailored to your habits.",
    },
    {
      q: "Is my data private and secure?",
      a: "Yes. We use industry-standard encryption. You control what you track. See our Privacy Policy.",
    },
    {
      q: "What’s included in the free plan?",
      a: "Basic goal tracking and daily check-ins. Upgrade to Pro for AI insights and integrations.",
    },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-16 sm:py-20 scroll-mt-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-slate-600">
            Answers to the most common questions.
          </p>
        </div>
        <div className="mx-auto mt-8 max-w-3xl space-y-3">
          {faqs.map((f, i) => (
            <div
              key={f.q}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              <button
                className="flex w-full items-center justify-between px-5 py-4 text-left"
                onClick={() => {
                  setOpen((o) => (o === i ? null : i));
                }}
              >
                <span className="text-sm font-semibold">{f.q}</span>
                <span className="text-xl leading-none">
                  {open === i ? "−" : "+"}
                </span>
              </button>
              <div
                className={`px-5 pb-4 text-sm text-slate-600 transition-all ${open === i ? "block" : "hidden"}`}
              >
                {f.a}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-white py-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="relative h-7 w-7">
                <div className="absolute inset-0 rotate-45 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600" />
                <div className="absolute inset-1 rotate-45 rounded-md bg-white" />
              </div>
              <span className="text-base font-bold">Goal Tracker AI</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Set, track, and achieve your goals with your personal AI coach.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold">Company</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>
                <a className="hover:text-slate-900" href="/faq">
                  FAQ
                </a>
              </li>
              <li>
                <a className="hover:text-slate-900" href="#pricing">
                  Pricing
                </a>
              </li>
              <li>
                <a className="hover:text-slate-900" href="#contact">
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold">Resources</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>
                <a className="hover:text-slate-900" href="/questions">
                  Knowledge Base
                </a>
              </li>
              <li>
                <a className="hover:text-slate-900" href="/dashboard">
                  Dashboard
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold">Follow</div>
            <div className="mt-3 flex gap-3">
              <a
                aria-label="GitHub"
                href="#"
                className="rounded-full border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                aria-label="Twitter"
                href="#"
                className="rounded-full border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                aria-label="LinkedIn"
                href="#"
                className="rounded-full border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t pt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Goal Tracker AI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

// Utilities
function CountUp({
  to,
  duration = 1200,
  compact = false,
}: {
  to: number;
  duration?: number;
  compact?: boolean;
}) {
  const [val, setVal] = useState(0);
  const start = useRef<number | null>(null);
  useEffect(() => {
    const step = (t: number) => {
      if (start.current === null) start.current = t;
      const p = Math.min(1, (t - start.current) / duration);
      setVal(Math.floor(p * to));
      if (p < 1) requestAnimationFrame(step);
    };
    const r = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(r);
    };
  }, [to, duration]);
  const display = compact
    ? new Intl.NumberFormat(undefined, { notation: "compact" }).format(val)
    : val.toLocaleString();
  return <span>{display}</span>;
}

function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(
          (e) =>
            e.isIntersecting &&
            setTimeout(() => {
              setInView(true);
            }, delay),
        );
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
    };
  }, [delay]);
  return (
    <div
      ref={ref}
      style={{
        transform: inView ? "none" : "translateY(12px)",
        opacity: inView ? 1 : 0,
        transition: "all .6s ease",
      }}
    >
      {children}
    </div>
  );
}
