import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '../../services/api/customersApi';
import { orderDraftUtils } from '../../utils/orderDraft';
import { formatCurrency } from '../../utils/formatters';
import { ArrowLeft, Search, MapPin, TrendingUp, User, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function RepSelectCustomer() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const draft = orderDraftUtils.get();

  // Fetch customers with pagination
  const { data, isLoading } = useQuery({
    queryKey: ['rep-customers-all', searchTerm, currentPage],
    queryFn: () => customersApi.repGetCustomers({ search: searchTerm || undefined, page: currentPage, pageSize: 20 }).then(r => r.data.data),
  });

  const handleSelectCustomer = (id: string, name: string) => {
    orderDraftUtils.setCustomer(id, name);
    toast.success(`Selected: ${name}`);
    navigate('/rep/orders/new');
  };

  return (
    <div className="animate-fade-in pb-16">
      <div className="px-4 lg:px-6 pt-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">Select Customer</h1>
            <p className="text-sm text-slate-500 mt-0.5">Tap a customer to select for order</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search by shop name, contact person, phone, or city..."
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl outline-emerald-500 text-base"
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-sm text-slate-500 mt-3">Loading customers...</div>
          </div>
        )}

        {/* Customer Grid */}
        {!isLoading && data && (
          <>
            {data.items.length === 0 ? (
              <div className="text-center py-16">
                <User className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <div className="text-lg font-semibold text-slate-700">No customers found</div>
                <div className="text-sm text-slate-500 mt-2">Try adjusting your search</div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {data.items.map((customer: any) => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer.id, customer.shopName || customer.contactPerson)}
                      className={`bg-white rounded-2xl shadow-sm border-2 p-5 text-left hover:border-emerald-500 hover:shadow-md transition group ${
                        draft.customerId === customer.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100'
                      }`}
                    >
                      {/* Header with selection indicator */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-emerald-600 transition">
                            {customer.shopName || customer.contactPerson}
                          </h3>
                          <div className="flex items-center gap-1.5 text-sm text-slate-600 mt-1">
                            <User className="w-3.5 h-3.5" />
                            <span className="truncate">{customer.contactPerson}</span>
                          </div>
                        </div>
                        {draft.customerId === customer.id && (
                          <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 ml-2" />
                        )}
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-1.5 text-sm text-slate-600 mb-3">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{customer.city}</span>
                      </div>

                      {/* Financial Info */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                        <div>
                          <div className="text-xs text-slate-500">Balance</div>
                          <div className="text-sm font-semibold text-slate-900 mt-0.5">
                            {formatCurrency(customer.currentBalance || 0)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Credit Limit</div>
                          <div className="text-sm font-semibold text-slate-900 mt-0.5">
                            {formatCurrency(customer.creditLimit || 0)}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="mt-3 flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-xs font-semibold text-emerald-600">Active</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Pagination */}
                {data.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 rounded-lg text-sm font-semibold transition ${
                              currentPage === page
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white border border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                      {data.totalPages > 5 && <span className="px-2 text-slate-400">...</span>}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(data.totalPages, p + 1))}
                      disabled={currentPage === data.totalPages}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      Next
                    </button>
                  </div>
                )}

                {/* Summary */}
                <div className="mt-6 text-center text-sm text-slate-500">
                  Showing {data.items.length} of {data.totalCount} customers
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
