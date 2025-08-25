import { useState, useEffect } from 'react';
import { Goal, CreateGoal, UpdateGoal } from '@/shared/types';
import { useAuth } from '@/react-app/hooks/useCustomAuth';
import toast from 'react-hot-toast';

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading } = useAuth();
  // Constant-length dependency key: auth loading state + user id
  const depKey = `${isLoading ? '1' : '0'}|${user?.id ?? ''}`;

  const fetchGoals = async () => {
    try {
      // If not authenticated, treat as empty goals without error
      if (!user) {
        setGoals([]);
        setError(null);
        return;
      }
      setLoading(true);
      const response = await fetch('/api/goals');
      let data: any = null;
      try {
        data = await response.json();
      } catch {}
      if (!response.ok) {
        const msg = (data && data.error) || 'Failed to fetch goals';
        // Silently handle unauthorized (e.g., expired session)
        if (response.status === 401 || msg === 'Unauthorized') {
          setGoals([]);
          setError(null);
          return;
        }
        throw new Error(msg);
      }
      setGoals((data && data.goals) || []);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async (goalData: CreateGoal) => {
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(goalData),
      });
      let data: any = null;
      try {
        data = await response.json();
      } catch {}
      if (!response.ok) {
        const msg = (data && data.error) || 'Failed to create goal';
        throw new Error(msg);
      }
      setGoals(prev => [data.goal, ...prev]);
      toast.success('Goal created successfully!');
      return data.goal;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create goal';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateGoal = async (goalData: UpdateGoal) => {
    try {
      const response = await fetch(`/api/goals/${goalData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(goalData),
      });
      let data: any = null;
      try {
        data = await response.json();
      } catch {}
      if (!response.ok) {
        const msg = (data && data.error) || 'Failed to update goal';
        throw new Error(msg);
      }
      setGoals(prev => prev.map(goal => 
        goal.id === goalData.id ? data.goal : goal
      ));
      toast.success('Goal updated successfully!');
      return data.goal;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update goal';
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteGoal = async (goalId: number) => {
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: 'DELETE',
      });
      let data: any = null;
      try {
        data = await response.json();
      } catch {}
      if (!response.ok) {
        const msg = (data && data.error) || 'Failed to delete goal';
        throw new Error(msg);
      }
      setGoals(prev => prev.filter(goal => goal.id !== goalId));
      toast.success('Goal deleted successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete goal';
      toast.error(errorMessage);
      throw err;
    }
  };

  useEffect(() => {
    if (isLoading) return; // wait for auth resolution
    fetchGoals();
  }, [depKey]);

  return {
    goals,
    loading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    refetch: fetchGoals,
  };
}
