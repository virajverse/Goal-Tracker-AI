import { useState, useEffect } from 'react';
import { useAuth } from '@/react-app/hooks/useCustomAuth';
import { DailyLog, CreateDailyLog, UpdateDailyLog } from '@/shared/types';
import toast from 'react-hot-toast';

export function useDailyLogs(date?: string) {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading } = useAuth();
  // Constant-length dependency key: auth loading state + user id + date
  const depKey = `${isLoading ? '1' : '0'}|${user?.id ?? ''}|${date ?? ''}`;

  const fetchLogs = async () => {
    try {
      // If not authenticated, treat as empty logs without error
      if (!user) {
        setLogs([]);
        setError(null);
        return;
      }
      setLoading(true);
      const url = date ? `/api/daily-logs?date=${date}` : '/api/daily-logs';
      const response = await fetch(url);
      let data: any = null;
      try {
        data = await response.json();
      } catch {}
      if (!response.ok) {
        const msg = (data && data.error) || 'Failed to fetch daily logs';
        if (response.status === 401 || msg === 'Unauthorized') {
          setLogs([]);
          setError(null);
          return;
        }
        throw new Error(msg);
      }
      setLogs(data.logs);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createOrUpdateLog = async (logData: CreateDailyLog) => {
    try {
      const response = await fetch('/api/daily-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save daily log');
      }
      
      const data = await response.json();
      
      // Update or add log in state
      setLogs(prev => {
        const existingIndex = prev.findIndex(log => 
          log.goal_id === data.log.goal_id && log.log_date === data.log.log_date
        );
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = data.log;
          return updated;
        } else {
          return [...prev, data.log];
        }
      });
      
      return data.log;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save daily log';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateLog = async (logData: UpdateDailyLog) => {
    try {
      const response = await fetch(`/api/daily-logs/${logData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update daily log');
      }
      
      const data = await response.json();
      setLogs(prev => prev.map(log => 
        log.id === logData.id ? data.log : log
      ));
      return data.log;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update daily log';
      toast.error(errorMessage);
      throw err;
    }
  };

  useEffect(() => {
    if (isLoading) return; // wait for auth resolution
    fetchLogs();
  }, [depKey]);

  return {
    logs,
    loading,
    error,
    createOrUpdateLog,
    updateLog,
    refetch: fetchLogs,
  };
}
