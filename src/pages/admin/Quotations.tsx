import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminGetQuotations } from '../../services/api/quotationApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { FileText, Search } from 'lucide-react';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import DataTable, { type Column } from '../../components/common/DataTable';
import MobileTileList from '../../components/common/MobileTileList';
import BottomSheet from '../../components/common/BottomSheet';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';

const statuses = ['', 'Draft', 'Submitted', 'UnderReview', 'Approved', 'Rejected', 'ConvertedToOrder', 'Expired'] as const;

export default function AdminQuotations() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-quotations', page, statusFilter, search],
    queryFn: () => adminGetQuotations(page, 20, statusFilter || undefined, search || undefined),
  });

  const quotations = (data as any)?.items || [];

  const handleRowClick = (q: any) => {
    if (isDesktop) {
      setSelectedQuotation(q); // Show in modal on desktop too since no detail page
    } else {
      setSelectedQuotation(q);
    }
  };

  const columns: Column<any>[] = [
    { key: 'number', header: 'Quotation #', render: (q) => <span className="font-semibold text-slate-900">{q.quotationNumber}</span> },
    { key: 'customer', header: 'Customer', render: (q) => <span className="text-slate-700">{q.customerName || '—'}</span> },
    { key: 'rep', header: 'Rep', render: (q) => <span className="text-slate-500">{q.repName || '—'}</span> },
    { key: 'total', header: 'Total', align: 'right', render: (q) => <span className="font-semibold text-slate-900">{formatCurrency(q.totalAmount)}</span> },
    { key: 'validUntil', header: 'Valid Until', render: (q) => <span className="text-slate-500 text-xs">{q.validUntil ? formatDate(q.validUntil) : '—'}</span> },
    { key: 'status', header: 'Status', align: 'center', render: (q) => <StatusBadge status={q.status} /> },
  ];

  return (
    <div className="animate-fade-in space-y-4 lg:space-y-6">
      <PageHeader title="Quotations" subtitle="View all quotations" />

      {/* Search + Status Filter */}
      <div className="space-y-3">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search quotation #, customer..." className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {statuses.map(s => (
            <button key={s || 'all'} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${statusFilter === s ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {s ? s.replace(/([A-Z])/g, ' $1').trim() : 'All'}
            </button>
          ))}
        </div>
      </div>

      {isDesktop ? (
        <DataTable columns={columns} data={quotations} keyExtractor={q => q.id} onRowClick={handleRowClick} isLoading={isLoading} emptyMessage="No quotations found" emptyIcon={<FileText className="w-10 h-10" />} page={data?.page} totalPages={data?.totalPages} totalCount={data?.totalCount} onPageChange={setPage} />
      ) : (
        <MobileTileList data={quotations} keyExtractor={q => q.id} onTileClick={handleRowClick} isLoading={isLoading} emptyMessage="No quotations found" emptyIcon={<FileText className="w-10 h-10" />} page={data?.page} totalPages={data?.totalPages} onPageChange={setPage}
          renderTile={(q: any) => (
            <div className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{q.quotationNumber}</p>
                  <p className="text-sm text-slate-500 truncate">{q.customerName || '—'}</p>
                </div>
                <StatusBadge status={q.status} />
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                <span>Rep: {q.repName || '—'}</span>
                {q.validUntil && <span>Valid: {formatDate(q.validUntil)}</span>}
              </div>
              <div className="pt-3 border-t border-slate-50">
                <p className="font-bold text-slate-900">{formatCurrency(q.totalAmount)}</p>
              </div>
            </div>
          )}
        />
      )}

      {/* Quotation Detail */}
      {selectedQuotation && (
        <BottomSheet open={true} onClose={() => setSelectedQuotation(null)} title={`Quotation ${selectedQuotation.quotationNumber}`}>
          <div className="p-5 space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Customer</span><span className="font-medium">{selectedQuotation.customerName || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Rep</span><span>{selectedQuotation.repName || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span><StatusBadge status={selectedQuotation.status} /></div>
              <div className="flex justify-between"><span className="text-slate-500">Valid Until</span><span>{selectedQuotation.validUntil ? formatDate(selectedQuotation.validUntil) : '—'}</span></div>
            </div>
            <hr className="border-slate-100" />
            {selectedQuotation.items?.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Items</h4>
                <div className="space-y-2">{selectedQuotation.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm bg-slate-50 rounded-lg p-2.5">
                    <span className="text-slate-700">{item.productName} × {item.quantity}</span>
                    <span className="font-medium">{formatCurrency(item.lineTotal)}</span>
                  </div>
                ))}</div>
              </div>
            )}
            <hr className="border-slate-100" />
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(selectedQuotation.subTotal || 0)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tax</span><span>{formatCurrency(selectedQuotation.taxAmount || 0)}</span></div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-100"><span>Total</span><span>{formatCurrency(selectedQuotation.totalAmount)}</span></div>
            </div>
            {selectedQuotation.notes && <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3">{selectedQuotation.notes}</p>}
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
