import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repsApi } from '../../services/api/repsApi';
import { customersApi } from '../../services/api/customersApi';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Users, Navigation, Route, ExternalLink, FilePlus } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
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


  const addAdHocMut = useMutation({
    mutationFn: (data: { customerId: string; notes?: string }) => repsApi.repAddAdHocVisit(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rep-today-visits'] }),
  });

  const checkInMut = useMutation({
    mutationFn: (data: { customerId: string }) => repsApi.repCheckIn(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rep-today-visits'] }),
  });
  const checkOutMut = useMutation({
    mutationFn: ({ visitId, data }: { visitId: string; data: Record<string, unknown> }) =>
      repsApi.repCheckOut(visitId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rep-today-visits'] }),
  });

  const { data: customerList } = useQuery({
    queryKey: ['rep-customers-list'],
    queryFn: () =>
      customersApi
        .repGetCustomers({ page: 1, pageSize: 200 })
        .then(r => r.data.data.items),
  });

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [addNotes, setAddNotes] = useState('');

  const handleAddAdHoc = () => {
    setAddModalOpen(true);
  };  

  const navigate = useNavigate();

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-5 pt-5 pb-6 relative z-0 overflow-hidden lg:rounded-2xl lg:pb-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <h1 className="text-white text-xl font-bold">Routes & Visits</h1>
        <p className="text-emerald-200 text-sm mt-0.5">Manage your daily route plan</p>
      </div>

      <div className="px-4 space-y-4 -mt-3 pb-6 relative z-10">
        {/* Route summary (real-world) */}
        <div className="card p-4 mb-2 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400">Route progress</p>
              <h3 className="text-sm font-semibold text-slate-800 truncate">
                Next stop: { (todayVisits && todayVisits.find(v => v.status !== 'Completed')) ? (todayVisits.find(v => v.status !== 'Completed')!.customerName) : '—' }
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                { (todayVisits?.filter(v => v.status === 'Completed').length || 0) }/{ todayVisits?.length || 0 } visits complete
                { (todayVisits && todayVisits.find(v => v.status !== 'Completed')) && (
                  <span> • Next: { formatDateTime(todayVisits.find(v => v.status !== 'Completed')!.plannedDate || new Date()) }</span>
                ) }
              </p>
              <div className="w-full h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${todayVisits && todayVisits.length ? Math.round((todayVisits.filter(v => v.status === 'Completed').length / todayVisits.length) * 100) : 0}%` }} />
              </div>
            </div>

            <div className="flex gap-2">


                      <button onClick={() => handleAddAdHoc()} className="px-3 py-2 rounded-xl border border-slate-100 text-sm bg-white/50 hover:bg-slate-50">
                Add ad-hoc
              </button>
              {/* add visit modal */}
              {addModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setAddModalOpen(false)} />
                  <div className="bg-white rounded-lg p-6 w-full max-w-sm z-10">
                    <h3 className="text-lg font-semibold mb-4">New visit</h3>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
                      <select
                        value={selectedCustomerId}
                        onChange={e => setSelectedCustomerId(e.target.value)}
                        className="w-full border border-slate-300 rounded-md p-2"
                      >
                        <option value="">-- select --</option>
                        {customerList?.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.shopName || c.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
                      <textarea
                        value={addNotes}
                        onChange={e => setAddNotes(e.target.value)}
                        className="w-full border border-slate-300 rounded-md p-2"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setAddModalOpen(false);
                          setSelectedCustomerId('');
                          setAddNotes('');
                        }}
                        className="py-2 px-4 bg-slate-100 rounded-md hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={!selectedCustomerId}
                        onClick={() => {
                          addAdHocMut.mutate({ customerId: selectedCustomerId, notes: addNotes });
                          setAddModalOpen(false);
                          setSelectedCustomerId('');
                          setAddNotes('');
                        }}
                        className="py-2 px-4 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Create
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <button onClick={() => { const el = document.querySelector('#assigned-routes'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="px-3 py-2 rounded-xl border border-slate-100 text-sm bg-white/50 hover:bg-slate-50">
                View route
              </button>
            </div>
          </div>
        </div>

        {/* Today's Visits */}
        <div className="card overflow-hidden shadow-lg shadow-slate-200/50">
          <div className="flex items-center gap-2 p-4 pb-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
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
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs font-medium capitalize text-slate-600">{visit.status.toLowerCase()}</span>
                      <button onClick={() => navigate(`/rep/visits/${visit.id}`)} className="text-xs text-blue-600">
                        View
                      </button>
                      {visit.status === 'Planned' && (
                        <button
                          onClick={() => checkInMut.mutate({ customerId: visit.customerId })}
                          className="text-xs text-green-600"
                        >
                          Check
                        </button>
                      )}
                      {visit.status === 'CheckedIn' && (
                        <button
                          onClick={() => checkOutMut.mutate({ visitId: visit.id, data: { notes: visit.notes || '', outcomeReason: '' } })}
                          className="text-xs text-green-600"
                        >
                          Complete
                        </button>
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
        <div id="assigned-routes" className="card overflow-hidden">
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
                  <div className="mt-3 text-right">
                    <button onClick={() => navigate(`/rep/routes/${route.id}`)} className="text-xs text-blue-600">View</button>
                  </div>
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

      {/* cancellation is now available only in visit detail screen */}
      </div>
    </div>
  );
}
