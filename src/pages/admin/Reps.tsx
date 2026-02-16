import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repsApi, type Rep } from '../../services/api/repsApi';
import { customersApi } from '../../services/api/customersApi';
import { formatCurrency } from '../../utils/formatters';
import { UserCheck, Plus, Edit, Award, X, Target, MapPin, Users as UsersIcon } from 'lucide-react';
import type { RepPerformance, Route } from '../../types/common.types';
import toast from 'react-hot-toast';

type Tab = 'reps' | 'leaderboard' | 'routes';

export default function AdminReps() {
  const [tab, setTab] = useState<Tab>('reps');
  const [showRepForm, setShowRepForm] = useState(false);
  const [editRep, setEditRep] = useState<Rep | null>(null);
  const [showTargetModal, setShowTargetModal] = useState<Rep | null>(null);
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState<Route | null>(null);
  const queryClient = useQueryClient();

  const { data: reps, isLoading } = useQuery({ queryKey: ['admin-reps'], queryFn: () => repsApi.adminGetAll().then(r => r.data.data) });
  const { data: leaderboard } = useQuery({ queryKey: ['admin-leaderboard'], queryFn: () => repsApi.adminGetLeaderboard().then(r => r.data.data) });
  const { data: routes } = useQuery({ queryKey: ['admin-routes'], queryFn: () => repsApi.adminGetRoutes().then(r => r.data.data), enabled: tab === 'routes' });

  const createRepMut = useMutation({ mutationFn: (d: Parameters<typeof repsApi.adminCreate>[0]) => repsApi.adminCreate(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-reps'] }); setShowRepForm(false); toast.success('Rep created'); }, onError: () => toast.error('Failed to create rep') });
  const updateRepMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Parameters<typeof repsApi.adminUpdate>[1] }) => repsApi.adminUpdate(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-reps'] }); setEditRep(null); setShowRepForm(false); toast.success('Rep updated'); }, onError: () => toast.error('Failed to update rep') });
  const setTargetMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => repsApi.adminSetTarget(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-leaderboard'] }); setShowTargetModal(null); toast.success('Target set'); }, onError: () => toast.error('Failed to set target') });
  const createRouteMut = useMutation({ mutationFn: (d: Parameters<typeof repsApi.adminCreateRoute>[0]) => repsApi.adminCreateRoute(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-routes'] }); setShowRouteForm(false); toast.success('Route created'); }, onError: () => toast.error('Failed to create route') });
  const addCustMut = useMutation({ mutationFn: ({ routeId, data }: { routeId: string; data: Parameters<typeof repsApi.adminAddCustomerToRoute>[1] }) => repsApi.adminAddCustomerToRoute(routeId, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-routes'] }); setShowAddCustomer(null); toast.success('Customer added to route'); }, onError: () => toast.error('Failed to add customer') });

  const repList: Rep[] = reps && 'items' in reps ? (reps as any).items : Array.isArray(reps) ? reps : [];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold text-slate-900">Sales Reps</h1><p className="text-slate-500 text-sm mt-1">Manage and monitor sales representatives</p></div>
        <div className="flex gap-2">
          {tab === 'routes' && <button onClick={() => setShowRouteForm(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition"><MapPin className="w-4 h-4" /> New Route</button>}
          <button onClick={() => { setEditRep(null); setShowRepForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"><Plus className="w-4 h-4" /> Add Rep</button>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([['reps', 'Reps', UserCheck], ['leaderboard', 'Leaderboard', Award], ['routes', 'Routes', MapPin]] as [Tab, string, typeof UserCheck][]).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'reps' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
          {isLoading ? <div className="p-8 text-center text-slate-500">Loading reps...</div> : !repList.length ? <div className="p-8 text-center"><UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No sales reps found</p></div> : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50/80 border-b border-slate-200/80">
              <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Rep</th>
              <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Email</th>
              <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Territory</th>
              <th className="text-center px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
              <th className="text-center px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Actions</th>
            </tr></thead><tbody className="divide-y divide-slate-100">
              {repList.map((rep) => (
                <tr key={rep.id} className="hover:bg-slate-50/60 transition-all group">
                  <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center"><UserCheck className="w-5 h-5 text-emerald-700" /></div><div><p className="font-medium text-slate-900">{rep.fullName || rep.username}</p><p className="text-xs text-slate-500">@{rep.username}</p></div></div></td>
                  <td className="px-5 py-3.5 text-slate-600 text-sm">{rep.email}</td>
                  <td className="px-5 py-3.5 text-slate-600 text-sm">{rep.territory || '—'}</td>
                  <td className="px-5 py-3.5 text-center"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rep.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{rep.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-5 py-3.5 text-center"><div className="flex items-center justify-center gap-1">
                    <button onClick={() => { setEditRep(rep); setShowRepForm(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition" title="Edit"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => setShowTargetModal(rep)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition" title="Set Target"><Target className="w-4 h-4" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </div>
      )}

      {tab === 'leaderboard' && leaderboard && leaderboard.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="space-y-3">
            {leaderboard.map((rep: RepPerformance, index: number) => (
              <div key={rep.repId} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-slate-200 text-slate-700' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-500'}`}>{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">{rep.repName}</p>
                  <p className="text-xs text-slate-500">{rep.totalOrders} orders &bull; {rep.totalCustomers} customers</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{formatCurrency(rep.totalSales)}</p>
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(100, rep.achievementPercentage)}%` }} /></div>
                    <span className="text-slate-500 w-10 text-right">{rep.achievementPercentage.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'routes' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
          {!routes || !Array.isArray(routes) || routes.length === 0 ? <div className="p-8 text-center"><MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No routes defined</p></div> : (
            <div className="divide-y divide-slate-100">
              {routes.map((route: Route) => (
                <div key={route.id} className="p-5 hover:bg-slate-50/60 transition">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><MapPin className="w-5 h-5 text-blue-600" /></div><div><p className="font-medium text-slate-900">{route.name}</p><p className="text-xs text-slate-500">{route.description || 'No description'} &bull; {route.daysOfWeek} &bull; ~{route.estimatedDurationMinutes}min</p></div></div>
                    <div className="flex gap-1">
                      <button onClick={() => setShowAddCustomer(route)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"><UsersIcon className="w-3.5 h-3.5" /> Add Customer</button>
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
          )}
        </div>
      )}

      {showRepForm && <RepFormModal rep={editRep} onClose={() => { setShowRepForm(false); setEditRep(null); }} onSubmit={d => editRep ? updateRepMut.mutate({ id: editRep.id, data: d }) : createRepMut.mutate(d as any)} isPending={createRepMut.isPending || updateRepMut.isPending} />}
      {showTargetModal && <TargetModal rep={showTargetModal} onClose={() => setShowTargetModal(null)} onSubmit={d => setTargetMut.mutate({ id: showTargetModal.id, data: d })} isPending={setTargetMut.isPending} />}
      {showRouteForm && <RouteFormModal reps={repList} onClose={() => setShowRouteForm(false)} onSubmit={d => createRouteMut.mutate(d)} isPending={createRouteMut.isPending} />}
      {showAddCustomer && <AddCustomerModal route={showAddCustomer} onClose={() => setShowAddCustomer(null)} onSubmit={d => addCustMut.mutate({ routeId: showAddCustomer.id, data: d })} isPending={addCustMut.isPending} />}
    </div>
  );
}

function RepFormModal({ rep, onClose, onSubmit, isPending }: { rep: Rep | null; onClose: () => void; onSubmit: (d: any) => void; isPending: boolean }) {
  const [form, setForm] = useState({ username: rep?.username || '', email: rep?.email || '', password: '', fullName: rep?.fullName || '', phoneNumber: rep?.phoneNumber || '', territory: rep?.territory || '', isActive: rep?.isActive ?? true });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const cls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none';
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (rep) { onSubmit({ fullName: form.fullName, phoneNumber: form.phoneNumber || undefined, territory: form.territory || undefined, isActive: form.isActive }); } else { onSubmit({ ...form, phoneNumber: form.phoneNumber || undefined, territory: form.territory || undefined }); } };
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="fixed inset-0 bg-black/50" onClick={onClose} /><div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
      <h2 className="text-lg font-bold text-slate-900 mb-1">Set Sales Target</h2><p className="text-sm text-slate-500 mb-4">{rep.fullName || rep.username}</p>
      <div className="space-y-4">
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Period</label><select value={form.targetPeriod} onChange={e => set('targetPeriod', e.target.value)} className={cls + ' bg-white'}><option>Monthly</option><option>Weekly</option><option>Quarterly</option></select></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Target Amount (LKR)</label><input type="number" value={form.targetAmount} onChange={e => set('targetAmount', e.target.value)} className={cls} /></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-slate-700 mb-1">Start</label><input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={cls} /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">End</label><input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className={cls} /></div></div>
      </div>
      <div className="flex gap-3 mt-6"><button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Cancel</button><button onClick={() => onSubmit({ targetPeriod: form.targetPeriod, targetAmount: parseFloat(form.targetAmount), startDate: form.startDate, endDate: form.endDate })} disabled={isPending || !form.targetAmount || !form.endDate} className="flex-1 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition disabled:opacity-50">{isPending ? 'Setting...' : 'Set Target'}</button></div>
    </div></div>
  );
}

function RouteFormModal({ reps, onClose, onSubmit, isPending }: { reps: Rep[]; onClose: () => void; onSubmit: (d: any) => void; isPending: boolean }) {
  const [form, setForm] = useState({ name: '', description: '', repId: '', daysOfWeek: 'Monday,Wednesday,Friday', estimatedDurationMinutes: '120' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const cls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="fixed inset-0 bg-black/50" onClick={onClose} /><div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
      <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-bold text-slate-900">New Route</h2><button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
      <div className="space-y-4">
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Name *</label><input value={form.name} onChange={e => set('name', e.target.value)} className={cls} /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><input value={form.description} onChange={e => set('description', e.target.value)} className={cls} /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Assign to Rep *</label><select value={form.repId} onChange={e => set('repId', e.target.value)} className={cls + ' bg-white'}><option value="">Select rep</option>{reps.map(r => <option key={r.id} value={r.id}>{r.fullName || r.username}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Days of Week</label><input value={form.daysOfWeek} onChange={e => set('daysOfWeek', e.target.value)} className={cls} placeholder="Monday,Wednesday,Friday" /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Est. Duration (min)</label><input type="number" value={form.estimatedDurationMinutes} onChange={e => set('estimatedDurationMinutes', e.target.value)} className={cls} /></div>
      </div>
      <div className="flex gap-3 mt-6"><button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Cancel</button><button onClick={() => onSubmit({ ...form, estimatedDurationMinutes: parseInt(form.estimatedDurationMinutes) })} disabled={isPending || !form.name || !form.repId} className="flex-1 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition disabled:opacity-50">{isPending ? 'Creating...' : 'Create Route'}</button></div>
    </div></div>
  );
}

function AddCustomerModal({ route, onClose, onSubmit, isPending }: { route: Route; onClose: () => void; onSubmit: (d: { customerId: string; visitOrder: number; visitFrequency?: string }) => void; isPending: boolean }) {
  const [customerId, setCustomerId] = useState('');
  const [visitOrder, setVisitOrder] = useState(((route.customers?.length || 0) + 1).toString());
  const [freq, setFreq] = useState('Weekly');
  const [search, setSearch] = useState('');
  const { data: customers } = useQuery({ queryKey: ['admin-customers-lookup', search], queryFn: () => customersApi.adminGetAll({ search, pageSize: 10 }).then(r => r.data.data), enabled: search.length > 1 });
  const cls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="fixed inset-0 bg-black/50" onClick={onClose} /><div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
      <h2 className="text-lg font-bold text-slate-900 mb-1">Add Customer to Route</h2><p className="text-sm text-slate-500 mb-4">{route.name}</p>
      <div className="space-y-4">
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Search Customer</label><input value={search} onChange={e => setSearch(e.target.value)} className={cls} placeholder="Type to search..." />
          {customers && (customers as any).items?.length > 0 && (
            <div className="border border-slate-200 rounded-lg mt-1 max-h-40 overflow-y-auto divide-y divide-slate-100">{(customers as any).items.map((c: any) => (
              <button key={c.id} onClick={() => { setCustomerId(c.id); setSearch(c.shopName || c.contactPerson || c.id); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${customerId === c.id ? 'bg-indigo-50 text-indigo-700' : ''}`}>{c.shopName || c.contactPerson} - {c.city}</button>
            ))}</div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Visit Order</label><input type="number" value={visitOrder} onChange={e => setVisitOrder(e.target.value)} className={cls} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label><select value={freq} onChange={e => setFreq(e.target.value)} className={cls + ' bg-white'}><option>Weekly</option><option>Biweekly</option><option>Monthly</option></select></div>
        </div>
      </div>
      <div className="flex gap-3 mt-6"><button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Cancel</button><button onClick={() => onSubmit({ customerId, visitOrder: parseInt(visitOrder), visitFrequency: freq })} disabled={isPending || !customerId} className="flex-1 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition disabled:opacity-50">{isPending ? 'Adding...' : 'Add Customer'}</button></div>
    </div></div>
  );
}
