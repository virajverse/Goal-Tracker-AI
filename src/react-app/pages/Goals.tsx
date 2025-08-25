import { useState } from 'react';
import GoalCard from '@/react-app/components/GoalCard';
import GoalForm from '@/react-app/components/GoalForm';
import StatsCard from '@/react-app/components/StatsCard';
import { useGoals } from '@/react-app/hooks/useGoals';
import { useAnalytics } from '@/react-app/hooks/useAnalytics';
import { Goal, CreateGoal } from '@/shared/types';
import { Plus, Target, TrendingUp, Calendar, Award, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Goals() {
  const { goals, createGoal, updateGoal, deleteGoal } = useGoals();
  const { goalStats } = useAnalytics();
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFrequency, setFilterFrequency] = useState('');

  // Get unique categories and frequencies for filtering
  const categories = [...new Set(goals.map(goal => goal.category).filter(Boolean))];
  const frequencies = ['daily', 'weekly', 'monthly'];

  // Filter goals based on search and filters
  const filteredGoals = goals.filter(goal => {
    const matchesSearch = goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (goal.description && goal.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !filterCategory || goal.category === filterCategory;
    const matchesFrequency = !filterFrequency || goal.target_frequency === filterFrequency;
    
    return matchesSearch && matchesCategory && matchesFrequency;
  });

  // Calculate overview stats
  const totalGoals = goals.length;
  const avgCompletionRate = goalStats.length > 0 
    ? Math.round(goalStats.reduce((sum, goal) => sum + goal.completion_rate, 0) / goalStats.length)
    : 0;
  const topPerformer = goalStats.find(goal => goal.completion_rate === Math.max(...goalStats.map(g => g.completion_rate)));

  const handleCreateGoal = async (goalData: CreateGoal) => {
    try {
      await createGoal(goalData);
      setShowForm(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleEditGoal = async (goalData: CreateGoal) => {
    if (!editingGoal) return;
    
    try {
      await updateGoal({ id: editingGoal.id, ...goalData });
      setEditingGoal(null);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDeleteGoal = async (goalId: number) => {
    if (window.confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
      try {
        await deleteGoal(goalId);
        toast.success('Goal deleted successfully');
      } catch (error) {
        // Error is handled in the hook
      }
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('');
    setFilterFrequency('');
  };

  return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Your Goals</h1>
            <p className="text-lg text-purple-200">
              Manage and track all your personal goals
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white rounded-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>New Goal</span>
          </button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Total Goals"
            value={totalGoals}
            subtitle="Active goals"
            icon={Target}
            color="purple"
          />
          
          <StatsCard
            title="Avg. Completion"
            value={`${avgCompletionRate}%`}
            subtitle="Overall performance"
            icon={TrendingUp}
            color="blue"
          />
          
          <StatsCard
            title="Top Performer"
            value={topPerformer ? topPerformer.title.slice(0, 15) + '...' : 'N/A'}
            subtitle={topPerformer ? `${Math.round(topPerformer.completion_rate)}% success` : 'Complete more goals!'}
            icon={Award}
            color="yellow"
          />
        </div>

        {/* Search and Filters */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4" />
              <input
                type="text"
                placeholder="Search goals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="appearance-none px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="" className="bg-gray-800">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category || ''} className="bg-gray-800">
                    {category}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4 pointer-events-none" />
            </div>

            {/* Frequency Filter */}
            <div className="relative">
              <select
                value={filterFrequency}
                onChange={(e) => setFilterFrequency(e.target.value)}
                className="appearance-none px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="" className="bg-gray-800">All Frequencies</option>
                {frequencies.map(freq => (
                  <option key={freq} value={freq} className="bg-gray-800">
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </option>
                ))}
              </select>
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4 pointer-events-none" />
            </div>

            {/* Clear Filters */}
            {(searchTerm || filterCategory || filterFrequency) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Goals Grid */}
        <div>
          {filteredGoals.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEditGoal={setEditingGoal}
                  onDeleteGoal={handleDeleteGoal}
                  showActions={true}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-12 text-center">
              {goals.length === 0 ? (
                <>
                  <Target className="w-16 h-16 text-white/30 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Goals Yet</h3>
                  <p className="text-white/60 mb-6">
                    Start your journey by creating your first goal. Set clear, achievable targets and track your progress!
                  </p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg hover:from-purple-600 hover:to-blue-700 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Create Your First Goal</span>
                  </button>
                </>
              ) : (
                <>
                  <Search className="w-16 h-16 text-white/30 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Goals Found</h3>
                  <p className="text-white/60 mb-4">
                    Try adjusting your search terms or filters to find what you're looking for.
                  </p>
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                  >
                    <span>Clear Filters</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Goal Creation Form */}
        {showForm && (
          <GoalForm
            onSubmit={handleCreateGoal}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Goal Edit Form */}
        {editingGoal && (
          <GoalForm
            goal={editingGoal}
            onSubmit={handleEditGoal}
            onCancel={() => setEditingGoal(null)}
          />
        )}
      </div>
  );
}
