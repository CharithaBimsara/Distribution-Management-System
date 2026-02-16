import { useQuery } from '@tanstack/react-query';
import { customersApi } from '../../services/api/customersApi';
import { formatCurrency } from '../../utils/formatters';
import { Users, MapPin, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Customer } from '../../types/customer.types';

export default function RepCustomers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['rep-customers', page, search],
    queryFn: () => customersApi.repGetCustomers({ page, pageSize: 20, search: search || undefined }).then(r => r.data.data),
  });

  const customers = data?.items || [];
  const totalPages = data ? Math.ceil(data.totalCount / data.pageSize) : 0;

  const filtered = customers.filter((c: Customer) =>
    !search || c.shopName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-500 px-5 pt-5 pb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <h1 className="text-white text-xl font-bold">My Customers</h1>
        <p className="text-violet-200 text-sm mt-0.5">{data?.totalCount || 0} assigned customers</p>
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
              <Users className="w-8 h-8 text-slate-300" />
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
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/15">
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
          </div>
        )}
      </div>
    </div>
  );
}
