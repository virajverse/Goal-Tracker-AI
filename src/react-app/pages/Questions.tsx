import type React from "react";
import { useState, useEffect, useCallback, type ChangeEvent } from "react";
import { Search, BookOpen, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { useRouter } from "next/navigation";

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  tags: string;
}

interface QuestionsPageProps {
  forcedCategory?: "FAQ" | "Questions";
}

// Simple pluralization helper for counts, e.g., 1 category vs 2 categories
const pluralize = (count: number, singular: string, plural?: string): string =>
  `${String(count)} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;

export default function Questions({ forcedCategory }: QuestionsPageProps): React.ReactElement {
  const router = useRouter();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [filteredFaqs, setFilteredFaqs] = useState<FAQ[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedTags] = useState<string[]>([]);
  const [showAllTags, setShowAllTags] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>("all");

  const isFaqsResponse = (data: unknown): data is { faqs?: FAQ[] } => {
    return !!(data && typeof data === "object" && "faqs" in data);
  };

  const fetchFAQs = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const url = forcedCategory
        ? `/api/faqs?category=${encodeURIComponent(forcedCategory)}`
        : "/api/faqs";
      const response = await fetch(url);
      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        /* ignore json parse errors */
      }
      const faqsData =
        isFaqsResponse(data) && Array.isArray((data as { faqs?: unknown }).faqs)
          ? (data as { faqs?: FAQ[] }).faqs
          : [];
      setFaqs(faqsData ?? []);
    } catch (error) {
      console.error("Error fetching FAQs:", error);
    } finally {
      setLoading(false);
    }
  }, [forcedCategory]);

  useEffect(() => {
    void fetchFAQs();
  }, [fetchFAQs]);

  // Keep selectedCategory neutral when a forcedCategory is used (we filter by topic instead)
  useEffect(() => {
    setSelectedCategory("all");
  }, [forcedCategory]);

  const filterFAQs = useCallback((): void => {
    let filtered = faqs;

    if (searchTerm) {
      filtered = filtered.filter((faq) => {
        const q = searchTerm.toLowerCase();
        return (
          faq.question.toLowerCase().includes(q) ||
          faq.answer.toLowerCase().includes(q) ||
          faq.tags.toLowerCase().includes(q) ||
          faq.category.toLowerCase().includes(q)
        );
      });
    }

    // When forcedCategory is provided (e.g., FAQ page), ignore category filter
    const effectiveCategory = forcedCategory ? "all" : selectedCategory;
    if (effectiveCategory !== "all") {
      filtered = filtered.filter((faq) => faq.category === effectiveCategory);
    }

    if (selectedTags.length > 0) {
      const sel = selectedTags.map((t) => t.toLowerCase());
      filtered = filtered.filter((faq) => {
        const tags = faq.tags
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
        // match ANY selected tag
        return sel.some((t) => tags.includes(t));
      });
    }

    if (selectedTopic !== "all") {
      filtered = filtered.filter((faq) =>
        getFaqTopics(faq).includes(selectedTopic),
      );
    }

    setFilteredFaqs(filtered);
  }, [faqs, forcedCategory, searchTerm, selectedCategory, selectedTags, selectedTopic, getFaqTopics]);

  useEffect(() => {
    filterFAQs();
  }, [filterFAQs]);

  const toggleExpanded = (id: number): void => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const categories = Array.from(
    new Set(faqs.map((faq) => faq.category)),
  ).filter(Boolean);

  // Tag filtering UI is disabled for now; helpers removed to avoid unused-vars

  // Topics shown in the category dropdown when forcedCategory is set
  const topicOptions = [
    "Mindset & Motivation",
    "Health & Fitness",
    "Productivity & Time Management",
    "Habits & Discipline",
    "Emotional Intelligence",
    "Relationships & Social Life",
    "Career & Skills",
    "Finance & Money",
    "Self-Reflection & Mindfulness",
    "Leadership & Communication",
  ];

  // Basic keyword mapping from tags/question/answer to topic
  const topicKeywords: Record<string, string[]> = {
    "Mindset & Motivation": [
      "mindset",
      "motivation",
      "identity",
      "belief",
      "grit",
      "resilience",
      "focus",
      "confidence",
    ],
    "Health & Fitness": [
      "health",
      "fitness",
      "workout",
      "exercise",
      "training",
      "cardio",
      "strength",
      "nutrition",
      "diet",
      "steps",
      "sleep",
    ],
    "Productivity & Time Management": [
      "productivity",
      "time",
      "planning",
      "plan",
      "prioritize",
      "priority",
      "schedule",
      "calendar",
      "deep work",
      "energy management",
      "focus blocks",
    ],
    "Habits & Discipline": [
      "habit",
      "habits",
      "discipline",
      "streak",
      "2-minute",
      "implementation intention",
      "habit stacking",
      "commitment",
      "routine",
      "cue",
      "friction",
      "temptation bundling",
    ],
    "Emotional Intelligence": [
      "eq",
      "emotional",
      "emotion",
      "empathy",
      "feedback",
      "conflict",
      "stress",
      "granularity",
      "nvc",
      "labeling",
      "reappraisal",
      "boundaries",
    ],
    "Relationships & Social Life": [
      "relationship",
      "relationships",
      "social",
      "friend",
      "friends",
      "network",
      "dating",
      "connection",
    ],
    "Career & Skills": [
      "career",
      "skills",
      "skill",
      "work",
      "job",
      "learning",
      "learn",
      "practice",
      "mentor",
      "portfolio",
      "resume",
    ],
    "Finance & Money": [
      "finance",
      "money",
      "budget",
      "invest",
      "investing",
      "saving",
      "savings",
      "debt",
      "expense",
      "expenses",
    ],
    "Self-Reflection & Mindfulness": [
      "mindfulness",
      "meditation",
      "reflect",
      "reflection",
      "journal",
      "journaling",
      "awareness",
      "self-awareness",
      "breathing",
    ],
    "Leadership & Communication": [
      "leadership",
      "leader",
      "team",
      "management",
      "manage",
      "communication",
      "coach",
      "coaching",
      "nvc",
      "feedback",
      "sbi",
    ],
  };

  function getFaqTopics(faq: FAQ): string[] {
    const text = (
      faq.tags +
      " " +
      faq.question +
      " " +
      faq.answer
    ).toLowerCase();
    const topics: string[] = [];
    for (const topic of topicOptions) {
      const kws = topicKeywords[topic] ?? [];
      if (kws.some((kw) => text.includes(kw))) topics.push(topic);
    }
    return topics;
  }

  const handleQuestionClick = (question: string): void => {
    setSearchTerm(question);
  };

  const askInAIChat = (text: string): void => {
    const q = encodeURIComponent(text.trim());
    router.push(`/chat?q=${q}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Knowledge Base</h1>
            <p className="text-lg text-purple-200">
              Browse through commonly asked questions and find instant answers
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 relative z-10 isolate overflow-visible">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-5 h-5 text-white/60" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setSearchTerm(e.target.value);
                }}
                className="w-full pl-10 pr-4 h-12 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400 overflow-hidden"
              />
            </div>

            {/* Category Filter */}
            {!forcedCategory ? (
              <div className="relative flex-1">
                <div className="relative">
                  <Filter className="absolute left-3 top-3 w-5 h-5 text-white/60" />
                  <select
                    value={selectedCategory}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                      setSelectedCategory(e.target.value);
                    }}
                    className="w-full pl-10 pr-8 h-12 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400 appearance-none cursor-pointer overflow-hidden"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((category) => (
                      <option
                        key={category}
                        value={category}
                        className="bg-gray-800"
                      >
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowCategoryMenu((s) => !s);
                  }}
                  className="px-4 h-12 w-full md:w-72 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg flex items-center gap-2 shadow-lg shadow-purple-900/30 hover:from-purple-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-purple-400 overflow-hidden"
                  title="Select topic"
                  aria-haspopup="listbox"
                  aria-expanded={showCategoryMenu}
                >
                  <Filter className="w-5 h-5 text-white/90" />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="text-sm whitespace-nowrap truncate">
                      {forcedCategory}
                      {selectedTopic !== "all" && ` • ${selectedTopic}`}
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-white/90 flex-shrink-0 ml-1" />
                </button>
                {showCategoryMenu && (
                  <div className="absolute right-0 mt-2 w-72 bg-gradient-to-b from-purple-700 to-indigo-700 text-white rounded-lg shadow-2xl shadow-purple-900/40 z-[9999] max-h-80 overflow-auto ring-1 ring-white/10">
                    <button
                      onClick={() => {
                        setSelectedTopic("all");
                        setShowCategoryMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                    >
                      All Topics
                    </button>
                    <div className="border-t border-white/10" />
                    {topicOptions.map((topic) => (
                      <button
                        key={topic}
                        onClick={() => {
                          setSelectedTopic(topic);
                          setShowCategoryMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tag Filter - disabled for now */}

          {/* Quick Stats */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-purple-200">
            <span>{pluralize(filteredFaqs.length, "question")} found</span>
            <span className="opacity-60">•</span>
            <span>{pluralize(categories.length, "category")}</span>
            {selectedTopic !== "all" && (
              <>
                <span className="opacity-60">•</span>
                <span>Topic: {selectedTopic}</span>
              </>
            )}
          </div>

          {/* Ask in AI Chat CTA for current search (Questions page only) */}
          {forcedCategory !== "FAQ" && searchTerm.trim() !== "" && (
            <div className="mt-3">
              <button
                onClick={() => {
                  askInAIChat(searchTerm);
                }}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 border border-white/20 text-sm"
              >
                Ask “{searchTerm}” in AI Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FAQ Items */}
      <div className="grid gap-4">
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-12 col-span-2">
            <BookOpen className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">
              No questions found
            </h3>
            <p className="text-purple-200">
              Try adjusting your search terms or category filter
            </p>
          </div>
        ) : (
          filteredFaqs.map((faq) => (
            <div
              key={faq.id}
              className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden flex flex-col min-h-0"
            >
              <button
                onClick={() => {
                  toggleExpanded(faq.id);
                }}
                className="w-full p-4 text-left hover:bg-white/5 transition-colors flex items-center justify-between"
              >
                <h3 className="text-white font-medium text-left flex-1 line-clamp-2 pr-4">
                  {faq.question}
                </h3>
                {expandedItems.has(faq.id) ? (
                  <ChevronUp className="w-5 h-5 text-white/60 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white/60 flex-shrink-0" />
                )}
              </button>

              <div
                className={`transition-all duration-200 overflow-hidden ${
                  expandedItems.has(faq.id) ? "max-h-96" : "max-h-0"
                }`}
              >
                <div className="p-4 pt-0">
                  <div className="prose prose-invert max-w-none text-gray-300">
                    <p className="whitespace-pre-wrap">{faq.answer}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 pt-3 border-t border-white/10">
                    {faq.tags && (
                      <div className="flex flex-wrap gap-2">
                        {faq.tags.split(",").map((tag) => (
                          <button
                            key={tag.trim()}
                            onClick={() => {
                              setShowAllTags((s) => !s);
                            }}
                            className="text-xs px-2 py-1 rounded-md bg-white/10 border border-white/20 text-white hover:bg-white/20"
                          >
                            {showAllTags ? "Show less" : "Show more"}
                          </button>
                        ))}
                      </div>
                    )}
                    {forcedCategory !== "FAQ" && (
                      <button
                        onClick={() => {
                          askInAIChat(faq.question);
                        }}
                        title="Ask this in AI Chat"
                        type="button"
                      >
                        Ask in AI Chat
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Popular Questions */}
      {searchTerm === "" && (
        <div className="mt-12 bg-white/5 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            Popular Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {filteredFaqs.slice(0, 8).map((faq) => (
              <button
                key={faq.id}
                onClick={() => {
                  handleQuestionClick(faq.question);
                }}
                className="text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="text-sm text-purple-300 mb-1">
                  {faq.category}
                </div>
                <div className="text-white font-medium text-sm leading-relaxed">
                  {faq.question}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
