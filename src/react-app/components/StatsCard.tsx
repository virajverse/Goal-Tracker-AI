import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'purple' | 'blue' | 'green' | 'yellow' | 'red';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = 'purple',
  trend 
}: StatsCardProps) {
  const colorClasses = {
    purple: 'from-purple-500 to-purple-600 text-purple-100',
    blue: 'from-blue-500 to-blue-600 text-blue-100',
    green: 'from-green-500 to-green-600 text-green-100',
    yellow: 'from-yellow-500 to-yellow-600 text-yellow-100',
    red: 'from-red-500 to-red-600 text-red-100',
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-white/70 mb-1">{title}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-bold text-white">{value}</p>
            {trend && (
              <span className={`text-sm font-medium ${
                trend.isPositive ? 'text-green-400' : 'text-red-400'
              }`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-white/60 mt-1">{subtitle}</p>
          )}
        </div>
        
        <div className={`w-12 h-12 bg-gradient-to-br ${colorClasses[color]} rounded-xl flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
