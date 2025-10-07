import { useState, useEffect, useCallback } from "react";

interface ProgressData {
  log_date: string;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
}

interface GoalStats {
  id: number;
  title: string;
  category: string;
  target_frequency: string;
  total_logs: number;
  completed_count: number;
  completion_rate: number;
}

interface ProgressResponseJson {
  progress?: ProgressData[];
  error?: unknown;
}
interface GoalStatsResponseJson {
  goalStats?: GoalStats[];
  error?: unknown;
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error?: unknown }).error;
    if (typeof err === "string") return err;
  }
  return fallback;
}

function extractProgress(data: unknown): ProgressData[] {
  if (data && typeof data === "object" && "progress" in data) {
    const p = (data as ProgressResponseJson).progress;
    if (Array.isArray(p)) return p;
  }
  return [];
}

function extractGoalStats(data: unknown): GoalStats[] {
  if (data && typeof data === "object" && "goalStats" in data) {
    const g = (data as GoalStatsResponseJson).goalStats;
    if (Array.isArray(g)) return g;
  }
  return [];
}

export function useAnalytics(days = 30): {
  progressData: ProgressData[];
  goalStats: GoalStats[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [goalStats, setGoalStats] = useState<GoalStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);

      // Fetch progress data
      const progressResponse = await fetch(
        `/api/analytics/progress?days=${String(days)}`,
      );
      if (!progressResponse.ok) {
        let pdata: unknown = null;
        try {
          pdata = await progressResponse.json();
        } catch {
          /* ignore json parse errors */
        }
        const msg = extractErrorMessage(pdata, "Failed to fetch progress data");
        throw new Error(msg);
      }
      let pjson: unknown = null;
      try {
        pjson = await progressResponse.json();
      } catch {
        /* ignore json parse errors */
      }
      setProgressData(extractProgress(pjson));

      // Fetch goal statistics
      const goalsResponse = await fetch("/api/analytics/goals");
      if (!goalsResponse.ok) {
        let gdata: unknown = null;
        try {
          gdata = await goalsResponse.json();
        } catch {
          /* ignore json parse errors */
        }
        const msg = extractErrorMessage(
          gdata,
          "Failed to fetch goal statistics",
        );
        throw new Error(msg);
      }
      let gjson: unknown = null;
      try {
        gjson = await goalsResponse.json();
      } catch {
        /* ignore json parse errors */
      }
      setGoalStats(extractGoalStats(gjson));

      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch analytics";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    progressData,
    goalStats,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}
