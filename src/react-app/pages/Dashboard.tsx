import { useState, useEffect } from 'react';
import StatsCard from '@/react-app/components/StatsCard';
import ProgressChart from '@/react-app/components/ProgressChart';
import AISuggestionBox from '@/react-app/components/AISuggestionBox';
import GoalCard from '@/react-app/components/GoalCard';
import { useGoals } from '@/react-app/hooks/useGoals';
import { useAnalytics } from '@/react-app/hooks/useAnalytics';
import { useDailyLogs } from '@/react-app/hooks/useDailyLogs';
import { Target, TrendingUp, Calendar, Award, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

// Time-based greeting function
const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return 'Good Morning'; // Good Morning
  } else if (hour >= 12 && hour < 17) {
    return 'Good Afternoon'; // Good Afternoon  
  } else if (hour >= 17 && hour < 21) {
    return 'Good Evening'; // Good Evening
  } else {
    return 'Good Night'; // Good Night
  }
};

export default function Dashboard() {
  const { goals } = useGoals();
  const { progressData, goalStats } = useAnalytics(30);
  const { logs } = useDailyLogs();
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const todaysLogs = logs.filter(log => log.log_date === today);
  
  // Calculate stats
  const totalGoals = goals.length;
  const todaysCompleted = todaysLogs.filter(log => log.is_completed).length;
  const todaysTotal = todaysLogs.length;
  const todaysCompletionRate = todaysTotal > 0 ? Math.round((todaysCompleted / todaysTotal) * 100) : 0;
  
  // Calculate streak (consecutive days with >0 completion rate)
  const [currentStreak, setCurrentStreak] = useState(0);
  
  useEffect(() => {
    let streak = 0;
    const sortedData = [...progressData].reverse();
    
    for (const day of sortedData) {
      if (day.completion_rate > 0) {
        streak++;
      } else {
        break;
      }
    }
    
    setCurrentStreak(streak);
  }, [progressData]);

  // Get recent achievements (goals with high completion rates)
  const topPerformingGoals = goalStats
    .filter(goal => goal.completion_rate >= 80 && goal.total_logs >= 5)
    .slice(0, 3);

  return (
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {getTimeBasedGreeting()} 👋
          </h1>
          <p className="text-lg text-purple-200">
            See how you're progressing toward your goals
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Active Goals"
            value={totalGoals}
            subtitle="Currently tracking"
            icon={Target}
            color="purple"
          />
          
          <StatsCard
            title="Today's Progress"
            value={`${todaysCompleted}/${todaysTotal}`}
            subtitle={`${todaysCompletionRate}% complete`}
            icon={Calendar}
            color="blue"
          />
          
          <StatsCard
            title="Current Streak"
            value={`${currentStreak} days`}
            subtitle="Keep it up!"
            icon={TrendingUp}
            color="green"
          />
          
          <StatsCard
            title="Top Performer"
            value={topPerformingGoals.length > 0 ? topPerformingGoals[0].title.slice(0, 12) + '...' : 'N/A'}
            subtitle={topPerformingGoals.length > 0 ? `${Math.round(topPerformingGoals[0].completion_rate)}% rate` : 'Complete more goals!'}
            icon={Award}
            color="yellow"
          />
        </div>

        {/* Charts and AI */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Progress Chart */}
          <div className="lg:col-span-2">
            {progressData.length > 0 ? (
              <ProgressChart data={progressData} type="line" height={350} />
            ) : (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-8 text-center">
                <TrendingUp className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Progress Data Yet</h3>
                <p className="text-white/60">Start completing your daily goals to see progress charts!</p>
              </div>
            )}
          </div>

          {/* AI Suggestions */}
          <div>
            <AISuggestionBox />
          </div>
        </div>

        {/* Today's Goals Preview */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Today's Goals</h2>
            <Link
              href="/daily"
              className="flex items-center space-x-1 text-purple-300 hover:text-white transition-colors"
            >
              <span className="text-sm">View all</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {goals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {goals.slice(0, 6).map((goal) => {
                const dailyLog = todaysLogs.find(log => log.goal_id === goal.id);
                return (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    dailyLog={dailyLog}
                    compact={true}
                    showActions={false}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Goals Yet</h3>
              <p className="text-white/60 mb-4">Create your first goal to start tracking progress!</p>
              <Link
                href="/goals"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg hover:from-purple-600 hover:to-blue-700 transition-all"
              >
                <Target className="w-4 h-4" />
                <span>Create Goal</span>
              </Link>
            </div>
          )}
        </div>

        {/* Top Performing Goals */}
        {topPerformingGoals.length > 0 && (
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-lg rounded-xl border border-white/20 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Award className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white">🎉 High Performers</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topPerformingGoals.map((goal, index) => {
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <div key={goal.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{medals[index]}</span>
                      <div>
                        <h3 className="font-semibold text-white">{goal.title}</h3>
                        <p className="text-sm text-green-200">{Math.round(goal.completion_rate)}% completion rate</p>
                      </div>
                    </div>
                    <p className="text-xs text-white/60">
                      Completed {goal.completed_count} out of {goal.total_logs} times
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
  );
}
