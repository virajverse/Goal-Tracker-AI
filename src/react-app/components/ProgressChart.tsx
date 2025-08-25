import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, parseISO } from 'date-fns';

interface ProgressData {
  log_date: string;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
}

interface ProgressChartProps {
  data: ProgressData[];
  type?: 'line' | 'bar';
  height?: number;
}

export default function ProgressChart({ data, type = 'line', height = 300 }: ProgressChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    date: format(parseISO(item.log_date), 'MMM dd'),
    completionRate: Math.round(item.completion_rate || 0),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/90 backdrop-blur-sm border border-white/20 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-700">
            Completed: {data.completed_tasks}/{data.total_tasks} tasks
          </p>
          <p className="text-sm text-gray-700">
            Rate: {data.completionRate}%
          </p>
        </div>
      );
    }
    return null;
  };

  if (type === 'bar') {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Daily Completion Rate</h3>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="date" 
              stroke="rgba(255,255,255,0.7)"
              fontSize={12}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.7)"
              fontSize={12}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="completionRate" 
              fill="url(#colorGradient)" 
              radius={[4, 4, 0, 0]}
            />
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.8}/>
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Progress Trend</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey="date" 
            stroke="rgba(255,255,255,0.7)"
            fontSize={12}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.7)"
            fontSize={12}
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="completionRate" 
            stroke="#8b5cf6" 
            strokeWidth={3}
            dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
