import { useState, useEffect, useCallback } from "react";
import type { Goal, CreateGoal, UpdateGoal } from "@/shared/types";
import { useAuth } from "@/react-app/hooks/useCustomAuth";
import toast from "react-hot-toast";

interface ApiErrorJson {
  error?: unknown;
}
interface GoalsResponseJson {
  goals?: Goal[];
}
interface GoalResponseJson {
  goal?: Goal;
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as ApiErrorJson).error;
    if (typeof err === "string") return err;
  }
  return fallback;
}

function extractGoals(data: unknown): Goal[] {
  if (data && typeof data === "object" && "goals" in data) {
    const g = (data as GoalsResponseJson).goals;
    if (Array.isArray(g)) return g;
  }
  return [];
}

function extractGoal(data: unknown): Goal | null {
  if (data && typeof data === "object" && "goal" in data) {
    const g = (data as GoalResponseJson).goal;
    if (g && typeof g === "object") return g;
  }
  return null;
}

export function useGoals(): {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  createGoal: (goalData: CreateGoal) => Promise<Goal>;
  updateGoal: (goalData: UpdateGoal) => Promise<Goal>;
  deleteGoal: (goalId: number) => Promise<void>;
  refetch: () => Promise<void>;
} {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading } = useAuth();

  const fetchGoals = useCallback(async (): Promise<void> => {
    try {
      // If not authenticated, treat as empty goals without error
      if (!user) {
        setGoals([]);
        setError(null);
        return;
      }
      setLoading(true);
      const response = await fetch("/api/goals");
      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        /* ignore json parse errors */
      }
      if (!response.ok) {
        const msg = extractErrorMessage(data, "Failed to fetch goals");
        // Silently handle unauthorized (e.g., expired session)
        if (response.status === 401 || msg === "Unauthorized") {
          setGoals([]);
          setError(null);
          return;
        }
        throw new Error(msg);
      }
      setGoals(extractGoals(data));
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createGoal = async (goalData: CreateGoal): Promise<Goal> => {
    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(goalData),
      });
      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        /* ignore json parse errors */
      }
      if (!response.ok) {
        const msg = extractErrorMessage(data, "Failed to create goal");
        throw new Error(msg);
      }
      const newGoal = extractGoal(data);
      if (!newGoal) {
        throw new Error("Invalid server response");
      }
      setGoals((prev) => [newGoal, ...prev]);
      toast.success("Goal created successfully!");
      return newGoal;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create goal";
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateGoal = async (goalData: UpdateGoal): Promise<Goal> => {
    try {
      const response = await fetch(`/api/goals/${String(goalData.id)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(goalData),
      });
      let data: unknown = null;
      try {
        data = await response.json();
      } catch { /* ignore json parse errors */ }
      if (!response.ok) {
        const msg = extractErrorMessage(data, "Failed to update goal");
        throw new Error(msg);
      }
      const updated = extractGoal(data);
      if (!updated) {
        throw new Error("Invalid server response");
      }
      setGoals((prev) =>
        prev.map((goal) => (goal.id === goalData.id ? updated : goal)),
      );
      toast.success("Goal updated successfully!");
      return updated;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update goal";
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteGoal = async (goalId: number): Promise<void> => {
    try {
      const response = await fetch(`/api/goals/${String(goalId)}`, {
        method: "DELETE",
      });
      let data: unknown = null;
      try {
        data = await response.json();
      } catch { /* ignore json parse errors */ }
      if (!response.ok) {
        const msg = extractErrorMessage(data, "Failed to delete goal");
        throw new Error(msg);
      }
      setGoals((prev) => prev.filter((goal) => goal.id !== goalId));
      toast.success("Goal deleted successfully!");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete goal";
      toast.error(errorMessage);
      throw err;
    }
  };

  useEffect(() => {
    if (isLoading) return; // wait for auth resolution
    void fetchGoals();
  }, [fetchGoals, isLoading]);

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
