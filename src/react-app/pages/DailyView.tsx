import React, { useState } from "react";
import GoalCard from "@/react-app/components/GoalCard";
import AISuggestionBox from "@/react-app/components/AISuggestionBox";
import StatsCard from "@/react-app/components/StatsCard";
import { useGoals } from "@/react-app/hooks/useGoals";
import { useDailyLogs } from "@/react-app/hooks/useDailyLogs";
import {
  Calendar,
  CheckCircle2,
  Target,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import toast from "react-hot-toast";

export default function DailyView(): React.ReactElement {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { goals } = useGoals();
  const { logs, createOrUpdateLog } = useDailyLogs(
    format(selectedDate, "yyyy-MM-dd"),
  );

  const dateString = format(selectedDate, "yyyy-MM-dd");
  const isToday = dateString === format(new Date(), "yyyy-MM-dd");

  // Calculate daily stats
  const todaysLogs = logs.filter((log) => log.log_date === dateString);
  const completedCount = todaysLogs.filter((log) => log.is_completed).length;
  const totalCount = goals.length;
  const completionRate =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleToggleComplete = async (
    goalId: number,
    completed: boolean,
    notes?: string,
  ): Promise<void> => {
    try {
      await createOrUpdateLog({
        goal_id: goalId,
        log_date: dateString,
        is_completed: completed,
        notes: notes?.length ? notes : undefined,
      });

      if (completed) {
        toast.success("Goal completed! 🎉");
      }
    } catch {
      toast.error("Failed to update goal status");
    }
  };

  const navigateDate = (direction: "prev" | "next"): void => {
    if (direction === "prev") {
      setSelectedDate(subDays(selectedDate, 1));
    } else {
      setSelectedDate(addDays(selectedDate, 1));
    }
  };

  const goToToday = (): void => {
    setSelectedDate(new Date());
  };

  return (
    <div className="space-y-8">
      {/* Header with Date Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {isToday ? "Today's Goals" : format(selectedDate, "EEEE, MMMM do")}
          </h1>
          <p className="text-lg text-purple-200">
            Track your daily progress and stay motivated
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              navigateDate("prev");
            }}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 px-4 py-2 bg-white/10 rounded-lg border border-white/20">
            <Calendar className="w-4 h-4 text-white" />
            <span className="text-white font-medium">
              {format(selectedDate, "MMM dd, yyyy")}
            </span>
          </div>

          <button
            onClick={() => {
              navigateDate("next");
            }}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {!isToday && (
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Daily Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Goals Today"
          value={totalCount}
          subtitle="Total goals to track"
          icon={Target}
          color="purple"
        />

        <StatsCard
          title="Completed"
          value={`${String(completedCount)}/${String(totalCount)}`}
          subtitle={`${String(completionRate)}% done`}
          icon={CheckCircle2}
          color="green"
        />

        <StatsCard
          title="Progress"
          value={`${String(completionRate)}%`}
          subtitle={
            completedCount === totalCount && totalCount > 0
              ? "Perfect day! 🎉"
              : "Keep going!"
          }
          icon={TrendingUp}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Goals List */}
        <div className="lg:col-span-2">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-white mb-6">
              {isToday
                ? "Today's Tasks"
                : `Tasks for ${format(selectedDate, "MMMM do")}`}
            </h2>

            {goals.length > 0 ? (
              <div className="space-y-4">
                {goals.map((goal) => {
                  const dailyLog = todaysLogs.find(
                    (log) => log.goal_id === goal.id,
                  );
                  return (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      dailyLog={dailyLog}
                      onToggleComplete={(goalId, completed, notes) => {
                        void handleToggleComplete(goalId, completed, notes);
                      }}
                      showActions={false}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Target className="w-16 h-16 text-white/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  No Goals Yet
                </h3>
                <p className="text-white/60 mb-4">
                  Create some goals to start tracking your daily progress!
                </p>
                <a
                  href="/goals"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg hover:from-purple-600 hover:to-blue-700 transition-all"
                >
                  <Target className="w-4 h-4" />
                  <span>Create Your First Goal</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* AI Suggestions */}
        <div>
          <AISuggestionBox />
        </div>
      </div>

      {/* Motivational Section */}
      {completedCount === totalCount && totalCount > 0 && (
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-lg rounded-xl border border-white/20 p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Perfect Day Achieved!
          </h2>
          <p className="text-green-200 text-lg mb-4">
            You've completed all your goals for{" "}
            {isToday ? "today" : format(selectedDate, "MMMM do")}!
          </p>
          <p className="text-white/80">
            Consistency is the key to success. Keep up the amazing work! 💪
          </p>
        </div>
      )}

      {/* Progress Encouragement */}
      {completedCount > 0 && completedCount < totalCount && (
        <div className="bg-gradient-to-br from-blue-500/20 to-purple-600/20 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <div className="flex items-center space-x-4">
            <div className="text-4xl">💪</div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Great Progress!
              </h3>
              <p className="text-purple-200">
                You've completed {completedCount} out of {totalCount} goals.
                {totalCount - completedCount === 1
                  ? " Just 1 more to go!"
                  : " " + String(totalCount - completedCount) + " more to go!"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
