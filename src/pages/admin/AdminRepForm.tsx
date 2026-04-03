import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repsApi } from '../../services/api/repsApi';
import { regionsApi } from '../../services/api/regionsApi';
import { adminGetAllCoordinators } from '../../services/api/coordinatorApi';
import toast from 'react-hot-toast';

type Props = { rep?: { id?: string }; onSuccess?: () => void; onCancel?: () => void };

export default function AdminRepForm({ rep, onSuccess, onCancel }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    employeeCode: '',
    hireDate: '',
    regionId: '',
    subRegionId: '',
    coordinatorId: '',
    isActive: true,
  });

  const { data: regionsData } = useQuery({
    queryKey: ['regions'],
    queryFn: () => regionsApi.getAll().then(r => r.data || []),
  });

  const { data: coordinatorsData } = useQuery({
    queryKey: ['coordinators-list'],
    queryFn: () => adminGetAllCoordinators(1, 100).then(r => r.items || []),
  });

  const regionList = Array.isArray(regionsData) ? regionsData : [];
  const coordinators = coordinatorsData || [];

  const subRegions = useMemo(() => {
    const region = regionList.find((r: any) => r.id === form.regionId);
    return region?.subRegions || [];
  }, [regionList, form.regionId]);

  const filteredCoordinators = useMemo(() => {
    if (!form.regionId) return coordinators;
    return coordinators.filter((c: any) => c.regionId === form.regionId);
  }, [coordinators, form.regionId]);

  const createMut = useMutation({
    mutationFn: (d: any) => repsApi.adminCreate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reps'] });
      toast.success('Rep created successfully.');
      onSuccess?.();
    },
    onError: () => toast.error('Failed to create rep'),
  });

  const handleCreate = () => {
    if (!form.fullName || !form.employeeCode || !form.password) {
      return toast.error('Full name, employee code, and password are required');
    }
    createMut.mutate({
      email: form.email || undefined,
      password: form.password,
      fullName: form.fullName,
      phoneNumber: form.phoneNumber || undefined,
      employeeCode: form.employeeCode || undefined,
      hireDate: form.hireDate || undefined,
      regionId: form.regionId || undefined,
      subRegionId: form.subRegionId || undefined,
      coordinatorId: form.coordinatorId || undefined,
    });
  };

  const cls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-emerald-500';

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-700">
        Username will be the rep employee code. Set a permanent password now.
        Email is optional.
      </div>

      <input
        value={form.fullName}
        onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
        placeholder="Full name*"
        className={cls}
      />
      <input
        value={form.employeeCode}
        onChange={e => setForm(f => ({ ...f, employeeCode: e.target.value }))}
        placeholder="Employee code*"
        className={cls}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="password"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          placeholder="Password*"
          className={cls}
        />
        <input
          value={form.phoneNumber}
          onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
          placeholder="Phone"
          className={cls}
        />
      </div>
      <input
        value={form.email}
        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
        placeholder="Email (optional)"
        className={cls}
      />
      <input
        type="date"
        value={form.hireDate}
        onChange={e => setForm(f => ({ ...f, hireDate: e.target.value }))}
          className={cls}
        />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Region</label>
          <select
            value={form.regionId}
            onChange={e => setForm(f => ({ ...f, regionId: e.target.value, subRegionId: '', coordinatorId: '' }))}
            className={cls}
          >
            <option value="">Select region…</option>
            {regionList.map((r: any) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sub-region</label>
          <select
            value={form.subRegionId}
            onChange={e => setForm(f => ({ ...f, subRegionId: e.target.value }))}
            disabled={!form.regionId}
            className={cls}
          >
            <option value="">Select sub-region…</option>
            {subRegions.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Coordinator</label>
          <select
            value={form.coordinatorId}
            onChange={e => setForm(f => ({ ...f, coordinatorId: e.target.value }))}
            disabled={!form.regionId}
            className={cls}
          >
            <option value="">Select coordinator…</option>
            {filteredCoordinators.map((c: any) => (
              <option key={c.id} value={c.id}>{c.fullName}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={onCancel} className="w-full py-2.5 bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
        <button
          disabled={createMut.isPending}
          onClick={handleCreate}
          className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {createMut.isPending ? 'Creating...' : 'Create'}
        </button>
      </div>
    </div>
  );
}
