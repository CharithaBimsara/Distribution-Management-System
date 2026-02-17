import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repsApi, type Rep } from '../../services/api/repsApi';
import { customersApi } from '../../services/api/customersApi';
import { formatCurrency } from '../../utils/formatters';
import { UserCheck, Plus, Edit, Award, X, Target, MapPin, Users as UsersIcon, Search, Phone, UserPlus, Trash } from 'lucide-react';
import { createPortal } from 'react-dom';
import AdminRepForm from './AdminRepForm';
import AdminCustomerForm from './AdminCustomerForm';
import AdminRouteForm from './AdminRouteForm';
import ConfirmModal from '../../components/common/ConfirmModal';
import { useNavigate } from 'react-router-dom';
import type { RepPerformance, Route } from '../../types/common.types';
import toast from 'react-hot-toast';

type Tab = 'reps' | 'leaderboard' | 'routes';

export default function AdminReps() {
  const [tab, setTab] = useState<Tab>('reps');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showRepForm, setShowRepForm] = useState(false);
  const [selectedRep, setSelectedRep] = useState<Rep | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [editRep, setEditRep] = useState<Rep | null>(null);
  const [showTargetModal, setShowTargetModal] = useState<Rep | null>(null);
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [showCreateCustomer, setShowCreateCustomer] = useState<Rep | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState<Route | null>(null);
  const [editRoute, setEditRoute] = useState<Route | null>(null);
  const [routeToDelete, setRouteToDelete] = useState<Route | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

  const { data: reps, isLoading } = useQuery({
    queryKey: ['admin-reps', page, search, statusFilter],
    queryFn: () => repsApi.adminGetAll({ page, pageSize: 20, search: search || undefined, isActive: statusFilter === 'all' ? undefined : statusFilter === 'active' }).then(r => r.data.data),
  });
  const { data: leaderboard, isLoading: loadingLeaderboard } = useQuery({ queryKey: ['admin-leaderboard'], queryFn: () => repsApi.adminGetLeaderboard().then(r => r.data.data) });
  const { data: routes, isLoading: loadingRoutes } = useQuery({ queryKey: ['admin-routes'], queryFn: () => repsApi.adminGetRoutes().then(r => r.data.data), enabled: tab === 'routes' });

  const createRepMut = useMutation({ mutationFn: (d: Parameters<typeof repsApi.adminCreate>[0]) => repsApi.adminCreate(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-reps'] }); setShowRepForm(false); toast.success('Rep created'); }, onError: () => toast.error('Failed to create rep') });
  const updateRepMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Parameters<typeof repsApi.adminUpdate>[1] }) => repsApi.adminUpdate(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-reps'] }); setEditRep(null); setShowRepForm(false); toast.success('Rep updated'); }, onError: () => toast.error('Failed to update rep') });
  const setTargetMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => repsApi.adminSetTarget(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-leaderboard'] }); setShowTargetModal(null); toast.success('Target set'); }, onError: () => toast.error('Failed to set target') });
  const createRouteMut = useMutation({ mutationFn: (d: Parameters<typeof repsApi.adminCreateRoute>[0]) => repsApi.adminCreateRoute(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-routes'] }); setShowRouteForm(false); toast.success('Route created'); }, onError: () => toast.error('Failed to create route') });
  const addCustMut = useMutation({ mutationFn: ({ routeId, data }: { routeId: string; data: Parameters<typeof repsApi.adminAddCustomerToRoute>[1] }) => repsApi.adminAddCustomerToRoute(routeId, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-routes'] }); setShowAddCustomer(null); toast.success('Customer added to route'); }, onError: () => toast.error('Failed to add customer') });
  const assignRouteMut = useMutation({ mutationFn: ({ routeId, data }: { routeId: string; data: { repId: string } }) => repsApi.adminAssignRoute(routeId, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-routes'] }); setEditRoute(null); toast.success('Route updated'); }, onError: () => toast.error('Failed to update route') });
  const deleteRouteMut = useMutation({ mutationFn: (routeId: string) => repsApi.adminDeleteRoute(routeId), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-routes'] }); setRouteToDelete(null); toast.success('Route deleted'); }, onError: () => toast.error('Failed to delete route') });

  // Assign existing customer to a rep (admin)
  const assignExistingCustMut = useMutation({
    mutationFn: ({ customerId, repId }: { customerId: string; repId: string }) => customersApi.adminUpdate(customerId, { assignedRepId: repId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reps'] });
      setShowCreateCustomer(null);
      toast.success('Customer assigned to rep');
    },
    onError: () => toast.error('Failed to assign customer'),
  });

  const repList: Rep[] = reps && 'items' in reps ? (reps as any).items : Array.isArray(reps) ? reps : [];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold text-slate-900">Sales Reps</h1><p className="text-slate-500 text-sm mt-1">Manage and monitor sales representatives</p></div>
        <div className="flex gap-2">
          {tab === 'routes' && <button onClick={() => { if (isDesktop()) navigate('/admin/routes/new'); else setShowRouteForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition"><MapPin className="w-4 h-4" /> New Route</button>}
          <button onClick={() => { setEditRep(null); setShowRepForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"><Plus className="w-4 h-4" /> Add Rep</button>
          <button onClick={() => { if (isDesktop()) navigate('/admin/customers/new'); else setShowCreateCustomer(null); /* will open sheet via per-rep actions */ }} className="hidden lg:inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition"><UserPlus className="w-4 h-4" /> Add Customer</button>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([['reps', 'Reps', UserCheck], ['leaderboard', 'Leaderboard', Award], ['routes', 'Routes', MapPin]] as [Tab, string, typeof UserCheck][]).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Search (matches Customers pattern) */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm mt-4">
        <div className="flex items-center gap-4 mb-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search reps..." className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {tab === 'reps' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
          {isLoading ? <div className="p-8 text-center text-slate-500">Loading reps...</div> : !repList.length ? <div className="p-8 text-center"><UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No sales reps found</p></div> : (
            <>
              {/* Mobile cards */}
              <div className="lg:hidden divide-y divide-slate-100">
                {repList.map((rep) => (
                  <div key={rep.id} className="p-3 flex items-center gap-3 bg-white border border-slate-200 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex items-center gap-3">
                          <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center">
                            <span className="text-emerald-700 font-medium text-sm">{(rep.fullName || rep.username)[0]}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{rep.fullName || rep.username}</p>
                            <p className="text-xs text-slate-400 mt-0.5">@{rep.username} • {rep.territory || '—'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs mt-1 font-medium ${rep.isActive ? 'text-green-700' : 'text-red-600'}`}>{rep.isActive ? 'Active' : 'Inactive'}</p>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-slate-100" />

                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <button onClick={() => { if (isDesktop()) setSelectedRep(rep); else { setEditRep(rep); setShowRepForm(true); } }} className="w-full h-8 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-slate-50 text-slate-700 border border-slate-100 hover:bg-slate-100 transition"><UserCheck className="w-3 h-3" /> <span>View</span></button>
                        <button onClick={() => { if (rep.phoneNumber) window.location.href = `tel:${rep.phoneNumber}`; }} disabled={!rep.phoneNumber} className={`w-full h-8 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 ${rep.phoneNumber ? 'bg-slate-50 text-slate-700 border border-slate-100 hover:bg-slate-100' : 'bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed' } transition`}><Phone className="w-3 h-3" /> <span>Call</span></button>
                        <button onClick={() => setShowCreateCustomer(rep)} className="w-full h-8 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition"><UserPlus className="w-3 h-3" /> <span>Add</span></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80">
                      <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Rep</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Email</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Territory</th>
                      <th className="text-center px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                      <th className="text-center px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {repList.map((rep) => (
                      <tr key={rep.id} className="hover:bg-slate-50/60 transition-all group">
                        <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center"><UserCheck className="w-5 h-5 text-emerald-700" /></div><div><p className="font-medium text-slate-900">{rep.fullName || rep.username}</p><p className="text-xs text-slate-500">@{rep.username}</p></div></div></td>
                        <td className="px-5 py-3.5 text-slate-600 text-sm">{rep.email}</td>
                        <td className="px-5 py-3.5 text-slate-600 text-sm">{rep.territory || '—'}</td>
                        <td className="px-5 py-3.5 text-center"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rep.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{rep.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td className="px-5 py-3.5 text-center"><div className="flex items-center justify-center gap-1">
                          <button onClick={() => setSelectedRep(rep)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition" title="View"><UserCheck className="w-4 h-4" /></button>
                          <button onClick={() => { setEditRep(rep); setShowRepForm(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition" title="Edit"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => setShowTargetModal(rep)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition" title="Set Target"><Target className="w-4 h-4" /></button>
                          <button onClick={() => setShowCreateCustomer(rep)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition" title="Add Customer"><UsersIcon className="w-4 h-4" /></button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* pagination (if present) */}
          {(reps as any)?.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
              <p className="text-sm text-slate-500">Page {(reps as any).page} of {(reps as any).totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-slate-50">Previous</button>
                <button onClick={() => setPage(p => Math.min((reps as any).totalPages, p + 1))} disabled={page === (reps as any).totalPages} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-slate-50">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          {loadingLeaderboard ? (
            <div className="p-8 text-center text-slate-500">Loading leaderboard...</div>
          ) : !leaderboard || leaderboard.length === 0 ? (
            <div className="p-8 text-center">
              <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No leaderboard data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((rep: RepPerformance, index: number) => (
                <div key={rep.repId} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-slate-200 text-slate-700' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-500'}`}>{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{rep.repName}</p>
                    <p className="text-xs text-slate-500">{rep.totalOrders} orders &bull; {rep.totalCustomers} customers</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{formatCurrency(rep.totalSales ?? 0)}</p>
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(100, rep.achievementPercentage ?? 0)}%` }} /></div>
                      <span className="text-slate-500 w-10 text-right">{(rep.achievementPercentage ?? 0).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}     

      {tab === 'routes' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
          {loadingRoutes ? (
            <div className="p-8 text-center text-slate-500">Loading routes...</div>
          ) : (!routes || !Array.isArray(routes) || routes.length === 0) ? (
            <div className="p-8 text-center"><MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No routes defined</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* Mobile: compact route cards */}
              <div className="lg:hidden space-y-3">
                {routes.map((route: Route) => (
                  <div key={route.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{route.name}</p>
                            <p className="text-xs text-slate-400 mt-1 truncate">{route.description || route.daysOfWeek}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-full">{(route.customers?.length || 0)} customers</span>
                          <span className="inline-flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-full">~{route.estimatedDurationMinutes} min</span>
                        </div>
                      </div>
                    </div>

                      <div className="mt-4 grid grid-cols-4 gap-2">
                      <button onClick={() => setSelectedRoute(route)} className="w-full py-2 text-sm bg-slate-50 hover:bg-slate-100 rounded-lg">View</button>
                      <button onClick={() => setEditRoute(route)} className="w-full py-2 text-sm bg-slate-50 hover:bg-slate-100 rounded-lg">Edit</button>
                      <button onClick={() => setShowAddCustomer(route)} className="w-full py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">Add Customer</button>
                      <button onClick={() => setRouteToDelete(route)} className="w-full py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 flex items-center justify-center gap-1"><Trash className="w-3.5 h-3.5" /> Delete</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop route list */}
              <div className="hidden lg:block"> 
                {routes.map((route: Route) => (
                  <div key={route.id} className="p-5 hover:bg-slate-50/60 transition">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><MapPin className="w-5 h-5 text-blue-600" /></div><div><p className="font-medium text-slate-900">{route.name}</p><p className="text-xs text-slate-500">{route.description || 'No description'} &bull; {route.daysOfWeek} &bull; ~{route.estimatedDurationMinutes}min</p></div></div>
                      <div className="flex gap-1">
                        <button onClick={() => setSelectedRoute(route)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition">View</button>
                        <button onClick={() => setEditRoute(route)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition">Edit</button>
                        <button onClick={() => setShowAddCustomer(route)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"><UsersIcon className="w-3.5 h-3.5" /> Add Customer</button>
                        <button onClick={() => setRouteToDelete(route)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"><Trash className="w-3.5 h-3.5" /> Delete</button>
                      </div>
                    </div>
                    {route.customers && route.customers.length > 0 && (
                      <div className="ml-13 mt-3 space-y-1">
                        {route.customers.sort((a: any, b: any) => a.visitOrder - b.visitOrder).map((c: any) => (
                          <div key={c.id} className="flex items-center gap-2 text-sm text-slate-600 ml-12">
                            <span className="w-5 h-5 rounded bg-slate-100 text-[10px] font-bold flex items-center justify-center text-slate-500">{c.visitOrder}</span>
                            <span>{c.customerName || c.customerId}</span>
                            <span className="text-xs text-slate-400">&bull; {c.visitFrequency || 'Weekly'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showRepForm && <RepFormModal rep={editRep} onClose={() => { setShowRepForm(false); setEditRep(null); }} onSubmit={d => editRep ? updateRepMut.mutate({ id: editRep.id, data: d }) : createRepMut.mutate(d as any)} isPending={createRepMut.isPending || updateRepMut.isPending} />}
      {showTargetModal && <TargetModal rep={showTargetModal} onClose={() => setShowTargetModal(null)} onSubmit={d => setTargetMut.mutate({ id: showTargetModal.id, data: d })} isPending={setTargetMut.isPending} />}
      {showRouteForm && <RouteFormModal reps={repList} onClose={() => setShowRouteForm(false)} onSubmit={d => createRouteMut.mutate(d)} isPending={createRouteMut.isPending} />}
      {showAddCustomer && <AddCustomerModal route={showAddCustomer} onClose={() => setShowAddCustomer(null)} onSubmit={d => addCustMut.mutate({ routeId: showAddCustomer.id, data: d })} isPending={addCustMut.isPending} />}
      {editRoute && <EditRouteModal route={editRoute} reps={repList} onClose={() => setEditRoute(null)} onSubmit={(repId) => assignRouteMut.mutate({ routeId: editRoute.id, data: { repId } })} isPending={assignRouteMut.isPending} />}
      <ConfirmModal open={!!routeToDelete} title="Delete route" description={routeToDelete ? `Delete route \"${routeToDelete.name}\"? This will hide the route from lists.` : undefined} confirmLabel="Delete" confirmVariant="orange" onConfirm={() => routeToDelete && deleteRouteMut.mutate(routeToDelete.id)} onCancel={() => setRouteToDelete(null)} />

      {/* Selected rep: bottom-sheet on mobile, centered modal on desktop */}
      {selectedRep && (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedRep(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2">{selectedRep.fullName || selectedRep.username}</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Territory</span><span className="font-medium">{selectedRep.territory || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Email</span><span>{selectedRep.email}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedRep.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{selectedRep.isActive ? 'Active' : 'Inactive'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Phone</span><span>{selectedRep.phoneNumber || 'N/A'}</span></div>
            </div>

            <hr className="my-4" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { if (selectedRep.phoneNumber) window.location.href = `tel:${selectedRep.phoneNumber}`; }} disabled={!selectedRep.phoneNumber} className="flex-1 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium">Call</button>
              <button onClick={() => { setSelectedRep(null); setEditRep(selectedRep); setShowRepForm(true); }} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm">Open</button>
            </div>
          </div>
        </div>
      ) : selectedRep && typeof document !== 'undefined' ? createPortal(
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={() => setSelectedRep(null)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up pb-safe pointer-events-auto">
            <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100 z-10">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900 text-lg">{selectedRep.fullName || selectedRep.username}</h2>
                <button onClick={() => setSelectedRep(null)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Territory</span><span className="font-medium">{selectedRep.territory || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Email</span><span>{selectedRep.email}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Status</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedRep.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{selectedRep.isActive ? 'Active' : 'Inactive'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Phone</span><span>{selectedRep.phoneNumber || 'N/A'}</span></div>
              </div>

              <hr className="my-4" />
              <div className="flex gap-3 mt-4">
                <button onClick={() => { if (selectedRep.phoneNumber) window.location.href = `tel:${selectedRep.phoneNumber}`; }} disabled={!selectedRep.phoneNumber} className="flex-1 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium">Call</button>
                <button onClick={() => { setSelectedRep(null); setEditRep(selectedRep); setShowRepForm(true); }} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm">Open</button>
              </div>
            </div>
          </div>
        </div>, document.body) : null}

      {/* Selected route: centered modal on desktop, bottom-sheet on mobile */}
      {selectedRoute && (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedRoute(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2">{selectedRoute.name}</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Days</span><span className="font-medium">{selectedRoute.daysOfWeek || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Duration</span><span className="font-medium">~{selectedRoute.estimatedDurationMinutes} min</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Customers</span><span className="font-medium">{(selectedRoute.customers?.length || 0)}</span></div>
              <div className="pt-2">
                <p className="text-slate-500 text-sm mb-2">Description</p>
                <p className="text-sm text-slate-700">{selectedRoute.description || 'No description'}</p>
              </div>
            </div>

            {selectedRoute.customers && selectedRoute.customers.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-sm text-slate-500">Customers on this route</p>
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 overflow-hidden">
                  {selectedRoute.customers.sort((a: any, b: any) => a.visitOrder - b.visitOrder).map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-slate-50 rounded-md flex items-center justify-center text-xs font-bold text-slate-500">{c.visitOrder}</div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{c.customerName || c.contactPerson || c.customerId}</p>
                          <p className="text-xs text-slate-400">{c.visitFrequency || 'Weekly'}</p>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={() => { setSelectedRoute(null); setShowAddCustomer(selectedRoute); }} className="flex-1 py-2.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">Add Customer</button>
              <button onClick={() => { setSelectedRoute(null); setRouteToDelete(selectedRoute); }} className="py-2.5 px-3 bg-red-50 text-red-700 rounded-lg text-sm">Delete</button>
              <button onClick={() => setSelectedRoute(null)} className="flex-1 py-2.5 bg-slate-100 rounded-lg text-sm">Close</button>
            </div>
          </div>
        </div>
      ) : selectedRoute && typeof document !== 'undefined' ? createPortal(
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={() => setSelectedRoute(null)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up pb-safe pointer-events-auto">
            <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100 z-10">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900 text-lg">{selectedRoute.name}</h2>
                <button onClick={() => setSelectedRoute(null)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Days</span><span className="font-medium">{selectedRoute.daysOfWeek || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Duration</span><span className="font-medium">~{selectedRoute.estimatedDurationMinutes} min</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Customers</span><span className="font-medium">{(selectedRoute.customers?.length || 0)}</span></div>
                <div className="pt-2">
                  <p className="text-slate-500 text-sm mb-2">Description</p>
                  <p className="text-sm text-slate-700">{selectedRoute.description || 'No description'}</p>
                </div>
              </div>

              {selectedRoute.customers && selectedRoute.customers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-500">Customers on this route</p>
                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 overflow-hidden">
                    {selectedRoute.customers.sort((a: any, b: any) => a.visitOrder - b.visitOrder).map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 bg-slate-50 rounded-md flex items-center justify-center text-xs font-bold text-slate-500">{c.visitOrder}</div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{c.customerName || c.contactPerson || c.customerId}</p>
                            <p className="text-xs text-slate-400">{c.visitFrequency || 'Weekly'}</p>
                          </div>
                        </div>
                        <div className="text-xs text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button onClick={() => { setSelectedRoute(null); setShowAddCustomer(selectedRoute); }} className="flex-1 py-2.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">Add Customer</button>
                <button onClick={() => { setSelectedRoute(null); setRouteToDelete(selectedRoute); }} className="py-2.5 px-3 bg-red-50 text-red-700 rounded-lg text-sm">Delete</button>
                <button onClick={() => setSelectedRoute(null)} className="flex-1 py-2.5 bg-slate-100 rounded-lg text-sm">Close</button>
              </div>
            </div>
          </div>
        </div>, document.body) : null}

      {/* Mobile: create bottom-sheet (Rep) */}
      {showCreate && !isDesktop() && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={() => setShowCreate(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up pb-safe pointer-events-auto">
            <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100 z-10">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900 text-lg">New Sales Rep</h2>
                <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
            </div>

            <div className="p-6">
              <AdminRepForm onSuccess={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} />
            </div>
          </div>
        </div>, document.body
      )}

      {/* Assign existing customer to rep OR create new — responsive modal/sheet */}
      {showCreateCustomer && <RepAddCustomerModal rep={showCreateCustomer} onClose={() => setShowCreateCustomer(null)} onAssign={(customerId: string) => assignExistingCustMut.mutate({ customerId, repId: showCreateCustomer!.id })} isAssigning={assignExistingCustMut.isPending} />}
    </div>
  );
}

function RepAddCustomerModal({ rep, onClose, onAssign, isAssigning }: { rep: Rep | null; onClose: () => void; onAssign: (customerId: string) => void; isAssigning: boolean }) {
  const [customerId, setCustomerId] = useState('');
  const [search, setSearch] = useState('');
  const [showCreateInline, setShowCreateInline] = useState(false);
  const { data: customers } = useQuery({ queryKey: ['admin-customers-lookup', search], queryFn: () => customersApi.adminGetAll({ search, pageSize: 10 }).then(r => r.data.data), enabled: search.length > 1 });
  const cls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none';
  const queryClient = useQueryClient();
  const isDesktopLocal = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

  if (!rep) return null;

  const content = (
    <div>
      <h2 className="text-lg font-bold text-slate-900 mb-1">Assign or create customer</h2>
      <p className="text-sm text-slate-500 mb-4">Assign an existing customer to <strong>{rep.fullName || rep.username}</strong> or create a new one.</p>

      {!showCreateInline ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700">Search Customer</label>
            <button onClick={() => setShowCreateInline(true)} className="text-xs text-indigo-600 hover:underline">Create new customer</button>
          </div>
          <input value={search} onChange={e => { setSearch(e.target.value); setCustomerId(''); }} className={cls} placeholder="Type to search (min 2 chars)..." />
          {customers && (customers as any).items?.length > 0 && (
            <div className="border border-slate-200 rounded-lg mt-1 max-h-40 overflow-y-auto divide-y divide-slate-100">{(customers as any).items.map((c: any) => (
              <button key={c.id} onClick={() => { setCustomerId(c.id); setSearch(c.shopName || c.contactPerson || c.id); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${customerId === c.id ? 'bg-indigo-50 text-indigo-700' : ''}`}>
                {c.shopName || c.contactPerson} - {c.city}
              </button>
            ))}</div>
          )}

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Cancel</button>
            <button onClick={() => onAssign(customerId)} disabled={!customerId || isAssigning} className="flex-1 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition disabled:opacity-50">{isAssigning ? 'Assigning...' : 'Assign Customer'}</button>
          </div>
        </div>
      ) : (
        <div>
          {isDesktopLocal() ? createPortal(
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-slate-900/60 pointer-events-auto" onClick={() => setShowCreateInline(false)} />
              <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">New Customer</h3>
                  <button onClick={() => setShowCreateInline(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <AdminCustomerForm assignedRepId={rep.id} hideAssignedRepField onSuccess={(created) => { setShowCreateInline(false); onClose(); queryClient.invalidateQueries({ queryKey: ['admin-customers'] }); queryClient.invalidateQueries({ queryKey: ['admin-reps'] }); }} onCancel={() => setShowCreateInline(false)} />
              </div>
            </div>,
            document.body
          ) : createPortal(
            <div className="fixed inset-0 z-60 pointer-events-none">
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={() => setShowCreateInline(false)} />
              <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto animate-slide-up pb-safe pointer-events-auto">
                <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100 z-10">
                  <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">New Customer</h3>
                    <button onClick={() => setShowCreateInline(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                </div>
                <div className="p-6">
                  <AdminCustomerForm assignedRepId={rep.id} hideAssignedRepField onSuccess={(created) => { setShowCreateInline(false); onClose(); queryClient.invalidateQueries({ queryKey: ['admin-customers'] }); queryClient.invalidateQueries({ queryKey: ['admin-reps'] }); }} onCancel={() => setShowCreateInline(false)} />
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      )}
    </div>
  );

  if (!isDesktopLocal()) {
    return createPortal(
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto animate-slide-up pb-safe pointer-events-auto">
          <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100 z-10">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-lg">Assign or create customer</h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
          </div>
          <div className="p-6">{content}</div>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="fixed inset-0 bg-black/50" onClick={onClose} /><div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">{content}</div></div>
  );
}

function RepFormModal({ rep, onClose, onSubmit, isPending }: { rep: Rep | null; onClose: () => void; onSubmit: (d: any) => void; isPending: boolean }) {
  const isDesktopLocal = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
  const [form, setForm] = useState({ username: rep?.username || '', email: rep?.email || '', password: '', fullName: rep?.fullName || '', phoneNumber: rep?.phoneNumber || '', territory: rep?.territory || '', isActive: rep?.isActive ?? true });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const cls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none';
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (rep) { onSubmit({ fullName: form.fullName, phoneNumber: form.phoneNumber || undefined, territory: form.territory || undefined, isActive: form.isActive }); } else { onSubmit({ ...form, phoneNumber: form.phoneNumber || undefined, territory: form.territory || undefined }); } };

  // Mobile: render as bottom-sheet
  if (!isDesktopLocal()) {
    return createPortal(
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up pb-safe pointer-events-auto">
          <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100 z-10">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{rep ? 'Edit Rep' : 'New Sales Rep'}</h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!rep && <><div><label className="block text-sm font-medium text-slate-700 mb-1">Username *</label><input required value={form.username} onChange={e => set('username', e.target.value)} className={cls} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Email *</label><input required type="email" value={form.email} onChange={e => set('email', e.target.value)} className={cls} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Password *</label><input required type="password" value={form.password} onChange={e => set('password', e.target.value)} className={cls} /></div></>}
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label><input required value={form.fullName} onChange={e => set('fullName', e.target.value)} className={cls} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone</label><input value={form.phoneNumber} onChange={e => set('phoneNumber', e.target.value)} className={cls} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Territory</label><input value={form.territory} onChange={e => set('territory', e.target.value)} className={cls} /></div>
              </div>
              {rep && <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="rounded border-slate-300 text-indigo-600" /><span className="text-sm text-slate-700">Active</span></label>}
              <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-700">Cancel</button><button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">{isPending ? 'Saving...' : rep ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Desktop: centered modal (existing behavior)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="fixed inset-0 bg-black/50" onClick={onClose} /><div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
      <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-bold text-slate-900">{rep ? 'Edit Rep' : 'New Sales Rep'}</h2><button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!rep && <><div><label className="block text-sm font-medium text-slate-700 mb-1">Username *</label><input required value={form.username} onChange={e => set('username', e.target.value)} className={cls} /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Email *</label><input required type="email" value={form.email} onChange={e => set('email', e.target.value)} className={cls} /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Password *</label><input required type="password" value={form.password} onChange={e => set('password', e.target.value)} className={cls} /></div></>}
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label><input required value={form.fullName} onChange={e => set('fullName', e.target.value)} className={cls} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone</label><input value={form.phoneNumber} onChange={e => set('phoneNumber', e.target.value)} className={cls} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Territory</label><input value={form.territory} onChange={e => set('territory', e.target.value)} className={cls} /></div>
        </div>
        {rep && <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="rounded border-slate-300 text-indigo-600" /><span className="text-sm text-slate-700">Active</span></label>}
        <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Cancel</button><button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition disabled:opacity-50">{isPending ? 'Saving...' : rep ? 'Update' : 'Create'}</button></div>
      </form>
    </div></div>
  );
}

function TargetModal({ rep, onClose, onSubmit, isPending }: { rep: Rep; onClose: () => void; onSubmit: (d: Record<string, unknown>) => void; isPending: boolean }) {
  const [form, setForm] = useState({ targetPeriod: 'Monthly', targetAmount: '', startDate: new Date().toISOString().split('T')[0], endDate: '' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const cls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none';
  const isDesktopLocal = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

  const content = (
    <>
      <h2 className="text-lg font-bold text-slate-900 mb-1">Set Sales Target</h2>
      <p className="text-sm text-slate-500 mb-4">{rep.fullName || rep.username}</p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Period</label>
          <select value={form.targetPeriod} onChange={e => set('targetPeriod', e.target.value)} className={cls + ' bg-white'}>
            <option>Monthly</option>
            <option>Weekly</option>
            <option>Quarterly</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Target Amount (LKR)</label>
          <input type="number" value={form.targetAmount} onChange={e => set('targetAmount', e.target.value)} className={cls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start</label>
            <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={cls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End</label>
            <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className={cls} />
          </div>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Cancel</button>
        <button onClick={() => onSubmit({ targetPeriod: form.targetPeriod, targetAmount: parseFloat(form.targetAmount), startDate: form.startDate, endDate: form.endDate })} disabled={isPending || !form.targetAmount || !form.endDate} className="flex-1 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition disabled:opacity-50">{isPending ? 'Setting...' : 'Set Target'}</button>
      </div>
    </>
  );

  if (!isDesktopLocal()) {
    return createPortal(
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto animate-slide-up pb-safe pointer-events-auto">
          <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100 z-10">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Set Sales Target</h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
          </div>
          <div className="p-6">
            {content}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="fixed inset-0 bg-black/50" onClick={onClose} /><div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">{content}</div></div>
  );
} 

function RouteFormModal({ reps, onClose, onSubmit, isPending }: { reps: Rep[]; onClose: () => void; onSubmit: (d: any) => void; isPending: boolean }) {
  const isDesktopLocal = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

  const body = (
    <div>
      <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-bold text-slate-900">New Route</h2><button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
      <AdminRouteForm reps={reps} onSubmit={onSubmit} onCancel={onClose} isPending={isPending} />
    </div>
  );

  if (!isDesktopLocal()) {
    return createPortal(
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto animate-slide-up pb-safe pointer-events-auto">
          <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100 z-10">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">New Route</h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
          </div>
          <div className="p-6">
            {body}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="fixed inset-0 bg-black/50" onClick={onClose} /><div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">{body}</div></div>
  );
} 

function EditRouteModal({ route, reps, onClose, onSubmit, isPending }: { route: Route; reps: Rep[]; onClose: () => void; onSubmit: (repId: string) => void; isPending: boolean }) {
  const [repId, setRepId] = useState<string>(route.repId || '');
  const isDesktopLocal = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

  const content = (
    <>
      <h2 className="text-lg font-bold text-slate-900 mb-1">Edit Route</h2>
      <p className="text-sm text-slate-500 mb-4">Update rep assignment for <strong>{route.name}</strong></p>
      <div className="space-y-3">
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Route name</label><input value={route.name} disabled className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Assign to Rep *</label>
          <select value={repId} onChange={e => setRepId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
            <option value="">Select rep</option>
            {reps.map(r => <option key={r.id} value={r.id}>{r.fullName || r.username}</option>)}
          </select>
        </div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea value={route.description || ''} disabled className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" /></div>
      </div>
      <div className="flex gap-3 mt-6"><button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Cancel</button><button onClick={() => onSubmit(repId)} disabled={!repId || isPending} className="flex-1 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition disabled:opacity-50">{isPending ? 'Saving...' : 'Save'}</button></div>
    </>
  );

  if (!isDesktopLocal()) {
    return createPortal(
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto animate-slide-up pb-safe pointer-events-auto">
          <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100 z-10">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Edit Route</h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
          </div>
          <div className="p-6">{content}</div>
        </div>
      </div>, document.body
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="fixed inset-0 bg-black/50" onClick={onClose} /><div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">{content}</div></div>
  );
}

function AddCustomerModal({ route, onClose, onSubmit, isPending }: { route: Route; onClose: () => void; onSubmit: (d: { customerId: string; visitOrder: number; visitFrequency?: string }) => void; isPending: boolean }) {
  const [customerId, setCustomerId] = useState('');
  const [visitOrder, setVisitOrder] = useState(((route.customers?.length || 0) + 1).toString());
  const [freq, setFreq] = useState('Weekly');
  const [search, setSearch] = useState('');
  const { data: customers } = useQuery({ queryKey: ['admin-customers-lookup', search], queryFn: () => customersApi.adminGetAll({ search, pageSize: 10 }).then(r => r.data.data), enabled: search.length > 1 });
  const [showCreateInline, setShowCreateInline] = useState(false);
  const cls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none';
  const isDesktopLocal = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

  const content = (
    <div>
      <h2 className="text-lg font-bold text-slate-900 mb-1">Add Customer to Route</h2>
      <p className="text-sm text-slate-500 mb-4">{route.name}</p>
      <div className="space-y-4">
        {!showCreateInline ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">Search Customer</label>
              <button onClick={() => setShowCreateInline(true)} className="text-xs text-indigo-600 hover:underline">Create new customer</button>
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)} className={cls} placeholder="Type to search..." />
            {customers && (customers as any).items?.length > 0 && (
              <div className="border border-slate-200 rounded-lg mt-1 max-h-40 overflow-y-auto divide-y divide-slate-100">{(customers as any).items.map((c: any) => (
                <button key={c.id} onClick={() => { setCustomerId(c.id); setSearch(c.shopName || c.contactPerson || c.id); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${customerId === c.id ? 'bg-indigo-50 text-indigo-700' : ''}`}>{c.shopName || c.contactPerson} - {c.city}</button>
              ))}</div>
            )}
          </div>
        ) : (
          isDesktopLocal() ? createPortal(
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-slate-900/60 pointer-events-auto" onClick={() => setShowCreateInline(false)} />
              <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">New Customer</h3>
                  <button onClick={() => setShowCreateInline(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <AdminCustomerForm onSuccess={(created) => { if (created?.id) { setCustomerId(created.id); setShowCreateInline(false); setSearch(created.shopName || created.id); } }} onCancel={() => setShowCreateInline(false)} />
              </div>
            </div>,
            document.body
          ) : createPortal(
            <div className="fixed inset-0 z-60 pointer-events-none">
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={() => setShowCreateInline(false)} />
              <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto animate-slide-up pb-safe pointer-events-auto">
                <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100 z-10">
                  <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">New Customer</h3>
                    <button onClick={() => setShowCreateInline(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                </div>
                <div className="p-6">
                  <AdminCustomerForm onSuccess={(created) => { if (created?.id) { setCustomerId(created.id); setShowCreateInline(false); setSearch(created.shopName || created.id); } }} onCancel={() => setShowCreateInline(false)} />
                </div>
              </div>
            </div>,
            document.body
          )
        )}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Visit Order</label><input type="number" value={visitOrder} onChange={e => setVisitOrder(e.target.value)} className={cls} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label><select value={freq} onChange={e => setFreq(e.target.value)} className={cls + ' bg-white'}><option>Weekly</option><option>Biweekly</option><option>Monthly</option></select></div>
        </div>
      </div>
      <div className="flex gap-3 mt-6"><button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Cancel</button><button onClick={() => onSubmit({ customerId, visitOrder: parseInt(visitOrder), visitFrequency: freq })} disabled={isPending || !customerId} className="flex-1 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition disabled:opacity-50">{isPending ? 'Adding...' : 'Add Customer'}</button></div>
    </div>
  );

  if (!isDesktopLocal()) {
    return createPortal(
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto animate-slide-up pb-safe pointer-events-auto">
          <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100 z-10">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-lg">Add Customer to Route</h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
          </div>
          <div className="p-6">
            {content}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="fixed inset-0 bg-black/50" onClick={onClose} /><div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">{content}</div></div>
  );
}
