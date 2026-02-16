import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../services/api/customersApi';
import { useParams, useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ArrowLeft, Store, MapPin, CreditCard, User, Calendar, TrendingUp, ShoppingBag, DollarSign, Settings, ToggleLeft, ToggleRight } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function AdminCustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditLimit, setCreditLimit] = useState('');

  const { data: summary, isLoading } = useQuery({
    queryKey: ['admin-customer-summary', id],
    queryFn: () => customersApi.adminGetSummary(id!).then(r => r.data.data),
    enabled: !!id,
  });

  const toggleStatusMut = useMutation({
    mutationFn: (isActive: boolean) => customersApi.adminToggleStatus(id!, isActive),
    onSuccess: (_, isActive) => {
      queryClient.invalidateQueries({ queryKey: ['admin-customer-summary', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast.success(`Customer ${isActive ? 'activated' : 'deactivated'} successfully`);
    },
    onError: () => toast.error('Failed to update customer status'),
  });

  const updateCreditMut = useMutation({
    mutationFn: (limit: number) => customersApi.adminSetCreditLimit(id!, limit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customer-summary', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      setShowCreditModal(false);
      setCreditLimit('');
      toast.success('Credit limit updated successfully');
    },
    onError: () => toast.error('Failed to update credit limit'),
  });

  const customer = summary?.customer;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded skeleton" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-100 rounded-xl skeleton" />)}
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Customer not found</p>
        <button onClick={() => navigate('/admin/customers')} className="btn-secondary mt-4">
          Back to Customers
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/customers')} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{customer.shopName}</h1>
            <p className="text-sm text-slate-500 mt-1">Customer Details</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleStatusMut.mutate(!customer.isActive)}
            disabled={toggleStatusMut.isPending}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              customer.isActive
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {customer.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            {customer.isActive ? 'Active' : 'Inactive'}
          </button>
          <button
            onClick={() => { setCreditLimit(customer.creditLimit.toString()); setShowCreditModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
          >
            <Settings className="w-4 h-4" />
            Set Credit Limit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-500" />
            Basic Information
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Shop Name</p>
              <p className="text-sm font-semibold text-slate-900">{customer.shopName}</p>
            </div>
            {customer.city && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Location</p>
                <p className="text-sm text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {[customer.street, customer.city, customer.state].filter(Boolean).join(', ')}
                </p>
              </div>
            )}
            {customer.customerSegment && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Segment</p>
                <span className="inline-block px-2 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded">
                  {customer.customerSegment}
                </span>
              </div>
            )}
            {customer.assignedRepName && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Assigned Rep</p>
                <p className="text-sm text-slate-700 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {customer.assignedRepName}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Joined</p>
              <p className="text-sm text-slate-700 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(customer.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Info */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-500" />
            Financial Details
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Credit Limit</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(customer.creditLimit)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Current Balance</p>
              <p className={`text-2xl font-bold ${customer.currentBalance > customer.creditLimit * 0.8 ? 'text-red-600' : 'text-slate-900'}`}>
                {formatCurrency(customer.currentBalance)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Credit Usage</p>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    (customer.currentBalance / customer.creditLimit) > 0.8
                      ? 'bg-gradient-to-r from-red-500 to-rose-500'
                      : (customer.currentBalance / customer.creditLimit) > 0.5
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  }`}
                  style={{ width: `${Math.min(100, (customer.currentBalance / customer.creditLimit) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {((customer.currentBalance / customer.creditLimit) * 100).toFixed(1)}% utilized
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Payment Terms</p>
              <p className="text-sm text-slate-700">{customer.paymentTermsDays} days</p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            Order Statistics
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
                <span className="text-xs text-indigo-600 font-medium uppercase">Total Orders</span>
              </div>
              <p className="text-3xl font-bold text-indigo-900">{summary.totalOrders}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-emerald-600 font-medium uppercase">Total Purchases</span>
              </div>
              <p className="text-3xl font-bold text-emerald-900">{formatCurrency(summary.totalPurchases)}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-orange-50 to-rose-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-orange-600" />
                <span className="text-xs text-orange-600 font-medium uppercase">Outstanding</span>
              </div>
              <p className="text-3xl font-bold text-orange-900">{formatCurrency(summary.outstandingBalance)}</p>
            </div>
            {summary.lastOrderDate && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Last Order</p>
                <p className="text-sm text-slate-700">{formatDate(summary.lastOrderDate)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Credit Limit Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Set Credit Limit</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Credit Limit</label>
              <input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="Enter credit limit"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreditModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => updateCreditMut.mutate(parseFloat(creditLimit))}
                disabled={!creditLimit || updateCreditMut.isPending}
                className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition disabled:opacity-50"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
