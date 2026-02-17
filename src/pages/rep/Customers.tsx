import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../services/api/customersApi';
import { formatCurrency } from '../../utils/formatters';
import { Users, MapPin, Search, Plus, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import RepCustomerForm from './RepCustomerForm';
import type { Customer } from '../../types/customer.types';

export default function RepCustomers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['rep-customers', page, search],
    queryFn: () => customersApi.repGetCustomers({ page, pageSize: 20, search: search || undefined }).then(r => r.data.data),
  });

  const queryClient = useQueryClient();
  const customers = data?.items || [];
  const totalPages = data ? Math.ceil(data.totalCount / data.pageSize) : 0;

  const [showCreate, setShowCreate] = useState(false);

  const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

  const filtered = customers.filter((c: Customer) =>
    !search || c.shopName.toLowerCase().includes(search.toLowerCase())
  );

  // lock background scroll while mobile bottom-sheet is open (match payments behavior)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (showCreate && !isDesktop()) {
      document.body.style.overflow = 'hidden';
      try { window.scrollTo({ top: 0, behavior: 'instant' as any }); } catch {}
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showCreate]);



  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-5 pt-5 pb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">My Customers</h1>
            <p className="text-emerald-200 text-sm mt-0.5">{data?.totalCount || 0} assigned customers</p>
          </div>
          <div className="ml-4">
            <button onClick={() => { if (isDesktop()) { navigate('/rep/customers/new'); } else { setShowCreate(true); } }} className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 transition">
              <Plus className="w-4 h-4" />
              Register Customer
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4 -mt-3 pb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none shadow-lg shadow-slate-200/50 transition"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Users className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-slate-500 font-medium">No customers found</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((customer: Customer) => (
              <div 
                key={customer.id} 
                onClick={() => navigate(`/rep/customers/${customer.id}`)}
                className="card p-4 cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/15">
                    <span className="text-white font-bold text-sm">{customer.shopName[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{customer.shopName}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                      {customer.city && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{customer.city}</span>
                      )}
                      {customer.customerSegment && (
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-medium">{customer.customerSegment}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(customer.currentBalance)}</p>
                    <p className="text-[10px] text-slate-400">of {formatCurrency(customer.creditLimit)}</p>
                  </div>
                </div>
                {customer.creditLimit > 0 && (
                  <div className="mt-3">
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          (customer.currentBalance / customer.creditLimit) > 0.8
                            ? 'bg-gradient-to-r from-rose-500 to-red-500'
                            : (customer.currentBalance / customer.creditLimit) > 0.5
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        }`}
                        style={{ width: `${Math.min(100, (customer.currentBalance / customer.creditLimit) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 text-right">
                      {((customer.currentBalance / customer.creditLimit) * 100).toFixed(0)}% utilized
                    </p>
                  </div>
                )}
              </div>
            ))}

            {/* Mobile: Register customer bottom-sheet (desktop navigates to /rep/customers/new) */}
            {showCreate && typeof document !== 'undefined' && createPortal(
              <div className="fixed inset-0 z-50 pointer-events-none">
                <div className="fixed inset-0 bottom-16 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={() => setShowCreate(false)} />
                <div className="fixed bottom-16 left-0 right-0 bg-white rounded-t-3xl h-auto overflow-y-auto animate-slide-up pb-safe pointer-events-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
                  <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100 z-10">
                    <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-slate-900 text-lg">Register Customer</h2>
                      <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
                    </div>
                  </div>

                  <div className="p-6">
                    <RepCustomerForm onSuccess={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} />
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>
        )}
      </div>
    </div>
  );
}
