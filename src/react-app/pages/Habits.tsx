'use client';

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/react-app/hooks/useCustomAuth';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Habit = {
  id: number;
  user_id: string;
  name: string;
  habit_type: 'good' | 'bad';
  frequency: 'daily' | 'weekly' | 'monthly';
  is_active: boolean;
  created_at: string;
};

type AggStats = {
  start: string;
  end: string;
  bucket: 'daily' | 'weekly' | 'monthly';
  type: 'all' | 'good' | 'bad';
  series: { date: string; done: number }[];
  total: number;
};

export default function Habits() {
  const { user, isLoading } = useAuth();
  const [items, setItems] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<string>('');
  const [active, setActive] = useState<string>('true');

  // create form
  const [name, setName] = useState('');
  const [habitType, setHabitType] = useState<'good' | 'bad'>('good');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // aggregated stats controls
  const [bucket, setBucket] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [aggType, setAggType] = useState<'all' | 'good' | 'bad'>('all');
  const [agg, setAgg] = useState<AggStats | null>(null);

  // per-habit indicators
  const [todayMap, setTodayMap] = useState<Record<number, boolean>>({});
  const [streakMap, setStreakMap] = useState<Record<number, number>>({});
  const todayStr = useMemo(() => {
    const t = new Date();
    const yyyy = t.getUTCFullYear();
    const mm = String(t.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(t.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const canFetch = useMemo(() => !isLoading && !!user, [isLoading, user]);

  useEffect(() => {
    if (!canFetch) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetch, type, active]);

  useEffect(() => {
    if (!canFetch) return;
    void loadAgg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetch, bucket, range, aggType]);

  async function load() {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (type) qs.set('type', type);
      if (active) qs.set('active', active);
      const res = await fetch(`/api/habits${qs.toString() ? `?${qs.toString()}` : ''}`);
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      const list: Habit[] = json.habits || [];
      setItems(list);
      // refresh per-habit indicators
      if (list.length) await loadTodayAndStreak(list);
    } catch {}
    finally { setLoading(false); }
  }

  async function loadAgg() {
    try {
      const qs = new URLSearchParams();
      qs.set('bucket', bucket);
      qs.set('range', range);
      if (aggType === 'good' || aggType === 'bad') qs.set('type', aggType);
      const res = await fetch(`/api/habits/stats?${qs.toString()}`);
      const json = await res.json();
      if (res.ok) setAgg(json);
    } catch {}
  }

  async function loadTodayAndStreak(list: Habit[]) {
    try {
      // Fetch in parallel
      await Promise.all(list.map(async (h) => {
        const id = h.id;
        try {
          // today status
          const resT = await fetch(`/api/habits/${id}/logs?start=${todayStr}&end=${todayStr}`);
          const jt = await resT.json();
          if (resT.ok) {
            const isDone = Boolean((jt.logs || []).find((l: any) => l.log_date === todayStr)?.is_done);
            setTodayMap(prev => ({ ...prev, [id]: isDone }));
          }
        } catch {}

        try {
          // streak (daily, 90d window)
          const resS = await fetch(`/api/habits/${id}/stats?bucket=${h.frequency}&range=90d`);
          const js = await resS.json();
          if (resS.ok && typeof js.streak === 'number') {
            setStreakMap(prev => ({ ...prev, [id]: js.streak as number }));
          }
        } catch {}
      }));
    } catch {}
  }

  async function createHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { toast.error('Please login to create a habit'); return; }
    try {
      setLoading(true);
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, habit_type: habitType, frequency }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Create failed');
      toast.success('Habit created');
      setName(''); setHabitType('good'); setFrequency('daily');
      await Promise.all([load(), loadAgg()]);
    } catch (e: any) { toast.error(e?.message || 'Failed to create'); }
    finally { setLoading(false); }
  }

  async function markToday(id: number, done: boolean) {
    if (!user) { toast.error('Please login'); return; }
    try {
      const date = todayStr;
      const res = await fetch(`/api/habits/${id}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, is_done: done }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      toast.success(done ? 'Marked done' : 'Unmarked');
      // Update indicators and agg
      setTodayMap(prev => ({ ...prev, [id]: done }));
      try {
        const h = items.find(i => i.id === id);
        const bucket = h?.frequency || 'daily';
        const resS = await fetch(`/api/habits/${id}/stats?bucket=${bucket}&range=90d`);
        const js = await resS.json();
        if (resS.ok && typeof js.streak === 'number') setStreakMap(prev => ({ ...prev, [id]: js.streak as number }));
      } catch {}
      await loadAgg();
    } catch (e: any) { toast.error(e?.message || 'Failed to update'); }
  }

  async function toggleActive(habit: Habit) {
    if (!user) { toast.error('Please login'); return; }
    try {
      setLoading(true);
      const res = await fetch(`/api/habits/${habit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !habit.is_active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Update failed');
      await load();
    } catch (e: any) { toast.error(e?.message || 'Failed to update'); }
    finally { setLoading(false); }
  }

  async function removeHabit(id: number) {
    if (!user) { toast.error('Please login'); return; }
    try {
      setLoading(true);
      const res = await fetch(`/api/habits/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Delete failed');
      toast.success('Deleted');
      await Promise.all([load(), loadAgg()]);
    } catch (e: any) { toast.error(e?.message || 'Failed to delete'); }
    finally { setLoading(false); }
  }

  const chartData = useMemo(() => (agg?.series || []).map(s => ({ date: s.date, value: s.done })), [agg]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-white">Habits</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm text-purple-200 mb-1">Type</label>
          <select className="bg-white/10 text-white px-3 py-2 rounded-lg" value={type}
            onChange={(e) => setType(e.target.value)}>
            <option value="">All</option>
            <option value="good">Good</option>
            <option value="bad">Bad</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-purple-200 mb-1">Active</label>
          <select className="bg-white/10 text-white px-3 py-2 rounded-lg" value={active}
            onChange={(e) => setActive(e.target.value)}>
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Create form */}
      <form onSubmit={createHabit} className="bg-white/10 rounded-xl p-4 space-y-3">
        <div className="grid md:grid-cols-3 gap-3">
          <input placeholder="Habit name" className="bg-white/10 text-white px-3 py-2 rounded-lg" value={name} onChange={(e)=>setName(e.target.value)} />
          <select className="bg-white/10 text-white px-3 py-2 rounded-lg" value={habitType} onChange={(e)=>setHabitType(e.target.value as any)}>
            <option value="good">Good</option>
            <option value="bad">Bad</option>
          </select>
          <select className="bg-white/10 text-white px-3 py-2 rounded-lg" value={frequency} onChange={(e)=>setFrequency(e.target.value as any)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <button disabled={loading} className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60">{loading ? 'Saving...' : 'Add Habit'}</button>
      </form>

      {/* List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((h) => (
          <div key={h.id} className="bg-white/10 rounded-xl p-4 space-y-2 border border-white/10">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-white font-semibold">{h.name}</h3>
                <p className="text-xs text-purple-200">{h.habit_type} • {h.frequency}</p>
              </div>
              <div className={`text-xs px-2 py-1 rounded ${h.is_active ? 'bg-green-500/20 text-green-200' : 'bg-white/10 text-purple-200'}`}>{h.is_active ? 'Active' : 'Inactive'}</div>
            </div>
            <div className="flex gap-2 text-xs">
              <span className={`px-2 py-1 rounded ${todayMap[h.id] ? 'bg-green-500/20 text-green-200' : 'bg-white/10 text-purple-200'}`}>
                Today: {todayMap[h.id] ? 'Done' : 'Not done'}
              </span>
              <span className="px-2 py-1 rounded bg-white/10 text-purple-200">
                Streak: {streakMap[h.id] ?? 0}
              </span>
            </div>
            <div className="flex gap-2 justify-end text-sm">
              <button onClick={() => markToday(h.id, true)} className="px-2 py-1 bg-white/10 text-white rounded hover:bg-white/20">Mark Done Today</button>
              <button onClick={() => markToday(h.id, false)} className="px-2 py-1 bg-white/10 text-white rounded hover:bg-white/20">Unmark Today</button>
              <button onClick={() => toggleActive(h)} className="px-2 py-1 bg-white/10 text-white rounded hover:bg-white/20">{h.is_active ? 'Deactivate' : 'Activate'}</button>
              <button onClick={() => removeHabit(h.id)} className="px-2 py-1 bg-red-600/70 text-white rounded hover:bg-red-600">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Aggregated Stats */}
      <div className="bg-white/10 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm text-purple-200 mb-1">Bucket</label>
            <select className="bg-white/10 text-white px-3 py-2 rounded-lg" value={bucket} onChange={(e)=>setBucket(e.target.value as any)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-purple-200 mb-1">Range</label>
            <select className="bg-white/10 text-white px-3 py-2 rounded-lg" value={range} onChange={(e)=>setRange(e.target.value as any)}>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-purple-200 mb-1">Type</label>
            <select className="bg-white/10 text-white px-3 py-2 rounded-lg" value={aggType} onChange={(e)=>setAggType(e.target.value as any)}>
              <option value="all">All</option>
              <option value="good">Good</option>
              <option value="bad">Bad</option>
            </select>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="date" stroke="#ddd" tick={{ fill: '#ddd', fontSize: 12 }} />
              <YAxis stroke="#ddd" tick={{ fill: '#ddd', fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', color: '#f9fafb' }} />
              <Bar dataKey="value" fill="#34d399" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {!user && !isLoading && (<p className="text-purple-200">Login to create and view your habits.</p>)}
    </div>
  );
}
