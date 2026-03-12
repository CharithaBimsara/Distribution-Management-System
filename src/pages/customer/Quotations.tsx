import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { customerGetQuotations, customerCreateQuotation, customerConvertQuotation } from '../../services/api/quotationApi';
import { productsApi } from '../../services/api/productsApi';
import { formatCurrency, formatRelative } from '../../utils/formatters';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { type Column } from '../../components/common/DataTable';
import MobileTileList from '../../components/common/MobileTileList';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import BottomSheet from '../../components/common/BottomSheet';
import { FileText, Plus, Search, X, Loader2, ShoppingCart, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Quotation, QuotationStatus, CreateQuotationItemRequest } from '../../types/quotation.types';

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Submitted', value: 'Submitted' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Rejected', value: 'Rejected' },
  { label: 'Converted', value: 'ConvertedToOrder' },
];

export default function CustomerQuotations() {
  const queryClient = useQueryClient();
  const desktop = useIsDesktop();
  const { user } = useSelector((state: RootState) => state.auth);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [convertQuotation, setConvertQuotation] = useState<Quotation | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Create form state
  const [notes, setNotes] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<(CreateQuotationItemRequest & { productName: string; unitPrice: number })[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['customer-quotations', page, statusFilter],
    queryFn: () => customerGetQuotations(page, 20, statusFilter || undefined),
  });

  const { data: products } = useQuery({
    queryKey: ['customer-products-for-quotation', productSearch],
    queryFn: () => productsApi.getAll({ page: 1, pageSize: 50, search: productSearch || undefined }).then((r) => r.data.data.items),
    enabled: showCreate,
  });

  const createMut = useMutation({
    mutationFn: () =>
      customerCreateQuotation({
        customerId: user?.id || '',
        notes: notes || undefined,
        items: selectedItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          expectedPrice: i.expectedPrice,
          discountPercent: i.discountPercent,
        })),
      }),
    onSuccess: () => {
      toast.success('Quotation request submitted!');
      setShowCreate(false);
      setSelectedItems([]);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['customer-quotations'] });
    },
    onError: () => toast.error('Failed to submit quotation'),
  });

  const convertMut = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      customerConvertQuotation(id, {
        deliveryAddress: deliveryAddress || undefined,
        deliveryNotes: deliveryNotes || undefined,
      }),
    onSuccess: () => {
      toast.success('Quotation converted to order!');
      setConvertQuotation(null);
      queryClient.invalidateQueries({ queryKey: ['customer-quotations'] });
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
    },
    onError: () => toast.error('Failed to convert quotation'),
  });

  const addProduct = (product: any) => {
    if (selectedItems.find((i) => i.productId === product.id)) return;
    setSelectedItems((prev) => [
      ...prev,
      { productId: product.id, productName: product.name, unitPrice: product.price, quantity: 1, expectedPrice: product.price, discountPercent: 0 },
    ]);
  };

  const updateItem = (productId: string, field: string, value: number) => {
    setSelectedItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, [field]: value } : i)));
  };

  const removeItem = (productId: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const quotations = data?.items || [];
  const totalPages = data ? Math.ceil(data.totalCount / data.pageSize) : 0;

  const handleRowClick = (q: Quotation) => {
    if (!desktop) setSelectedQuotation(q);
  };

  /* ─── Desktop Columns ─── */
  const columns: Column<Quotation>[] = [
    { key: 'quotationNumber', header: 'Quotation #', render: (q) => <span className="font-semibold text-slate-900">{q.quotationNumber}</span> },
    { key: 'items', header: 'Items', align: 'center', render: (q) => <span className="text-slate-500">{q.items?.length || 0}</span> },
    { key: 'totalAmount', header: 'Total', align: 'right', render: (q) => <span className="font-semibold text-slate-900">{formatCurrency(q.totalAmount)}</span> },
    { key: 'status', header: 'Status', render: (q) => <StatusBadge status={q.status} /> },
    { key: 'createdAt', header: 'Created', render: (q) => <span className="text-slate-400 text-xs">{formatRelative(q.createdAt)}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (q) =>
        q.status === 'Approved' && !q.convertedOrderId ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConvertQuotation(q);
            }}
            className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1"
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Convert
          </button>
        ) : q.convertedOrderId ? (
          <span className="text-xs text-indigo-500 font-medium">Converted</span>
        ) : null,
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="My Quotations"
        subtitle={`${data?.totalCount || 0} quotations`}
        actions={[{ label: 'Request Quote', icon: Plus, onClick: () => setShowCreate(true) }]}
      />

      <div className="px-4 lg:px-6 pb-6 space-y-4">
        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === f.value
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Data */}
        {desktop ? (
          <DataTable
            data={quotations}
            columns={columns}
            keyField="id"
            isLoading={isLoading}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            onRowClick={handleRowClick}
            emptyState={
              <EmptyState
                icon={FileText}
                title="No quotations yet"
                description="Request a quote to get started"
                action={{ label: 'Request Quote', onClick: () => setShowCreate(true) }}
              />
            }
          />
        ) : (
          <MobileTileList
            data={quotations}
            keyField="id"
            isLoading={isLoading}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            onTileClick={handleRowClick}
            emptyState={
              <EmptyState
                icon={FileText}
                title="No quotations yet"
                description="Request a quote to get started"
                action={{ label: 'Request Quote', onClick: () => setShowCreate(true) }}
              />
            }
            renderTile={(q) => (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{q.quotationNumber}</p>
                      <p className="text-[11px] text-slate-400">{q.items?.length || 0} items</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">{formatRelative(q.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(q.totalAmount)}</p>
                    <StatusBadge status={q.status} />
                  </div>
                </div>
                {q.rejectionReason && (
                  <div className="mt-2 bg-red-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-red-600">
                      <span className="font-semibold">Rejected:</span> {q.rejectionReason}
                    </p>
                  </div>
                )}
                {q.status === 'Approved' && !q.convertedOrderId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConvertQuotation(q);
                    }}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> Convert to Order <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                {q.convertedOrderId && (
                  <div className="mt-2 bg-indigo-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-indigo-600 font-medium">Converted to order</p>
                  </div>
                )}
              </div>
            )}
          />
        )}
      </div>

      {/* Mobile Bottom Sheet — Quotation Detail */}
      <BottomSheet open={!!selectedQuotation && !desktop} onClose={() => setSelectedQuotation(null)} title={selectedQuotation?.quotationNumber || 'Quotation'}>
        {selectedQuotation && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <StatusBadge status={selectedQuotation.status} />
              <span className="text-lg font-bold text-indigo-600">{formatCurrency(selectedQuotation.totalAmount)}</span>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 text-sm mb-2">Items</h3>
              <div className="bg-slate-50 rounded-xl divide-y divide-slate-100">
                {selectedQuotation.items?.map((item: any) => (
                  <div key={item.id || item.productId} className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-sm text-slate-700">{item.productName}</p>
                      <p className="text-xs text-slate-400">x{item.quantity}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{formatCurrency(item.lineTotal || item.expectedPrice * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedQuotation.notes && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 font-medium mb-1">Notes</p>
                <p className="text-sm text-slate-700">{selectedQuotation.notes}</p>
              </div>
            )}

            {selectedQuotation.rejectionReason && (
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-xs text-red-400 font-medium mb-1">Rejection Reason</p>
                <p className="text-sm text-red-600">{selectedQuotation.rejectionReason}</p>
              </div>
            )}

            {selectedQuotation.status === 'Approved' && !selectedQuotation.convertedOrderId && (
              <button
                onClick={() => {
                  setConvertQuotation(selectedQuotation);
                  setSelectedQuotation(null);
                }}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2 transition"
              >
                <ShoppingCart className="w-4 h-4" /> Convert to Order
              </button>
            )}
          </div>
        )}
      </BottomSheet>

      {/* Create Quotation Bottom Sheet / Modal */}
      <BottomSheet open={showCreate} onClose={() => setShowCreate(false)} title="Request Quotation">
        <div className="space-y-4">
          {/* Product Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
            />
          </div>

          {/* Product Grid */}
          {products && products.length > 0 && (
            <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
              {products
                .filter((p: any) => !selectedItems.find((s) => s.productId === p.id))
                .slice(0, 10)
                .map((p: any) => (
                  <button key={p.id} onClick={() => addProduct(p)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition text-left">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{p.name}</p>
                      <p className="text-[11px] text-slate-400">{p.sku}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{formatCurrency(p.price)}</span>
                      <Plus className="w-4 h-4 text-indigo-500" />
                    </div>
                  </button>
                ))}
            </div>
          )}

          {/* Selected Items */}
          {selectedItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500">{selectedItems.length} item(s) selected</p>
              {selectedItems.map((item) => (
                <div key={item.productId} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-700">{item.productName}</p>
                    <button onClick={() => removeItem(item.productId)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(item.productId, 'quantity', +e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Expected Price</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.expectedPrice}
                        onChange={(e) => updateItem(item.productId, 'expectedPrice', +e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Discount %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={item.discountPercent}
                        onChange={(e) => updateItem(item.productId, 'discountPercent', +e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Add notes..." className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none resize-none" />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending || selectedItems.length === 0}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-indigo-700 transition"
            >
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Submit
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Convert to Order Bottom Sheet / Modal */}
      <BottomSheet open={!!convertQuotation} onClose={() => setConvertQuotation(null)} title="Convert to Order">
        {convertQuotation && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              {convertQuotation.quotationNumber} — {formatCurrency(convertQuotation.totalAmount)}
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Delivery Address (optional)</label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Delivery Notes (optional)</label>
              <textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none resize-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConvertQuotation(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button
                onClick={() => convertMut.mutate({ id: convertQuotation.id })}
                disabled={convertMut.isPending}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition"
              >
                {convertMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />} Convert
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
