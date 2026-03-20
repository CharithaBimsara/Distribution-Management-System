import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '../../services/api/customersApi';
import { orderDraftUtils } from '../../utils/orderDraft';
import { formatCurrency } from '../../utils/formatters';
import { ArrowLeft, Search, MapPin, TrendingUp, User, CheckCircle2, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useIsDesktop } from '../../hooks/useMediaQuery';

export default function RepSelectCustomer() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const isDesktop = useIsDesktop();

  const draft = orderDraftUtils.get();

  // Fetch full assigned customer pool for consistent selection across all assigned routes.
  const { data, isLoading } = useQuery({
    queryKey: ['rep-customers-all'],
    queryFn: () => customersApi.repGetCustomers({ page: 1, pageSize: 2000 }).then(r => r.data.data),
  });

  const allCustomers = data?.items || [];
  const filteredCustomers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return allCustomers;

    return allCustomers.filter((customer: any) => {
      const shopName = (customer.shopName || '').toLowerCase();
      const contactPerson = (customer.contactPerson || '').toLowerCase();
      const email = (customer.email || '').toLowerCase();
      const phone = (customer.phoneNumber || '').toLowerCase();
      const city = (customer.city || '').toLowerCase();
      return (
        shopName.includes(q) ||
        contactPerson.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        city.includes(q)
      );
    });
  }, [allCustomers, searchTerm]);

  const handleSelectCustomer = (id: string, name: string) => {
    orderDraftUtils.setCustomer(id, name);
    toast.success(`Selected: ${name}`);
    navigate('/rep/orders/new');
  };

  return (
    <div className="animate-fade-in pb-16 lg:pb-20">
      <div className="px-4 md:px-5 lg:px-6 pt-4 md:pt-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5 md:mb-6">
          <button onClick={() => navigate(-1)} className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 w-fit">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl lg:text-2xl font-bold text-slate-900">Select Customer</h1>
            <p className="text-sm md:text-base lg:text-sm text-slate-500 mt-1">Choose from your customers to start creating an order</p>
          </div>
        </div>

        {!isLoading && data && (
          <div className="grid grid-cols-3 gap-2 md:gap-3 mb-5 md:mb-6">
            <TinyChip label="Page" value={String(data.items.length)} />
            <TinyChip label="Total" value={String(data.totalCount)} tone="green" />
            <TinyChip label="Selected" value={draft.customerId ? 'Yes' : 'No'} tone="emerald" />
          </div>
        )}

        {/* Search Bar - Sticky on scroll */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-100 p-4 mb-5 md:mb-6 -mx-4 md:-mx-5 lg:-mx-6 px-4 md:px-5 lg:px-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by shop name, contact, phone, or city..."
              className="w-full pl-10 pr-4 py-3.5 md:py-3 border border-slate-300 rounded-xl outline-emerald-500 text-base placeholder-slate-400"
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16 md:py-20">
            <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-sm text-slate-500 mt-4">Loading customers...</div>
          </div>
        )}

        {/* Customer Grid */}
        {!isLoading && data && (
          <>
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-16 md:py-20">
                <User className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <div className="text-lg md:text-xl font-semibold text-slate-700">No customers found</div>
                <div className="text-sm text-slate-500 mt-2">Try adjusting your search</div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
                  {filteredCustomers.map((customer: any) => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer.id, customer.shopName || customer.contactPerson)}
                      className={`bg-white rounded-2xl shadow-sm border-2 p-4 md:p-5 text-left hover:shadow-lg hover:border-emerald-400 transition-all active:scale-95 group min-h-[220px] md:min-h-[200px] flex flex-col ${
                        draft.customerId === customer.id ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-slate-100'
                      }`}
                    >
                      {/* Header with selection indicator */}
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base md:text-lg font-bold text-slate-900 truncate group-hover:text-emerald-600 transition line-clamp-2">
                            {customer.shopName || customer.contactPerson}
                          </h3>
                        </div>
                        {draft.customerId === customer.id && (
                          <div className="flex-shrink-0">
                            <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Contact Person */}
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                        <User className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{customer.contactPerson}</span>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-4 pb-4 border-b border-slate-200/50">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{customer.city}</span>
                      </div>

                      {/* Financial Info - Improved visibility */}
                      <div className="flex-1 grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 rounded-xl p-3">
                          <div className="text-xs text-emerald-700 font-semibold uppercase tracking-wide">Balance</div>
                          <div className="text-sm md:text-base font-bold text-emerald-900 mt-1">
                            {formatCurrency(customer.currentBalance || 0)}
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-3">
                          <div className="text-xs text-emerald-700 font-semibold uppercase tracking-wide">Limit</div>
                          <div className="text-sm md:text-base font-bold text-emerald-900 mt-1">
                            {formatCurrency(customer.creditLimit || 0)}
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2 bg-emerald-100 rounded-lg px-3 py-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-semibold text-emerald-700">Active Customer</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Summary */}
                <div className="mt-8 text-center text-sm text-slate-500">
                  Showing <span className="font-semibold text-slate-700">{filteredCustomers.length}</span> of <span className="font-semibold text-slate-700">{allCustomers.length}</span> customers
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TinyChip({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: string;
  tone?: 'slate' | 'green' | 'emerald';
}) {
  const toneClass =
    tone === 'green'
      ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
      : tone === 'emerald'
      ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
      : 'bg-white border-slate-200 text-slate-700';

  return (
    <div className={`rounded-xl border px-3.5 py-3 md:py-2.5 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-wide font-bold opacity-75">{label}</p>
      <p className="text-base md:text-sm font-bold mt-1 md:mt-0.5 truncate">{value}</p>
    </div>
  );
}
