import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../../services/api/paymentsApi';
import { formatCurrency, formatDate, statusColor } from '../../utils/formatters';
import { DollarSign, CheckCircle, Eye, X, BookOpen } from 'lucide-react';
import type { Payment, CustomerLedger, LedgerEntry } from '../../types/payment.types';
import toast from 'react-hot-toast';

export default function AdminPayments() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [ledgerCustomerId, setLedgerCustomerId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments', page, statusFilter],
    queryFn: () => paymentsApi.adminGetAll({ page, pageSize: 20, status: statusFilter || undefined }).then(r => r.data.data),
  });

  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ['admin-ledger', ledgerCustomerId],
    queryFn: () => paymentsApi.adminGetCustomerLedger(ledgerCustomerId!).then(r => r.data.data),
    enabled: !!ledgerCustomerId,
  });

  const verifyMut = useMutation({
    mutationFn: (id: string) => paymentsApi.adminVerify(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-payments'] }); toast.success('Payment verified'); },
    onError: () => toast.error('Failed to verify payment'),
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="text-slate-500 text-sm mt-1">Manage and verify customer payments</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {['', 'Pending', 'Verified', 'Rejected'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${statusFilter === s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
        {isLoading ? <div className="p-8 text-center text-slate-500">Loading payments...</div> : !data?.items?.length ? (
          <div className="p-8 text-center"><DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No payments found</p></div>
        ) : (<>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50/80 border-b border-slate-200/80">
            <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Customer</th>
            <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Date</th>
            <th className="text-right px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Amount</th>
            <th className="text-center px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Method</th>
            <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Reference</th>
            <th className="text-center px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
            <th className="text-center px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Actions</th>
          </tr></thead><tbody className="divide-y divide-slate-100">
            {data.items.map((p: Payment) => (
              <tr key={p.id} className="hover:bg-slate-50/60 transition-all">
                <td className="px-5 py-3.5"><p className="font-medium text-slate-900">{p.customerName || p.customerId}</p></td>
                <td className="px-5 py-3.5 text-slate-600">{formatDate(p.paymentDate)}</td>
                <td className="px-5 py-3.5 text-right font-semibold text-slate-900">{formatCurrency(p.amount)}</td>
                <td className="px-5 py-3.5 text-center"><span className="text-xs font-medium px-2 py-0.5 bg-slate-100 rounded-full">{p.paymentMethod}</span></td>
                <td className="px-5 py-3.5 text-slate-600 text-xs font-mono">{p.referenceNumber || p.chequeNumber || '—'}</td>
                <td className="px-5 py-3.5 text-center"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>{p.status}</span></td>
                <td className="px-5 py-3.5 text-center"><div className="flex items-center justify-center gap-1">
                  <button onClick={() => setSelectedPayment(p)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition" title="Details"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => setLedgerCustomerId(p.customerId)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition" title="Customer Ledger"><BookOpen className="w-4 h-4" /></button>
                  {p.status === 'Pending' && <button onClick={() => verifyMut.mutate(p.id)} disabled={verifyMut.isPending} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition" title="Verify"><CheckCircle className="w-4 h-4" /></button>}
                </div></td>
              </tr>
            ))}
          </tbody></table></div>
          {data.totalPages > 1 && <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200/80"><p className="text-sm text-slate-500">Page {data.page} of {data.totalPages} ({data.totalCount} payments)</p><div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3.5 py-1.5 text-sm border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50 transition">Previous</button><button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="px-3.5 py-1.5 text-sm border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50 transition">Next</button></div></div>}
        </>)}
      </div>

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="fixed inset-0 bg-black/50" onClick={() => setSelectedPayment(null)} /><div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900">Payment Details</h2><button onClick={() => setSelectedPayment(null)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Customer</span><span className="font-medium">{selectedPayment.customerName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-bold text-lg">{formatCurrency(selectedPayment.amount)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Method</span><span>{selectedPayment.paymentMethod}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Status</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(selectedPayment.status)}`}>{selectedPayment.status}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Date</span><span>{formatDate(selectedPayment.paymentDate)}</span></div>
            {selectedPayment.referenceNumber && <div className="flex justify-between"><span className="text-slate-500">Reference</span><span className="font-mono text-xs">{selectedPayment.referenceNumber}</span></div>}
            {selectedPayment.chequeNumber && <div className="flex justify-between"><span className="text-slate-500">Cheque</span><span className="font-mono text-xs">{selectedPayment.chequeNumber}</span></div>}
            {selectedPayment.bankName && <div className="flex justify-between"><span className="text-slate-500">Bank</span><span>{selectedPayment.bankName}</span></div>}
            {selectedPayment.notes && <div className="pt-2 border-t"><p className="text-slate-500 text-xs mb-1">Notes</p><p className="text-slate-700">{selectedPayment.notes}</p></div>}
          </div>
          {selectedPayment.status === 'Pending' && <button onClick={() => { verifyMut.mutate(selectedPayment.id); setSelectedPayment(null); }} className="mt-6 w-full py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-medium transition">Verify Payment</button>}
          <button onClick={() => setSelectedPayment(null)} className="mt-2 w-full py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Close</button>
        </div></div>
      )}

      {/* Customer Ledger Modal */}
      {ledgerCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="fixed inset-0 bg-black/50" onClick={() => setLedgerCustomerId(null)} /><div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-bold text-slate-900">Customer Ledger</h2><button onClick={() => setLedgerCustomerId(null)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
          {ledgerLoading ? <div className="py-8 text-center text-slate-500">Loading ledger...</div> : ledger ? (<>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Outstanding</p><p className="font-bold text-red-600">{formatCurrency((ledger as CustomerLedger).totalOutstanding)}</p></div>
              <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Total Paid</p><p className="font-bold text-emerald-600">{formatCurrency((ledger as CustomerLedger).totalPaid)}</p></div>
              <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Credit Limit</p><p className="font-bold text-slate-900">{formatCurrency((ledger as CustomerLedger).creditLimit)}</p></div>
              <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Available</p><p className="font-bold text-blue-600">{formatCurrency((ledger as CustomerLedger).availableCredit)}</p></div>
            </div>
            {(ledger as CustomerLedger).entries?.length > 0 && (
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50 border-b border-slate-200"><th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Date</th><th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Type</th><th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Reference</th><th className="text-right px-3 py-2 text-xs font-semibold text-slate-600">Debit</th><th className="text-right px-3 py-2 text-xs font-semibold text-slate-600">Credit</th><th className="text-right px-3 py-2 text-xs font-semibold text-slate-600">Balance</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{(ledger as CustomerLedger).entries.map((e: LedgerEntry, i: number) => (
                  <tr key={i} className="hover:bg-slate-50"><td className="px-3 py-2 text-slate-600">{formatDate(e.date)}</td><td className="px-3 py-2">{e.type}</td><td className="px-3 py-2 font-mono text-xs">{e.reference}</td><td className="px-3 py-2 text-right text-red-600">{e.debit ? formatCurrency(e.debit) : '—'}</td><td className="px-3 py-2 text-right text-emerald-600">{e.credit ? formatCurrency(e.credit) : '—'}</td><td className="px-3 py-2 text-right font-medium">{formatCurrency(e.balance)}</td></tr>
                ))}</tbody></table></div>
            )}
          </>) : <div className="py-8 text-center text-slate-400">No ledger data available</div>}
        </div></div>
      )}
    </div>
  );
}
