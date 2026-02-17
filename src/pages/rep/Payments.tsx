import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../../services/api/paymentsApi';
import { customersApi } from '../../services/api/customersApi';
import { formatCurrency, formatDate, statusColor } from '../../utils/formatters';
import { DollarSign, Plus, X, CreditCard, User } from 'lucide-react';
import { orderDraftUtils } from '../../utils/orderDraft';
import { toApiPaymentMethod } from '../../utils/paymentUtils';
import type { Payment, PaymentRecord } from '../../types/payment.types';
import toast from 'react-hot-toast';

export default function RepPayments() {
  const [page, setPage] = useState(1);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const queryClient = useQueryClient();
  const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (showRecordForm && !isDesktop()) {
      // lock background scroll while sheet is open (mobile)
      document.body.style.overflow = 'hidden';
      try { window.scrollTo({ top: 0, behavior: 'instant' as any }); } catch {}
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showRecordForm]);

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
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-5 pt-5 pb-6 relative z-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="flex items-center justify-between">
          <div><h1 className="text-white text-xl font-bold">Payments</h1><p className="text-emerald-200 text-sm mt-0.5">Record and track collections</p></div>
          <button onClick={() => { if (isDesktop()) { navigate('/rep/payments/new'); } else { setShowRecordForm(true); } }} className="flex items-center gap-1.5 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl text-sm font-semibold hover:bg-white/30 transition active:scale-95"><Plus className="w-4 h-4" /> Record</button>
        </div>
      </div>

      <div className="px-4 space-y-3 -mt-3 pb-6 relative z-10">
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

function CustomerSelectBlock({ draftCustomerId, draftCustomerName, localCustomerId, setCustomerId, cls }: any) {
  // simple dropdown for payment record forms (desktop modal + mobile sheet)
  const current = draftCustomerId() || localCustomerId || '';
  const { data: customersList } = useQuery({ queryKey: ['rep-customers-dropdown'], queryFn: () => customersApi.repGetCustomers({ page: 1, pageSize: 200 }).then(r => r.data.data) });

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Customer *</label>
      <select value={current} onChange={e => {
        const id = e.target.value;
        const sel = customersList?.items?.find((c: any) => c.id === id);
        setCustomerId(id, sel ? (sel.shopName || sel.phoneNumber || sel.id) : undefined);
      }} className={cls}>
        <option value="">Select customer...</option>
        {customersList?.items?.map((c: any) => (
          <option key={c.id} value={c.id}>{c.shopName || c.contactPerson} — {c.city}</option>
        ))}
      </select>
    </div>
  );
}

function RecordPaymentSheet({ onClose, onSubmit, isPending }: { onClose: () => void; onSubmit: (d: PaymentRecord) => void; isPending: boolean }) {
  const [customerId, setCustomerId] = useState(orderDraftUtils.get().customerId || '');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [notes, setNotes] = useState('');

  const cls = 'w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none';
  const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

  // Desktop: centered modal (different from mobile bottom-sheet)
  if (typeof window !== 'undefined' && isDesktop()) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 text-lg">Record Payment</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
          </div>

          <div className="p-0 space-y-4">
            <CustomerSelectBlock
              draftCustomerId={() => orderDraftUtils.get().customerId}
              draftCustomerName={() => orderDraftUtils.get().customerName}
              localCustomerId={customerId}
              setCustomerId={(id: string, label?: string) => { setCustomerId(id); orderDraftUtils.setCustomer(id, label || ''); }}
              cls={cls}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount (LKR) *</label>
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={cls} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment Method</label>
                <select value={method} onChange={e => setMethod(e.target.value)} className={cls + ' bg-white'}>
                  <option>Cash</option>
                  <option>Cheque</option>
                  <option>BankTransfer</option>
                  <option>Card</option>
                </select>
              </div>
            </div>

            {method === 'Cheque' && <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cheque Number</label>
                <input value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} className={cls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bank Name</label>
                <input value={bankName} onChange={e => setBankName(e.target.value)} className={cls} />
              </div>
            </div>}

            {method === 'BankTransfer' && <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reference Number</label>
              <input value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} className={cls} />
            </div>}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
              <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={cls + ' resize-none'} placeholder="Optional notes" />
            </div>

            <div className="mt-2">
              <button onClick={() => onSubmit({ customerId: (customerId || orderDraftUtils.get().customerId) as string, amount: parseFloat(amount), paymentMethod: toApiPaymentMethod(method), referenceNumber: referenceNumber || undefined, chequeNumber: chequeNumber || undefined, bankName: bankName || undefined, notes: notes || undefined })} disabled={isPending || !(customerId || orderDraftUtils.get().customerId) || !amount} className="w-full py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">
                {isPending ? 'Recording...' : `Record Payment`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile: bottom-sheet (portal)
  return createPortal(
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="fixed inset-0 bottom-16 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      <div className="fixed bottom-16 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up pb-safe pointer-events-auto">
        <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100 z-10"><div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" /><div className="flex items-center justify-between"><h2 className="font-bold text-slate-900 text-lg">Record Payment</h2><button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button></div></div>
        <div className="p-6 space-y-4">
          <div>
            <CustomerSelectBlock
              draftCustomerId={() => orderDraftUtils.get().customerId}
              draftCustomerName={() => orderDraftUtils.get().customerName}
              localCustomerId={customerId}
              setCustomerId={(id: string, label?: string) => { setCustomerId(id); orderDraftUtils.setCustomer(id, label || ''); }}
              cls={cls}
            />
          </div>
          <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount (LKR) *</label><input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={cls} placeholder="0.00" /></div>
          <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment Method</label><select value={method} onChange={e => setMethod(e.target.value)} className={cls + ' bg-white'}><option>Cash</option><option>Cheque</option><option>BankTransfer</option><option>Card</option></select></div>
          {method === 'Cheque' && <>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Cheque Number</label><input value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} className={cls} /></div>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Bank Name</label><input value={bankName} onChange={e => setBankName(e.target.value)} className={cls} /></div>
          </>}
          {method === 'BankTransfer' && <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Reference Number</label><input value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} className={cls} /></div>}
          <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={cls + ' resize-none'} placeholder="Optional notes" /></div>
<div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={onClose} className="w-full py-2.5 bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
            <button onClick={() => onSubmit({ customerId: (customerId || orderDraftUtils.get().customerId) as string, amount: parseFloat(amount), paymentMethod: toApiPaymentMethod(method), referenceNumber: referenceNumber || undefined, chequeNumber: chequeNumber || undefined, bankName: bankName || undefined, notes: notes || undefined })} disabled={isPending || !(customerId || orderDraftUtils.get().customerId) || !amount} className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {isPending ? 'Recording...' : `Record ${amount ? formatCurrency(parseFloat(amount)) : 'Payment'}`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
