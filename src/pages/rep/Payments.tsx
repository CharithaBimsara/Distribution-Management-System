import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../../services/api/paymentsApi';
import { customersApi } from '../../services/api/customersApi';
import { formatCurrency, formatDate, statusColor } from '../../utils/formatters';
import { DollarSign, Plus, X, CreditCard } from 'lucide-react';
import type { Payment, PaymentRecord } from '../../types/payment.types';
import toast from 'react-hot-toast';

export default function RepPayments() {
  const [page, setPage] = useState(1);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['rep-payments', page],
    queryFn: () => paymentsApi.repGetAll({ page, pageSize: 20 }).then(r => r.data.data),
  });

  const recordMut = useMutation({
    mutationFn: (d: PaymentRecord) => paymentsApi.repRecord(d as any),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rep-payments'] }); setShowRecordForm(false); toast.success('Payment recorded!'); },
    onError: () => toast.error('Failed to record payment'),
  });

  return (
    <div className="animate-fade-in">
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-5 pt-5 pb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="flex items-center justify-between">
          <div><h1 className="text-white text-xl font-bold">Payments</h1><p className="text-emerald-200 text-sm mt-0.5">Record and track collections</p></div>
          <button onClick={() => setShowRecordForm(true)} className="flex items-center gap-1.5 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl text-sm font-semibold hover:bg-white/30 transition active:scale-95"><Plus className="w-4 h-4" /> Record</button>
        </div>
      </div>

      <div className="px-4 space-y-3 -mt-3 pb-6">
        {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div> : !data?.items?.length ? (
          <div className="text-center py-16"><div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3"><CreditCard className="w-8 h-8 text-slate-300" /></div><p className="text-slate-500 font-medium">No payments recorded</p></div>
        ) : (
          <div className="space-y-2.5">
            {data.items.map((p: Payment) => (
              <div key={p.id} className="card p-4">
                <div className="flex items-center justify-between mb-1.5"><span className="text-sm font-bold text-slate-800">{p.customerName || 'Customer'}</span><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>{p.status}</span></div>
                <div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">{p.paymentMethod} {p.referenceNumber ? `• ${p.referenceNumber}` : ''}</p><p className="text-[11px] text-slate-400 mt-0.5">{formatDate(p.paymentDate)}</p></div><span className="text-base font-bold text-emerald-600">{formatCurrency(p.amount)}</span></div>
              </div>
            ))}
            {data.totalPages > 1 && <div className="flex items-center justify-between pt-2"><span className="text-xs text-slate-400">Page {page} of {data.totalPages}</span><div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl disabled:opacity-40">Prev</button><button onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages} className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl disabled:opacity-40">Next</button></div></div>}
          </div>
        )}
      </div>

      {/* Record Payment Bottom Sheet */}
      {showRecordForm && <RecordPaymentSheet onClose={() => setShowRecordForm(false)} onSubmit={d => recordMut.mutate(d)} isPending={recordMut.isPending} />}
    </div>
  );
}

function RecordPaymentSheet({ onClose, onSubmit, isPending }: { onClose: () => void; onSubmit: (d: PaymentRecord) => void; isPending: boolean }) {
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [notes, setNotes] = useState('');

  const { data: customers } = useQuery({ queryKey: ['rep-customers-lookup', customerSearch], queryFn: () => customersApi.repGetCustomers({ search: customerSearch, pageSize: 10 }).then(r => r.data.data), enabled: customerSearch.length > 1 });
  const cls = 'w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none';

  return (
    <div className="fixed inset-0 z-50"><div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} /><div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up pb-safe">
      <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100 z-10"><div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" /><div className="flex items-center justify-between"><h2 className="font-bold text-slate-900 text-lg">Record Payment</h2><button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button></div></div>
      <div className="p-6 space-y-4">
        <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Customer *</label>
          <input value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); setCustomerId(''); }} className={cls} placeholder="Search customers..." />
          {customers && (customers as any).items?.length > 0 && !customerId && (
            <div className="border border-slate-200 rounded-lg mt-1 max-h-32 overflow-y-auto divide-y divide-slate-100">{(customers as any).items.map((c: any) => (
              <button key={c.id} onClick={() => { setCustomerId(c.id); setCustomerSearch(c.shopName || c.contactPerson); }} className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50">{c.shopName || c.contactPerson} — {c.city}</button>
            ))}</div>
          )}
        </div>
        <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount (LKR) *</label><input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={cls} placeholder="0.00" /></div>
        <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment Method</label><select value={method} onChange={e => setMethod(e.target.value)} className={cls + ' bg-white'}><option>Cash</option><option>Cheque</option><option>BankTransfer</option><option>Card</option></select></div>
        {(method === 'Cheque') && (<>
          <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Cheque Number</label><input value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} className={cls} /></div>
          <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Bank Name</label><input value={bankName} onChange={e => setBankName(e.target.value)} className={cls} /></div>
        </>)}
        {method === 'BankTransfer' && <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Reference Number</label><input value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} className={cls} /></div>}
        <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={cls + ' resize-none'} placeholder="Optional notes" /></div>
        <button onClick={() => onSubmit({ customerId, amount: parseFloat(amount), paymentMethod: method, referenceNumber: referenceNumber || undefined, chequeNumber: chequeNumber || undefined, bankName: bankName || undefined, notes: notes || undefined })} disabled={isPending || !customerId || !amount} className="w-full py-3.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 active:scale-95">
          {isPending ? 'Recording...' : `Record ${amount ? formatCurrency(parseFloat(amount)) : 'Payment'}`}
        </button>
      </div>
    </div></div>
  );
}
