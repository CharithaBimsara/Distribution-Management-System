import { useQuery } from '@tanstack/react-query';
import { customersApi } from '../../services/api/customersApi';
import { paymentsApi } from '../../services/api/paymentsApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Wallet, ArrowUpRight, ArrowDownRight, CreditCard, TrendingUp, ShoppingBag, DollarSign } from 'lucide-react';

export default function CustomerLedger() {
  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ['customer-ledger'],
    queryFn: () => customersApi.customerGetLedger().then(r => r.data.data),
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['customer-payments'],
    queryFn: () => paymentsApi.customerGetHistory({ page: 1, pageSize: 50 }).then(r => r.data.data),
  });

  const isLoading = ledgerLoading || paymentsLoading;
  const paymentItems = payments?.items || [];

  return (
    <div className="animate-fade-in">
      {/* Hero Balance */}
      <div className="relative bg-gradient-to-br from-orange-500 via-orange-500 to-rose-500 text-white px-5 pt-6 pb-14 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-400/20 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-5 h-5 text-orange-200" />
            <span className="text-sm text-orange-100 font-medium">Current Balance</span>
          </div>
          <p className="text-3xl font-bold tracking-tight">
            {formatCurrency(ledger?.outstandingBalance || 0)}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <TrendingUp className="w-3.5 h-3.5 text-orange-200" />
            <span className="text-xs text-orange-100">Updated in real-time</span>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-5 relative z-10 pb-6 space-y-4">
        {/* Summary Stats */}
        {ledger && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-slate-400 font-medium">Total Orders</span>
              </div>
              <p className="text-xl font-bold text-slate-900">{ledger.totalOrders}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-slate-400 font-medium">Total Purchases</span>
              </div>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(ledger.totalPurchases)}</p>
            </div>
          </div>
        )}

        {/* Payment History */}
        <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 border border-slate-100">
          <div className="px-5 pt-5 pb-3">
            <h2 className="font-bold text-slate-900">Payment History</h2>
          </div>
          {isLoading ? (
            <div className="px-5 pb-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl skeleton" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-slate-100 rounded-full w-24 skeleton" />
                    <div className="h-3 bg-slate-100 rounded-full w-16 skeleton" />
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full w-16 skeleton" />
                </div>
              ))}
            </div>
          ) : !paymentItems?.length ? (
            <div className="text-center py-12 px-5">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-7 h-7 text-slate-200" />
              </div>
              <p className="text-sm text-slate-500 font-medium">No payment records</p>
              <p className="text-xs text-slate-400 mt-0.5">Your payment history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {paymentItems.map((payment: any) => (
                <div key={payment.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    payment.status === 'Verified'
                      ? 'bg-gradient-to-br from-emerald-50 to-teal-50'
                      : 'bg-gradient-to-br from-blue-50 to-indigo-50'
                  }`}>
                    {payment.status === 'Verified'
                      ? <ArrowDownRight className="w-5 h-5 text-emerald-600" />
                      : <ArrowUpRight className="w-5 h-5 text-blue-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{payment.paymentMethod || 'Payment'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(payment.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(payment.amount)}</p>
                    <p className={`text-[10px] font-semibold mt-0.5 ${payment.status === 'Verified' ? 'text-emerald-600' : 'text-amber-600'}`}>{payment.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
