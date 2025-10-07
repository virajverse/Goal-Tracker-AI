import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/react-app/hooks/useCustomAuth";
import type { DailyLog, CreateDailyLog, UpdateDailyLog } from "@/shared/types";
import toast from "react-hot-toast";

interface ApiErrorJson {
  error?: unknown;
}
interface DailyLogsResponseJson {
  logs?: DailyLog[];
}
interface LogResponseJson {
  log?: DailyLog;
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as ApiErrorJson).error;
    if (typeof err === "string") return err;
  }
  return fallback;
}

function extractLogs(data: unknown): DailyLog[] {
  if (data && typeof data === "object" && "logs" in data) {
    const logs = (data as DailyLogsResponseJson).logs;
    if (Array.isArray(logs)) return logs;
  }
  return [];
}

function extractLog(data: unknown): DailyLog | null {
  if (data && typeof data === "object" && "log" in data) {
    const log = (data as LogResponseJson).log;
    if (log && typeof log === "object") return log;
  }
  return null;
}

export function useDailyLogs(date?: string): {
  logs: DailyLog[];
  loading: boolean;
  error: string | null;
  createOrUpdateLog: (logData: CreateDailyLog) => Promise<DailyLog>;
  updateLog: (logData: UpdateDailyLog) => Promise<DailyLog>;
  refetch: () => Promise<void>;
} {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading } = useAuth();
  // Constant-length dependency key removed; useCallback handles deps

  const fetchLogs = useCallback(async (): Promise<void> => {
    try {
      // If not authenticated, treat as empty logs without error
      if (!user) {
        setLogs([]);
        setError(null);
        return;
      }
      setLoading(true);
      const url = date ? `/api/daily-logs?date=${date}` : "/api/daily-logs";
      const response = await fetch(url);
      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        /* ignore json parse errors */
      }
      if (!response.ok) {
        const msg = extractErrorMessage(data, "Failed to fetch daily logs");
        if (response.status === 401 || msg === "Unauthorized") {
          setLogs([]);
          setError(null);
          return;
        }
        throw new Error(msg);
      }
      setLogs(extractLogs(data));
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, date]);

  const createOrUpdateLog = async (
    logData: CreateDailyLog,
  ): Promise<DailyLog> => {
    try {
      const response = await fetch("/api/daily-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(logData),
      });

      if (!response.ok) {
        // Try to read error JSON safely
        let data: unknown = null;
        try {
          data = await response.json();
        } catch {
          /* ignore json parse errors */
        }
        const msg = extractErrorMessage(data, "Failed to save daily log");
        throw new Error(msg);
      }

      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        /* ignore json parse errors */
      }
      const saved = extractLog(data);
      if (!saved) throw new Error("Invalid server response");

      // Update or add log in state
      setLogs((prev) => {
        const existingIndex = prev.findIndex(
          (log) =>
            log.goal_id === saved.goal_id && log.log_date === saved.log_date,
        );

        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = saved;
          return updated;
        } else {
          return [...prev, saved];
        }
      });

      return saved;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save daily log";
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateLog = async (logData: UpdateDailyLog): Promise<DailyLog> => {
    try {
      const response = await fetch(`/api/daily-logs/${String(logData.id)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(logData),
      });

      if (!response.ok) {
        let data: unknown = null;
        try {
          data = await response.json();
        } catch {
          /* ignore json parse errors */
        }
        const msg = extractErrorMessage(data, "Failed to update daily log");
        throw new Error(msg);
      }

      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        /* ignore json parse errors */
      }
      const updated = extractLog(data);
      if (!updated) throw new Error("Invalid server response");
      setLogs((prev) =>
        prev.map((log) => (log.id === logData.id ? updated : log)),
      );
      return updated;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update daily log";
      toast.error(errorMessage);
      throw err;
    }
  };

  useEffect(() => {
    if (isLoading) return; // wait for auth resolution
    void fetchLogs();
  }, [fetchLogs, isLoading]);

  return {
    logs,
    loading,
    error,
    createOrUpdateLog,
    updateLog,
    refetch: fetchLogs,
  };
}
