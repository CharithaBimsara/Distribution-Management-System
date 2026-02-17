import { useQuery } from '@tanstack/react-query';
import { repsApi } from '../../services/api/repsApi';
import { formatCurrency } from '../../utils/formatters';
import { TrendingUp, Target, Users, ShoppingCart, Trophy, Crown, Medal, Award } from 'lucide-react';
import type { RepPerformance, SalesTarget } from '../../types/common.types';

export default function RepPerformancePage() {
  const { data: performance } = useQuery({
    queryKey: ['rep-performance'],
    queryFn: () => repsApi.repGetPerformance().then(r => r.data.data),
  });

  const { data: targets } = useQuery({
    queryKey: ['rep-targets'],
    queryFn: () => repsApi.repGetTargets().then(r => r.data.data),
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['rep-leaderboard'],
    queryFn: () => repsApi.repGetLeaderboard().then(r => r.data.data),
  });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-5 pt-5 pb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="relative">
          <h1 className="text-white text-xl font-bold">My Performance</h1>
          <p className="text-emerald-200 text-sm mt-0.5">Track your achievements</p>
        </div>
      </div>

      <div className="px-4 space-y-4 -mt-5 pb-6">
        {/* Stats Cards */}
        {performance && (
          <div className="grid grid-cols-2 gap-2.5 stagger-children">
            {[
              { label: 'Total Sales', value: formatCurrency(performance.totalSales), icon: TrendingUp, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
              { label: 'Orders', value: performance.totalOrders, icon: ShoppingCart, gradient: 'from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-400/20' },
              { label: 'Customers', value: performance.totalCustomers, icon: Users, gradient: 'from-emerald-300 to-emerald-500', shadow: 'shadow-emerald-300/20' },
              { label: 'Target', value: `${performance.achievementPercentage.toFixed(0)}%`, icon: Target, gradient: 'from-emerald-600 to-emerald-700', shadow: 'shadow-emerald-600/20' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-lg shadow-slate-200/50">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3 shadow-lg ${stat.shadow}`}>
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Targets */}
        {targets && targets.length > 0 && (
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 p-4 pb-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Target className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="font-bold text-sm text-slate-800">Active Targets</h2>
            </div>
            <div className="p-3 space-y-2">
              {targets.map((target: SalesTarget) => (
                <div key={target.id} className="bg-slate-50 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-800">{target.targetPeriod}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      target.status === 'Achieved' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-50 text-emerald-600'
                    }`}>{target.status}</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        (target.achievedAmount / target.targetAmount * 100) >= 100
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                          : 'bg-gradient-to-r from-emerald-300 to-emerald-600'
                      }`}
                      style={{ width: `${Math.min(100, target.achievedAmount / target.targetAmount * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                    <span>{formatCurrency(target.achievedAmount)}</span>
                    <span>{formatCurrency(target.targetAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {leaderboard && leaderboard.length > 0 && (
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 p-4 pb-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Trophy className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="font-bold text-sm text-slate-800">Leaderboard</h2>
            </div>
            <div className="p-3 space-y-1">
              {leaderboard.map((rep: RepPerformance, i: number) => {
                const isMe = rep.repName === performance?.repName;
                return (
                  <div key={rep.repId} className={`flex items-center gap-3 p-2.5 rounded-xl transition ${isMe ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'hover:bg-slate-50'}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      i === 0 ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/20' :
                      i === 1 ? 'bg-gradient-to-br from-emerald-200 to-emerald-300 text-emerald-700' :
                      i === 2 ? 'bg-gradient-to-br from-emerald-300 to-emerald-500 text-white' :
                      'bg-slate-100 text-slate-500'
                    }`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isMe ? 'text-emerald-700' : 'text-slate-800'}`}>
                        {rep.repName} {isMe && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full ml-1">You</span>}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-slate-800">{formatCurrency(rep.totalSales)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
