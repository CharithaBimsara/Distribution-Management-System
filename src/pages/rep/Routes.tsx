// @ts-nocheck
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { repsApi } from '../../services/api/repsApi';
import { useNavigate } from 'react-router-dom';
import { MapPin, Users, Phone, ChevronRight, Route, CalendarDays, Timer } from 'lucide-react';

export default function RepRoutes() {
  const navigate = useNavigate();
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['rep-profile'],
    queryFn: () => repsApi.repGetProfile().then(r => (r.data as any).data),
  });

  const { data: routesData, isLoading: routesLoading } = useQuery({
    queryKey: ['rep-routes'],
    queryFn: () => repsApi.repGetRoutes().then(r => (r.data as any).data || []),
  });

  const isLoading = profileLoading || routesLoading;
  const routes = routesData || [];

  const todaysDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const selectedRoute = useMemo(() => {
    if (selectedRouteId) return routes.find((r: any) => r.id === selectedRouteId) || null;
    return routes[0] || null;
  }, [routes, selectedRouteId]);

  const customers = selectedRoute?.customers || [];
  const regionLabel = profile?.coordinatorRegionName || profile?.regionName || 'Region not set';

  return (
    <div className="animate-fade-in">
      <div className="bg-gradient-to-br from-emerald-700 via-teal-600 to-cyan-700 px-4 md:px-6 pt-5 md:pt-6 pb-10 md:pb-12 relative overflow-hidden">
        <div className="absolute -top-10 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 left-0 w-36 h-36 bg-emerald-200/20 rounded-full blur-3xl" />
        <div className="relative">
          <p className="text-emerald-100/90 text-xs md:text-sm tracking-wide uppercase font-semibold">Field Coverage</p>
          <h1 className="text-white text-2xl md:text-[28px] leading-tight font-bold mt-1">My Routes</h1>
          <p className="text-emerald-100 text-sm mt-1">View assigned routes and route customers in one place.</p>

          <div className="grid grid-cols-2 gap-2.5 mt-4 md:mt-5 lg:hidden">
            <div className="rounded-xl bg-white/15 border border-white/20 backdrop-blur px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-emerald-100">Customers</p>
              <p className="text-white text-base font-bold mt-0.5">{customers.length}</p>
            </div>
            <div className="rounded-xl bg-white/15 border border-white/20 backdrop-blur px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-emerald-100">Region</p>
              <p className="text-white text-sm font-semibold mt-0.5 truncate">{regionLabel}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-0 -mt-6 md:-mt-8 pb-8 space-y-4 relative z-10">
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 p-4 md:p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Route className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              {profileLoading ? (
                <div className="h-5 w-36 bg-slate-100 rounded-lg animate-pulse" />
              ) : regionLabel ? (
                <>
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Coordinator Region</p>
                  <p className="text-base md:text-lg font-bold text-slate-900 truncate">{regionLabel}</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">Current day: {todaysDay}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-700">No Region Assigned</p>
                  <p className="text-xs text-slate-400">Contact your coordinator</p>
                </>
              )}

              <div className="hidden md:grid md:grid-cols-2 gap-2 mt-3">
                <InfoChip icon={Users} label="Route Customers" value={String(customers.length)} />
                <InfoChip icon={MapPin} label="Region" value={regionLabel || 'Not set'} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl md:text-3xl font-bold text-slate-900">{routes.length}</p>
              <p className="text-[11px] text-slate-400">Assigned Routes</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 p-4 md:p-5 border-b border-slate-100 bg-slate-50/70">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Route className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="font-bold text-sm md:text-base text-slate-800">Assigned Routes</h2>
          </div>

          {isLoading ? (
            <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2].map(i => (
                <div key={i} className="h-20 bg-slate-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : routes.length === 0 ? (
            <div className="p-8 text-center">
              <Route className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No routes assigned yet.</p>
            </div>
          ) : (
            <div className="p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {routes.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRouteId(r.id)}
                  className={`text-left rounded-xl border p-3.5 transition ${selectedRoute?.id === r.id ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <p className="text-sm font-bold text-slate-900 truncate">{r.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{r.description || 'No description'}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600">
                    <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{(r.customers || []).length}</span>
                    <span className="inline-flex items-center gap-1"><Timer className="w-3 h-3" />{r.estimatedDurationMinutes || 0}m</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{(r.daysOfWeek || []).join(', ') || 'No schedule'}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 p-4 md:p-5 md:pb-4 border-b border-slate-100 bg-slate-50/70">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <CalendarDays className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="font-bold text-sm md:text-base text-slate-800">Route Details</h2>
            {selectedRoute && <span className="ml-auto text-xs text-slate-400 truncate max-w-[45%]">{selectedRoute.name}</span>}
          </div>

          {isLoading ? (
            <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-slate-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !selectedRoute ? (
            <div className="p-8 text-center">
              <Route className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Select a route to view details.</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No customers assigned to this route yet.</p>
            </div>
          ) : (
            <div className="p-3 md:p-4 lg:p-0 grid grid-cols-1 md:grid-cols-2 gap-3 lg:block lg:divide-y lg:divide-slate-50">
              {customers.map((c: any, i: number) => (
                <button
                  key={c.customerId}
                  onClick={() => navigate(`/rep/customers/${c.customerId}`)}
                  className="w-full flex items-center gap-3 p-3.5 md:p-4 rounded-xl lg:rounded-none border border-slate-200 lg:border-0 hover:bg-slate-50/70 transition text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-emerald-700 text-sm font-bold flex-shrink-0">
                    {c.visitOrder || i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm md:text-[15px] font-semibold text-slate-800 truncate">
                      {c.shopName || c.customerName}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                      {c.visitFrequency && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {c.visitFrequency}
                        </span>
                      )}
                      {c.latitude && c.longitude && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          Mapped
                        </span>
                      )}
                      {c.phoneNumber && (
                        <span className="flex items-center gap-0.5">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          {c.phoneNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoChip({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-1.5 text-slate-500">
        <Icon className="w-3.5 h-3.5" />
        <p className="text-[10px] uppercase tracking-wide font-semibold">{label}</p>
      </div>
      <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{value}</p>
    </div>
  );
}
