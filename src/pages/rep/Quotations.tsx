import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repGetQuotations, repCreateQuotation } from '../../services/api/quotationApi';
import { customersApi } from '../../services/api/customersApi';
import { productsApi } from '../../services/api/productsApi';
import { formatCurrency, formatRelative } from '../../utils/formatters';
import { FileText, Plus, X, Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { type Column } from '../../components/common/DataTable';
import MobileTileList from '../../components/common/MobileTileList';
import BottomSheet from '../../components/common/BottomSheet';
import StatusBadge from '../../components/common/StatusBadge';
import type { Quotation, QuotationStatus, CreateQuotationItemRequest } from '../../types/quotation.types';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Submitted', value: 'Submitted' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Rejected', value: 'Rejected' },
  { label: 'Converted', value: 'ConvertedToOrder' },
];

export default function RepQuotations() {
  const queryClient = useQueryClient();
  const isDesktop = useIsDesktop();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Quotation | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['rep-quotations', page, statusFilter],
    queryFn: () => repGetQuotations(page, 20, statusFilter || undefined),
  });

  const quotations = data?.items || [];
  const totalPages = data ? Math.ceil(data.totalCount / data.pageSize) : 0;

  const columns: Column<Quotation>[] = [
    {
      key: 'quotationNumber', header: 'Quotation',
      render: (q) => (
        <div>
          <p className="font-semibold text-slate-800">{q.quotationNumber}</p>
          <p className="text-xs text-slate-400">{formatRelative(q.createdAt)}</p>
        </div>
      ),
    },
    { key: 'customerName', header: 'Customer', render: (q) => q.customerName || q.shopName || '—' },
    { key: 'totalAmount', header: 'Total', align: 'right' as const, render: (q) => <span className="font-semibold">{formatCurrency(q.totalAmount)}</span> },
    { key: 'items', header: 'Items', align: 'center' as const, render: (q) => q.items?.length || 0 },
    { key: 'status', header: 'Status', align: 'center' as const, render: (q) => <StatusBadge status={q.status} type="quotations" /> },
  ];

  return (
    <div className="animate-fade-in space-y-4 lg:space-y-6">
      <PageHeader title="Quotations" subtitle={`${data?.totalCount || 0} quotations`}
        actions={[{ label: 'New Quote', onClick: () => setShowCreate(true), icon: Plus, variant: 'primary' as const }]} />

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {STATUS_FILTERS.map(f => (
          <button key={f.value} onClick={() => { setStatusFilter(f.value); setPage(1); }}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === f.value ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>{f.label}</button>
        ))}
      </div>

      {isDesktop ? (
        <DataTable columns={columns} data={quotations} isLoading={isLoading} keyExtractor={(q) => q.id}
          onRowClick={(q) => setSelected(q)} emptyIcon={<FileText className="w-12 h-12 text-slate-300" />}
          emptyTitle="No quotations yet" page={page} totalPages={totalPages} onPageChange={setPage} />
      ) : (
        <MobileTileList data={quotations} isLoading={isLoading} keyExtractor={(q) => q.id}
          onTileClick={(q) => setSelected(q)} page={page} totalPages={totalPages} onPageChange={setPage}
          renderTile={(q) => (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{q.quotationNumber}</p>
                    <p className="text-[11px] text-slate-400">{q.customerName || q.shopName}</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">{formatRelative(q.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-slate-800">{formatCurrency(q.totalAmount)}</p>
                  <StatusBadge status={q.status} type="quotations" />
                </div>
              </div>
              {q.rejectionReason && (
                <div className="mt-2 bg-red-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-red-600"><span className="font-semibold">Rejected:</span> {q.rejectionReason}</p>
                </div>
              )}
            </div>
          )}
        />
      )}

      {/* Quotation Detail BottomSheet */}
      <BottomSheet isOpen={!!selected && !showCreate} onClose={() => setSelected(null)} title={selected?.quotationNumber || 'Quotation'}>
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{selected.quotationNumber}</p>
                <p className="text-sm text-slate-500">{selected.customerName || selected.shopName}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">{formatCurrency(selected.totalAmount)}</p>
                <StatusBadge status={selected.status} type="quotations" />
              </div>
            </div>
            {selected.items?.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-3 space-y-1">
                <p className="text-xs font-semibold text-slate-600 mb-2">Items</p>
                {selected.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm text-slate-600 py-1">
                    <span>{item.productName} x{item.quantity}</span>
                    <span className="font-medium">{formatCurrency(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
            )}
            {selected.rejectionReason && (
              <div className="bg-red-50 rounded-xl px-4 py-3">
                <p className="text-sm text-red-600"><strong>Rejected:</strong> {selected.rejectionReason}</p>
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      {/* Create Quotation BottomSheet */}
      <BottomSheet isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Quotation">
        <CreateQuotationForm
          onSuccess={() => { setShowCreate(false); queryClient.invalidateQueries({ queryKey: ['rep-quotations'] }); }}
          onCancel={() => setShowCreate(false)}
        />
      </BottomSheet>
    </div>
  );
}

function CreateQuotationForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<(CreateQuotationItemRequest & { productName: string; unitPrice: number })[]>([]);

  const { data: customers } = useQuery({
    queryKey: ['rep-customers-for-quotation'],
    queryFn: () => customersApi.repGetCustomers({ page: 1, pageSize: 200 }).then(r => r.data.data.items),
  });

  const { data: products } = useQuery({
    queryKey: ['rep-products-for-quotation', productSearch],
    queryFn: () => productsApi.getAll({ page: 1, pageSize: 50, search: productSearch || undefined }).then(r => r.data.data.items),
  });

  const createMut = useMutation({
    mutationFn: () => repCreateQuotation({
      customerId: selectedCustomerId,
      notes: notes || undefined,
      items: selectedItems.map(i => ({ productId: i.productId, quantity: i.quantity, expectedPrice: i.expectedPrice, discountPercent: i.discountPercent })),
    }),
    onSuccess: () => { toast.success('Quotation created!'); onSuccess(); },
    onError: () => toast.error('Failed to create quotation'),
  });

  const addProduct = (p: any) => {
    if (selectedItems.find(i => i.productId === p.id)) return;
    setSelectedItems(prev => [...prev, { productId: p.id, productName: p.name, unitPrice: p.price, quantity: 1, expectedPrice: p.price, discountPercent: 0 }]);
    setProductSearch('');
  };

  const updateItem = (pid: string, field: string, value: number) => {
    setSelectedItems(prev => prev.map(i => i.productId === pid ? { ...i, [field]: value } : i));
  };

  const cls = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300';

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer</label>
        <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className={cls}>
          <option value="">Select customer...</option>
          {customers?.map((c: any) => <option key={c.id} value={c.id}>{c.shopName}</option>)}
        </select>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Search products..." value={productSearch} onChange={e => setProductSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none" />
      </div>

      {products && products.length > 0 && (
        <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
          {products.filter((p: any) => !selectedItems.find(s => s.productId === p.id)).slice(0, 10).map((p: any) => (
            <button key={p.id} onClick={() => addProduct(p)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 text-left">
              <div className="min-w-0"><p className="text-sm font-medium text-slate-700 truncate">{p.name}</p><p className="text-[11px] text-slate-400">{p.sku}</p></div>
              <div className="flex items-center gap-2"><span className="text-sm font-semibold">{formatCurrency(p.price)}</span><Plus className="w-4 h-4 text-indigo-500" /></div>
            </button>
          ))}
        </div>
      )}

      {selectedItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500">{selectedItems.length} item(s)</p>
          {selectedItems.map(item => (
            <div key={item.productId} className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-700">{item.productName}</p>
                <button onClick={() => setSelectedItems(prev => prev.filter(i => i.productId !== item.productId))} className="p-1 text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-[10px] text-slate-400">Qty</label><input type="number" min={1} value={item.quantity} onChange={e => updateItem(item.productId, 'quantity', +e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" /></div>
                <div><label className="text-[10px] text-slate-400">Price</label><input type="number" min={0} step={0.01} value={item.expectedPrice} onChange={e => updateItem(item.productId, 'expectedPrice', +e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" /></div>
                <div><label className="text-[10px] text-slate-400">Discount %</label><input type="number" min={0} max={100} value={item.discountPercent} onChange={e => updateItem(item.productId, 'discountPercent', +e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" /></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes (optional)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={cls + ' resize-none'} />
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
        <button onClick={() => createMut.mutate()} disabled={createMut.isPending || !selectedCustomerId || selectedItems.length === 0}
          className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
          {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Submit
        </button>
      </div>
    </div>
  );
}
