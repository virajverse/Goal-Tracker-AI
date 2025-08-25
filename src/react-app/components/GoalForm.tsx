import React, { useState } from 'react';
import { Goal, CreateGoal } from '@/shared/types';
import { X, Target } from 'lucide-react';

interface GoalFormProps {
  goal?: Goal;
  onSubmit: (goalData: CreateGoal) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function GoalForm({ goal, onSubmit, onCancel, loading = false }: GoalFormProps) {
  const [formData, setFormData] = useState({
    title: goal?.title || '',
    description: goal?.description || '',
    category: goal?.category || '',
    target_frequency: goal?.target_frequency || 'daily',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      category: formData.category.trim() || undefined,
      target_frequency: formData.target_frequency as 'daily' | 'weekly' | 'monthly',
    });
  };

  const categories = [
    'Health & Fitness',
    'Learning & Education',
    'Career & Work',
    'Personal Development',
    'Hobbies & Interests',
    'Social & Relationships',
    'Finance & Money',
    'Creativity & Art',
    'Other',
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              {goal ? 'Edit Goal' : 'Create New Goal'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Goal Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Exercise for 30 minutes"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description of your goal"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              rows={2}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="" className="bg-gray-800">Select a category</option>
              {categories.map((category) => (
                <option key={category} value={category} className="bg-gray-800">
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Target Frequency *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['daily', 'weekly', 'monthly'].map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setFormData({ ...formData, target_frequency: freq })}
                  className={`py-2 px-3 text-sm font-medium rounded-lg transition-all ${
                    formData.target_frequency === freq
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title.trim()}
              className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-medium rounded-lg transition-all"
            >
              {loading ? 'Saving...' : goal ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
