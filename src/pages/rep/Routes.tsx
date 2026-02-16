import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repsApi } from '../../services/api/repsApi';
import { MapPin, Clock, CheckCircle, PlayCircle, Users, Navigation, Route } from 'lucide-react';
import type { Route as RouteType, Visit } from '../../types/common.types';

export default function RepRoutes() {
  const queryClient = useQueryClient();

  const { data: routes, isLoading: routesLoading } = useQuery({
    queryKey: ['rep-routes'],
    queryFn: () => repsApi.repGetRoutes().then(r => r.data.data),
  });

  const { data: todayVisits, isLoading: visitsLoading } = useQuery({
    queryKey: ['rep-today-visits'],
    queryFn: () => repsApi.repGetTodayVisits().then(r => r.data.data),
  });

  const checkInMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => repsApi.repCheckIn(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rep-today-visits'] }),
  });

  const checkOutMut = useMutation({
    mutationFn: ({ visitId, data }: { visitId: string; data: Record<string, unknown> }) => repsApi.repCheckOut(visitId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rep-today-visits'] }),
  });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-500 px-5 pt-5 pb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <h1 className="text-white text-xl font-bold">Routes & Visits</h1>
        <p className="text-blue-200 text-sm mt-0.5">Manage your daily route plan</p>
      </div>

      <div className="px-4 space-y-4 -mt-3 pb-6">
        {/* Today's Visits */}
        <div className="card overflow-hidden shadow-lg shadow-slate-200/50">
          <div className="flex items-center gap-2 p-4 pb-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="font-bold text-sm text-slate-800">Today&apos;s Visits</h2>
          </div>
          {visitsLoading ? (
            <div className="p-4 space-y-3">
              {[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
            </div>
          ) : todayVisits && todayVisits.length > 0 ? (
            <div className="p-3 space-y-2">
              {todayVisits.map((visit: Visit) => (
                <div key={visit.id} className="bg-slate-50 rounded-xl p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ring-4 ${
                        visit.status === 'Completed' ? 'bg-emerald-500 ring-emerald-500/10' :
                        visit.checkInTime ? 'bg-blue-500 ring-blue-500/10 animate-pulse' : 'bg-slate-300 ring-slate-300/10'
                      }`} />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{visit.customerName || 'Customer'}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{visit.status}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!visit.checkInTime && visit.status !== 'Completed' && (
                        <button
                          onClick={() => checkInMut.mutate({ customerId: visit.customerId })}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                        >
                          <PlayCircle className="w-3.5 h-3.5" /> Check In
                        </button>
                      )}
                      {visit.checkInTime && !visit.checkOutTime && (
                        <button
                          onClick={() => checkOutMut.mutate({ visitId: visit.id, data: { notes: 'Visit completed' } })}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Check Out
                        </button>
                      )}
                      {visit.status === 'Completed' && (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1.5 rounded-xl">
                          <CheckCircle className="w-3.5 h-3.5" /> Done
                        </span>
                      )}
                    </div>
                  </div>
                  {visit.notes && <p className="text-[11px] text-slate-400 mt-2 ml-5.5">{visit.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <Navigation className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No visits scheduled for today</p>
            </div>
          )}
        </div>

        {/* Assigned Routes */}
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 p-4 pb-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="font-bold text-sm text-slate-800">My Routes</h2>
          </div>
          {routesLoading ? (
            <div className="p-4 space-y-3">
              {[1,2].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
            </div>
          ) : routes && routes.length > 0 ? (
            <div className="p-3 space-y-2">
              {routes.map((route: RouteType) => (
                <div key={route.id} className="bg-slate-50 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-800">{route.name}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${route.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                      {route.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {route.description && <p className="text-[11px] text-slate-400 mb-2">{route.description}</p>}
                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {route.estimatedDurationMinutes} min</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {route.customers?.length || 0} stops</span>
                    <span>{route.daysOfWeek}</span>
                  </div>
                  {route.customers && route.customers.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-200/50 space-y-1.5">
                      {route.customers.map((c) => (
                        <div key={c.id} className="flex items-center gap-2 text-xs">
                          <span className="w-5 h-5 bg-white rounded-lg text-slate-400 flex items-center justify-center text-[10px] font-bold shadow-sm">{c.visitOrder}</span>
                          <span className="text-slate-600">{c.customerName || c.customerId}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <MapPin className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No routes assigned</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
