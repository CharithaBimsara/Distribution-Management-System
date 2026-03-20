import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../../services/api/ordersApi';
import { customersApi } from '../../services/api/customersApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ShoppingCart, Plus } from 'lucide-react';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { type Column } from '../../components/common/DataTable';
import MobileTileList from '../../components/common/MobileTileList';
import StatusBadge from '../../components/common/StatusBadge';
import type { Order, OrderStatus } from '../../types/order.types';

const STATUS_PILLS = ['', 'Pending', 'Approved', 'Processing', 'Dispatched', 'Delivered'];

export default function RepOrders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  const { data, isLoading } = useQuery({
    queryKey: ['rep-orders', page, status],
    queryFn: () => ordersApi.repGetAll({ page, pageSize: 20, status: status || undefined as OrderStatus | undefined }).then(r => r.data.data),
  });

  const { data: customersData } = useQuery({
    queryKey: ['rep-order-customer-names'],
    queryFn: () => customersApi.repGetCustomers({ page: 1, pageSize: 2000 }).then((r) => r.data.data.items),
  });

  const orders = data?.items || [];
  const customerNameById = new Map((customersData || []).map((c) => [c.id, c.shopName]));
  const totalPages = data?.totalPages || (data ? Math.ceil(data.totalCount / data.pageSize) : 0);
  const mobilePendingCount = orders.filter((o) => o.status === 'Pending').length;
  const mobileTotalValue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const getCustomerDisplayName = (order: Order) => {
    const fromCustomerList = customerNameById.get(order.customerId);
    if (fromCustomerList) return fromCustomerList;
    if (!order.customerName) return 'Customer';
    return order.customerName.includes('@') ? 'Customer' : order.customerName;
  };

  const columns: Column<Order>[] = [
    {
      key: 'orderNumber', header: 'Order #',
      render: (o) => (
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-slate-800">{o.orderNumber}</span>
          {o.isFromApprovedQuotation && (
            <span className="inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Approved Quotation
            </span>
          )}
        </div>
      ),
    },
    { key: 'customerName', header: 'Customer', className: 'w-[22%]', render: (o) => <span className="truncate block" title={getCustomerDisplayName(o)}>{getCustomerDisplayName(o)}</span> },
    { key: 'orderDate', header: 'Date', render: (o) => <span className="text-sm text-slate-500">{formatDate(o.orderDate)}</span> },
    { key: 'totalAmount', header: 'Total', className: 'w-[14%]', align: 'right' as const, render: (o) => <span className="font-semibold tabular-nums">{formatCurrency(o.totalAmount)}</span> },
    { key: 'items', header: 'Items', align: 'center' as const, render: (o) => o.items?.length || 0 },
    { key: 'status', header: 'Status', className: 'w-[14%]', align: 'center' as const, render: (o) => <StatusBadge status={o.status} type="orders" /> },
  ];

  const handleRowClick = (o: Order) => {
    navigate(`/rep/orders/${o.id}`);
  };

  return (
    <div className="animate-fade-in space-y-4 lg:space-y-6">
      <PageHeader title="My Orders" subtitle="Orders placed for customers"
        actions={[{ label: 'New Order', onClick: () => navigate('/rep/orders/new'), icon: Plus, variant: 'primary' as const }]} />

      {/* Status Filters */}
      {!isDesktop && (
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <SummaryMiniCard label="On This Page" value={String(orders.length)} />
          <SummaryMiniCard label="Pending" value={String(mobilePendingCount)} tone="amber" />
          <SummaryMiniCard label="Value" value={formatCurrency(mobileTotalValue)} tone="emerald" />
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {STATUS_PILLS.map(s => (
          <button key={s} onClick={() => { setStatus(s as OrderStatus | ''); setPage(1); }}
            className={`px-4 md:px-4.5 py-2.5 md:py-2 rounded-xl text-xs md:text-[13px] font-semibold whitespace-nowrap transition ${
              status === s ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}>{s || 'All'}</button>
        ))}
      </div>

      {isDesktop ? (
        <DataTable columns={columns} data={orders} isLoading={isLoading} keyExtractor={(o) => o.id}
          onRowClick={handleRowClick} emptyIcon={<ShoppingCart className="w-12 h-12 text-slate-300" />}
          emptyTitle="No orders found" emptyDescription="Try changing the filter"
          page={page} totalPages={totalPages} onPageChange={setPage} />
      ) : (
        <MobileTileList data={orders} isLoading={isLoading} keyExtractor={(o) => o.id}
          onTileClick={handleRowClick} page={page} totalPages={totalPages} onPageChange={setPage}
          renderTile={(o) => (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-3.5 py-3.5 md:px-4 md:py-4">
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-sm md:text-[15px] font-bold text-slate-800 truncate">{o.orderNumber}</span>
                  {o.isFromApprovedQuotation && (
                    <span className="inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Approved Quotation
                    </span>
                  )}
                </div>
                <StatusBadge status={o.status} type="orders" />
              </div>

              <p className="text-sm text-slate-700 truncate">{getCustomerDisplayName(o)}</p>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Date</p>
                  <p className="text-xs md:text-sm font-medium text-slate-700 mt-0.5">{formatDate(o.orderDate)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-2 text-right">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Amount</p>
                  <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5 truncate">{formatCurrency(o.totalAmount)}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Items: {o.items?.length || 0}</span>
                <span className="text-xs font-semibold text-emerald-600">Tap for details</span>
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}

function SummaryMiniCard({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: string;
  tone?: 'slate' | 'amber' | 'emerald';
}) {
  const toneClass =
    tone === 'amber'
      ? 'bg-amber-50 border-amber-100 text-amber-700'
      : tone === 'emerald'
      ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
      : 'bg-white border-slate-200 text-slate-700';

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-wide font-semibold opacity-80">{label}</p>
      <p className="text-sm md:text-base font-bold mt-0.5 truncate">{value}</p>
    </div>
  );
}
