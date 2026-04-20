import { useState, useEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../services/api/ordersApi';
import { repsApi } from '../../services/api/repsApi';
import { customersApi } from '../../services/api/customersApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getShopName } from '../../utils/shopName';
import {
  ShoppingCart, CheckCircle, XCircle, ChevronRight,
  Search, Trash2, X, FileSpreadsheet, FileText,
  SlidersHorizontal, RefreshCw, Package
} from 'lucide-react';
import type { Order, OrderStatus } from '../../types/order.types';
import { ORDER_STATUSES } from '../../types/order.types';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import MobileTileList from '../../components/common/MobileTileList';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';

const statusOptions: (OrderStatus | '')[] = ['', ...ORDER_STATUSES];
const selectCls =
  'px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition cursor-pointer';

export default function AdminOrders() {
  // Filter state
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [search, setSearch] = useState('');
  const [repIdFilter, setRepIdFilter] = useState('');
  const [customerIdFilter, setCustomerIdFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSingleExportDrop, setShowSingleExportDrop] = useState<string | null>(null);

  // Detail / modal state
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [statusChangeOrder, setStatusChangeOrder] = useState<Order | null>(null);
  const [statusPickerValue, setStatusPickerValue] = useState<OrderStatus | ''>('');
  const [rejectOrder, setRejectOrder] = useState<Order | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<Order | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<OrderStatus | ''>('');

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (statusChangeOrder) setStatusPickerValue(statusChangeOrder.status || '');
  }, [statusChangeOrder]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, status, fromDate, toDate, repIdFilter, customerIdFilter]);

  // Queries
  const { data: repsData } = useQuery({
    queryKey: ['reps-all'],
    queryFn: () => repsApi.adminGetAll({ pageSize: 500 }).then((r) => r.data.data?.items || []),
    staleTime: 5 * 60 * 1000,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => customersApi.adminGetAll({ pageSize: 500 }).then((r) => r.data.data?.items || []),
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, status, fromDate, toDate, repIdFilter, customerIdFilter],
    queryFn: () =>
      ordersApi
        .adminGetAll({
          page,
          pageSize: 20,
          status: status ? status : undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          repId: repIdFilter || undefined,
          customerId: customerIdFilter || undefined,
        })
        .then((r) => r.data.data),
  });

  // Mutations
  const approveMut = useMutation({
    mutationFn: (id: string) => ordersApi.adminApprove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setExpandedOrderId(null);
      toast.success('Order approved');
    },
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => ordersApi.adminReject(id, 'Rejected by admin'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setExpandedOrderId(null);
      setRejectOrder(null);
      toast.success('Order rejected');
    },
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersApi.adminUpdateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setStatusChangeOrder(null);
      toast.success('Status updated');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => ordersApi.adminDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setDeleteOrder(null);
      toast.success('Order deleted');
    },
  });

  const orders: Order[] = (data?.items || []).filter((o: Order) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q);
  });

  const reps: { id: string; fullName: string }[] = repsData || [];
  const customers: { id: string; shopName: string; customerType?: string }[] = customersData || [];

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === orders.length && orders.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(orders.map((o) => o.id)));
  };

  const handleRowClick = (e: React.MouseEvent, order: Order) => {
    if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
      toggleSelection(order.id);
      return;
    }
    setExpandedOrderId((prev) => (prev === order.id ? null : order.id));
  };

  const handleTileClick = (order: Order) => {
    setExpandedOrderId((prev) => (prev === order.id ? null : order.id));
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map((id) => ordersApi.adminDelete(id)));
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
      toast.success(`${ids.length} order(s) deleted`);
    } catch {
      toast.error('Some deletions failed');
    }
  };

  const handleBulkStatusChange = async () => {
    if (!bulkStatusValue) return;
    const ids = [...selectedIds];
    try {
      await Promise.all(
        ids.map((id) => ordersApi.adminUpdateStatus(id, { status: bulkStatusValue as OrderStatus }))
      );
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setShowBulkStatusModal(false);
      setSelectedIds(new Set());
      toast.success(`${ids.length} order(s) updated to ${bulkStatusValue}`);
    } catch {
      toast.error('Some updates failed');
    }
  };

  // Format amount cleanly without LKR symbol for tables
  const formatAmt = (amt: number | null | undefined) => {
    if (amt == null) return '0.00';
    return amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Export
  const exportOrders = async (format: 'excel' | 'pdf', onlySelected = false, singleOrder?: Order) => {
    let items: Order[] = [];
    if (singleOrder) {
      items = [singleOrder];
    } else if (onlySelected && selectedIds.size > 0) {
      items = orders.filter((o) => selectedIds.has(o.id));
    } else {
      items = orders;
    }
    if (!items.length) { toast.error('No orders to export'); return; }

    try {
      if (format === 'excel') {
        const wb = XLSX.utils.book_new();

        for (const o of items) {
          const customer = customers.find(c => c.id === o.customerId || c.shopName === o.customerName);
          const isNonTaxCustomer = (customer?.customerType || (o as any).customerType || '').toLowerCase().replace(/[-\s]/g, '') === 'nontax';

          let totalGrossAmount = 0;
          let totalTaxAmount = 0;
          let totalDiscountAmount = 0;

          const rows: (string | number | null)[][] = [];
          rows.push(['PURCHASE ORDER']);
          rows.push([]);
          rows.push(['Order #', o.orderNumber, 'Date', formatDate(o.orderDate)]);
          rows.push(['Customer', o.customerName, 'Status', o.status]);
          rows.push(['Sales Rep', o.repName || '—']);
          rows.push([]);

          const excelHeaders = ['#', 'Product', 'SKU', 'Qty', 'Rate', 'Disc %', 'Disc Amt'];
          if (!isNonTaxCustomer) {
            excelHeaders.push('Tax Code', 'Tax Amt');
          }
          excelHeaders.push('Gross Amount');
          rows.push(excelHeaders);

          // Setup Column Widths for better styling
          const colWidths = [
            { wch: 5 },   // #
            { wch: 40 },  // Product
            { wch: 15 },  // SKU
            { wch: 8 },   // Qty
            { wch: 15 },  // Rate
            { wch: 10 },  // Disc %
            { wch: 15 },  // Disc Amt
          ];
          if (!isNonTaxCustomer) {
            colWidths.push({ wch: 10 }); // Tax Code
            colWidths.push({ wch: 15 }); // Tax Amt
          }
          colWidths.push({ wch: 20 }); // Gross Amount

          (o.items || []).forEach((it, i) => {
            const rate = it.unitPrice || 0;
            const qty = it.quantity || 0;
            const discPct = it.discountPercent || 0;
            const baseAmount = rate * qty;
            const rowDiscountAmount = baseAmount * (discPct / 100);
            const rowTaxAmount = it.taxAmount || 0;

            const displayTotal = isNonTaxCustomer ? (baseAmount + rowTaxAmount) : baseAmount;

            totalGrossAmount += isNonTaxCustomer ? (baseAmount + rowTaxAmount) : baseAmount;
            if (!isNonTaxCustomer) totalTaxAmount += rowTaxAmount;
            totalDiscountAmount += rowDiscountAmount;

            const rowData: any[] = [
              i + 1, it.productName, it.productSKU || '—', qty, rate,
              discPct ? `${discPct}%` : '—', rowDiscountAmount || '—'
            ];

            if (!isNonTaxCustomer) {
              rowData.push(rowTaxAmount > 0 ? 'V18' : 'NV', rowTaxAmount || '—');
            }
            rowData.push(displayTotal);
            rows.push(rowData);
          });

          const finalAmount = isNonTaxCustomer
            ? totalGrossAmount - totalDiscountAmount
            : totalGrossAmount + totalTaxAmount - totalDiscountAmount;

          rows.push([]);
          rows.push([...Array(excelHeaders.length - 2).fill(null), 'Total Gross', totalGrossAmount]);
          if (!isNonTaxCustomer) rows.push([...Array(excelHeaders.length - 2).fill(null), 'Total Tax', totalTaxAmount]);
          rows.push([...Array(excelHeaders.length - 2).fill(null), 'Total Discount', -totalDiscountAmount]);
          rows.push([...Array(excelHeaders.length - 2).fill(null), 'GRAND TOTAL', finalAmount]);

          const ws = XLSX.utils.aoa_to_sheet(rows);
          ws['!cols'] = colWidths; // Apply dynamic column widths

          const safeName = o.orderNumber.replace(/[:/\\?*[\]]/g, '-').substring(0, 31);
          XLSX.utils.book_append_sheet(wb, ws, safeName);
        }

        const xlsxFile = items.length === 1 ? `${items[0].orderNumber}.xlsx` : 'orders-bulk-export.xlsx';
        XLSX.writeFile(wb, xlsxFile);
        toast.success('Excel exported');

      } else {
        // PDF Export - Black & White Format like image
        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        
        items.forEach((o, index) => {
          if (index > 0) doc.addPage();

          const customer = customers.find(c => c.id === o.customerId || c.shopName === o.customerName);
          const isNonTaxCustomer = (customer?.customerType || (o as any).customerType || '').toLowerCase().replace(/[-\s]/g, '') === 'nontax';

          // --- 1. Header Left ---
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text('JANASIRI DISTRIBUTORS (PVT) LTD', 14, 18);
          
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text('Reg Address: No 205 Wattarantenna Passage, Kandy.', 14, 23);
          doc.text('TP: 0814 950206 / Hotline: 0777 675322', 14, 27);
          doc.text('Email: janasiridistributors@yahoo.com / Vat 114608394-7000', 14, 31);
          doc.text('Bank AC: Sampath Bank PLC / Kandy Super Grade Branch / AC: 0007 1002 3131', 14, 35);

          // --- 2. Header Right ---
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text('PURCHASE ORDER', pageW - 14, 18, { align: 'right' });

          const boxX = pageW - 74;
          const boxY = 21;
          const boxW = 60;
          const rowH = 6;
          
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.2);
          
          // Draw Info Table
          doc.rect(boxX, boxY, boxW, rowH * 3);
          doc.line(boxX, boxY + rowH, boxX + boxW, boxY + rowH);
          doc.line(boxX, boxY + rowH * 2, boxX + boxW, boxY + rowH * 2);
          doc.line(boxX + 20, boxY, boxX + 20, boxY + rowH * 3);

          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text('Date', boxX + 2, boxY + 4);
          doc.text('Inv No', boxX + 2, boxY + rowH + 4);
          doc.text('Department', boxX + 2, boxY + rowH * 2 + 4);

          doc.text(formatDate(o.orderDate), boxX + 22, boxY + 4);
          doc.text(o.orderNumber || '', boxX + 22, boxY + rowH + 4);
          doc.text('CENTRAL', boxX + 22, boxY + rowH * 2 + 4);

          // --- 3. Supplier/Customer Box ---
          const cBoxY = 44;
          const cBoxH = 28;
          const colX = pageW / 2;

          doc.rect(14, cBoxY, pageW - 28, cBoxH);
          doc.line(14, cBoxY + 8, pageW - 14, cBoxY + 8);

          doc.setFont('helvetica', 'bold');
          doc.text('Supplier / Customer', 16, cBoxY + 6);

          const shopNameStr = customers.find(c => c.id === o.customerId)?.shopName || (o as any).shopName || o.customerName || '';

          doc.setFont('helvetica', 'normal');
          doc.text('Supplier', 16, cBoxY + 14);
          doc.text('Customer', colX + 2, cBoxY + 14);

          doc.setFont('helvetica', 'normal');
          doc.text('JANASIRI DISTRIBUTORS (PVT) LTD', 16, cBoxY + 20);
          doc.text(shopNameStr, colX + 2, cBoxY + 20);

          const cAddr = doc.splitTextToSize(o.deliveryAddress || '', (pageW / 2) - 24);
          doc.text(cAddr, 16, cBoxY + 24);

          // --- 4. Table Setup ---
          let totalGrossAmount = 0;
          let totalTaxAmount = 0;
          let totalDiscountAmount = 0;

          const tCols = isNonTaxCustomer 
            ? ['No', 'Item Code', 'Item Description', 'Qty', 'Rate', 'Disc %', 'Disc Amt', 'Gross Amount']
            : ['No', 'Item Code', 'Item Description', 'Qty', 'Rate', 'Disc %', 'Disc Amt', 'Tax Code', 'Tax Amt', 'Gross Amount'];

          const tRows = (o.items || []).map((it, i) => {
            const rate = it.unitPrice || 0;
            const qty = it.quantity || 0;
            const discPct = it.discountPercent || 0;
            
            const baseAmount = rate * qty;
            const rowDiscountAmount = baseAmount * (discPct / 100);
            const rowTaxAmount = it.taxAmount || 0;
            const taxPerUnit = qty ? rowTaxAmount / qty : 0;

            const displayTotal = isNonTaxCustomer ? (baseAmount + rowTaxAmount) : baseAmount;
            const displayRate = isNonTaxCustomer ? (rate + taxPerUnit) : rate;

            totalGrossAmount += isNonTaxCustomer ? (baseAmount + rowTaxAmount) : baseAmount;
            if (!isNonTaxCustomer) totalTaxAmount += rowTaxAmount;
            totalDiscountAmount += rowDiscountAmount;

            if (isNonTaxCustomer) {
              return [
                i + 1, it.productSKU || '', it.productName, qty, formatAmt(displayRate), 
                formatAmt(discPct), formatAmt(rowDiscountAmount), formatAmt(displayTotal)
              ];
            } else {
              return [
                i + 1, it.productSKU || '', it.productName, qty, formatAmt(rate), 
                formatAmt(discPct), formatAmt(rowDiscountAmount), 
                rowTaxAmount > 0 ? 'V18' : 'NV', formatAmt(rowTaxAmount), formatAmt(displayTotal)
              ];
            }
          });

          // Pad empty rows to make the grid look full (like the image)
          const MIN_ROWS = 10;
          while(tRows.length < MIN_ROWS) {
             tRows.push(Array(tCols.length).fill(''));
          }

          // --- 5. Render Table ---
          autoTable(doc, {
            head: [tCols],
            body: tRows,
            startY: 70,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [0,0,0], lineWidth: 0.2 },
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
            bodyStyles: { fillColor: [255, 255, 255] },
            columnStyles: {
              0: { cellWidth: 8, halign: 'center' },
              1: { cellWidth: 20 },
              2: { cellWidth: 'auto' },
              3: { cellWidth: 10, halign: 'center' },
              // Alignment based on Tax / Non-Tax
              ...isNonTaxCustomer 
                ? { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } }
                : { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'center' }, 8: { halign: 'right' }, 9: { halign: 'right' } }
            }
          });

          const afterTableY = (doc as any).lastAutoTable.finalY;

          // --- 6. Totals Box ---
          const finalAmount = isNonTaxCustomer
            ? totalGrossAmount - totalDiscountAmount
            : totalGrossAmount + totalTaxAmount - totalDiscountAmount;

          const summaryLines: { label: string; value: string; isBold?: boolean }[] = [];
          summaryLines.push({ label: 'Total Gross', value: formatAmt(totalGrossAmount) });
          if (!isNonTaxCustomer) {
            summaryLines.push({ label: 'Total Tax', value: formatAmt(totalTaxAmount) });
          }
          summaryLines.push({ label: 'Total Discount', value: formatAmt(totalDiscountAmount) });
          summaryLines.push({ label: 'Total Invoice Value', value: `LKR ${formatAmt(finalAmount)}`, isBold: true });

          const totalsRowH = 6;
          // Calculate right col widths directly from AutoTable to align perfectly
          const tableConfig = (doc as any).lastAutoTable;
          const cols = tableConfig.columns;
          let totalsW = 0;
          if(isNonTaxCustomer) {
             totalsW = cols[5].width + cols[6].width + cols[7].width;
          } else {
             totalsW = cols[7].width + cols[8].width + cols[9].width;
          }
          const totalsX = pageW - 14 - totalsW;

          let currentY = afterTableY;
          
          doc.setLineWidth(0.2);
          doc.setDrawColor(0,0,0);

          summaryLines.forEach((line) => {
            doc.rect(totalsX, currentY, totalsW, totalsRowH);
            
            if(line.isBold) {
               doc.setFont('helvetica', 'bold');
            } else {
               doc.setFont('helvetica', 'normal');
            }
            
            doc.text(line.label, totalsX + 2, currentY + 4);
            doc.text(line.value, pageW - 16, currentY + 4, { align: 'right' });
            currentY += totalsRowH;
          });

        });

        const pdfFile = items.length === 1 ? `${items[0].orderNumber}.pdf` : 'orders-bulk-export.pdf';
        doc.save(pdfFile);
        toast.success('PDF exported');
      }
    } catch (err) {
      console.error('export failed', err);
      toast.error('Export failed');
    }
  };

  const hasActiveFilters = !!(status || repIdFilter || customerIdFilter || fromDate || toDate || search);
  const clearFilters = () => {
    setStatus(''); setRepIdFilter(''); setCustomerIdFilter('');
    setFromDate(''); setToDate(''); setSearch(''); setPage(1);
  };
  const colCount = 8;

  return (
    <div className="animate-fade-in flex flex-col gap-4 pb-28">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <p className="text-slate-500 text-sm mt-1">Manage and track customer orders</p>
      </div>

      {/* Sticky Toolbar  */}
      <div className="sticky top-0 z-30">
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-2xl shadow-[0_2px_16px_-4px_rgba(0,0,0,0.10)] px-4 py-3 space-y-2.5">

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative flex-1 min-w-[180px] group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Search order # or customer"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all"
              />
              {search && (
                <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-400">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="text-xs font-medium uppercase tracking-wide">Filters</span>
            </div>

            <select value={status} onChange={(e) => { setStatus(e.target.value as OrderStatus | ''); setPage(1); }} className={selectCls}>
              <option value="">All Statuses</option>
              {statusOptions.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <select value={repIdFilter} onChange={(e) => { setRepIdFilter(e.target.value); setPage(1); }} className={selectCls}>
              <option value="">All Reps</option>
              {reps.map((r) => <option key={r.id} value={r.id}>{r.fullName}</option>)}
            </select>

            <select value={customerIdFilter} onChange={(e) => { setCustomerIdFilter(e.target.value); setPage(1); }} className={selectCls}>
              <option value="">All Customers</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.shopName}</option>)}
            </select>

            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} className={selectCls} />
            <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} className={selectCls} />

            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-medium hover:bg-red-100 transition">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Order list  */}
      {isDesktop ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-slate-400 text-sm">Loading orders</div>
          ) : orders.length === 0 ? (
            <div className="p-14 text-center">
              <ShoppingCart className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No orders found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === orders.length && orders.length > 0}
                      onChange={toggleAll}
                      className="shrink-0"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-8" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Shop Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Rep</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Items</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const customer = customers.find(c => c.id === order.customerId || c.shopName === order.customerName);
                  const isNonTaxCustomer = (customer?.customerType || (order as any).customerType || '').toLowerCase().replace(/[-\s]/g, '') === 'nontax';

                  let displayTotalGross = 0;
                  let displayTotalTax = 0;
                  let displayTotalDiscount = 0;

                  order.items?.forEach(item => {
                    const rate = item.unitPrice || 0;
                    const qty = item.quantity || 0;
                    const discPct = item.discountPercent || 0;
                    const baseAmount = rate * qty;
                    const rowDiscountAmount = baseAmount * (discPct / 100);
                    const rowTaxAmount = item.taxAmount || 0;

                    displayTotalGross += isNonTaxCustomer ? (baseAmount + rowTaxAmount) : baseAmount;
                    if (!isNonTaxCustomer) displayTotalTax += rowTaxAmount;
                    displayTotalDiscount += rowDiscountAmount;
                  });

                  const displayFinalAmount = isNonTaxCustomer
                    ? displayTotalGross - displayTotalDiscount
                    : displayTotalGross + displayTotalTax - displayTotalDiscount;

                  return (
                    <Fragment key={order.id}>
                      <tr
                        onClick={(e) => handleRowClick(e, order)}
                        className={`border-b border-slate-50 cursor-pointer transition-colors ${
                          selectedIds.has(order.id)
                            ? 'bg-indigo-50/60'
                            : expandedOrderId === order.id
                            ? 'bg-blue-50/50 border-blue-100'
                            : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(order.id)}
                            onChange={() => toggleSelection(order.id)}
                            className="shrink-0"
                          />
                        </td>
                        <td className="px-3 py-3.5 w-8">
                          <ChevronRight
                            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                              expandedOrderId === order.id ? 'rotate-90 text-blue-500' : ''
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-slate-900 text-sm">{order.orderNumber}</span>
                            {order.isFromApprovedQuotation && (
                              <span className="inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Approved Quotation
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-700">{order.customerName || '—'}</td>
                        <td className="px-4 py-3.5 text-sm text-slate-700">{customers.find(c => c.id === order.customerId)?.shopName || (order as any).shopName || order.customerName || '—'}</td>
                        <td className="px-4 py-3.5 text-sm text-slate-500">{order.repName || ''}</td>
                        <td className="px-4 py-3.5 text-sm text-slate-500">{formatDate(order.orderDate)}</td>
                        <td className="px-4 py-3.5 text-right text-sm font-semibold text-slate-900">{formatCurrency(displayFinalAmount)}</td>
                        <td className="px-4 py-3.5 text-center text-sm text-slate-500">{order.items?.length || 0}</td>
                        <td className="px-4 py-3.5 text-center"><StatusBadge status={order.status} /></td>
                      </tr>

                      {/* Inline expandable detail row  */}
                      {expandedOrderId === order.id && (
                        <tr className="border-b border-blue-100">
                          <td colSpan={colCount + 2} className="p-0">
                            <div
                              className="bg-gradient-to-b from-blue-50/70 to-slate-50/20 px-8 py-5"
                              style={{ animation: 'fadeIn 0.18s ease-out both' }}
                            >
                              <div>
                                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="font-semibold text-slate-700">{order.orderNumber}</span>
                                    <span className="text-slate-400"></span>
                                    <span className="text-slate-500">{customers.find(c => c.id === order.customerId)?.shopName || (order as any).shopName || order.customerName || '—'}</span>
                                    {order.deliveryAddress && (
                                      <>
                                        <span className="text-slate-400"></span>
                                        <span className="text-xs text-slate-400 truncate max-w-[200px]">{order.deliveryAddress}</span>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <div className="relative">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setShowSingleExportDrop(order.id); }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition"
                                      >
                                        <FileText className="w-3.5 h-3.5" /> Export
                                      </button>
                                      {showSingleExportDrop === order.id && (
                                        <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
                                          <button
                                            className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-slate-700 hover:bg-emerald-50 transition"
                                            onClick={() => { exportOrders('excel', false, order); setShowSingleExportDrop(null); }}
                                          >
                                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel
                                          </button>
                                          <div className="h-px bg-slate-100" />
                                          <button
                                            className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-slate-700 hover:bg-red-50 transition"
                                            onClick={() => { exportOrders('pdf', false, order); setShowSingleExportDrop(null); }}
                                          >
                                            <FileText className="w-3.5 h-3.5 text-red-500" /> PDF
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setStatusChangeOrder(order); }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-medium hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" /> Status
                                    </button>
                                    <button
                                      onClick={() => { setDeleteOrder(order); setExpandedOrderId(null); }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-600 hover:text-white hover:border-red-600 transition"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                  </div>
                                </div>

                                {/* Items table */}
                                {order.items && order.items.length > 0 && (
                                  <div className="rounded-xl overflow-hidden border border-blue-100/80 mb-4">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="bg-slate-100/80">
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">No</th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Item Code</th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                                          <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</th>
                                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Rate</th>
                                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Disc %</th>
                                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Disc Amt</th>
                                          {!isNonTaxCustomer && <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Tax Code</th>}
                                          {!isNonTaxCustomer && <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Tax Amt</th>}
                                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Gross Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {order.items.map((item, i) => {
                                          const rate = item.unitPrice || 0;
                                          const qty = item.quantity || 0;
                                          const discPct = item.discountPercent || 0;
                                          const baseAmount = rate * qty;
                                          const rowDiscountAmount = baseAmount * (discPct / 100);
                                          const rowTaxAmount = item.taxAmount || 0;
                                          const taxPerUnit = qty ? rowTaxAmount / qty : 0;
                                          const displayRate = isNonTaxCustomer ? rate + taxPerUnit : rate;
                                          const lineGross = isNonTaxCustomer ? (baseAmount + rowTaxAmount) : baseAmount;

                                          return (
                                            <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                              <td className="px-4 py-2.5 text-center text-xs text-slate-400 font-medium">{i + 1}</td>
                                              <td className="px-4 py-2.5 text-slate-400 text-xs">{item.productSKU || '—'}</td>
                                              <td className="px-4 py-2.5 font-medium text-slate-900">{item.productName}</td>
                                              <td className="px-4 py-2.5 text-center text-slate-700">{qty}</td>
                                              <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(displayRate)}</td>
                                              <td className="px-4 py-2.5 text-right text-slate-500">
                                                {discPct ? `${discPct}%` : <span className="text-slate-300">—</span>}
                                              </td>
                                              <td className="px-4 py-2.5 text-right text-slate-500">
                                                {rowDiscountAmount ? formatCurrency(rowDiscountAmount) : <span className="text-slate-300">—</span>}
                                              </td>
                                              {!isNonTaxCustomer && <td className="px-4 py-2.5 text-right text-slate-500">{rowTaxAmount > 0 ? 'V18' : 'NV'}</td>}
                                              {!isNonTaxCustomer && (
                                                <td className="px-4 py-2.5 text-right text-slate-500">
                                                  {rowTaxAmount ? formatCurrency(rowTaxAmount) : <span className="text-slate-300">—</span>}
                                                </td>
                                              )}
                                              <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{formatCurrency(lineGross)}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {/* Totals summary  right aligned */}
                                <div className="flex justify-end">
                                  <div className="w-64 space-y-2 text-sm bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                                    <div className="flex justify-between font-medium text-slate-500">
                                      <span>Total Gross</span><span>{formatCurrency(displayTotalGross)}</span>
                                    </div>
                                    {!isNonTaxCustomer && (
                                      <div className="flex justify-between font-medium text-slate-500">
                                        <span>Total Tax</span><span>{formatCurrency(displayTotalTax)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between font-medium text-emerald-600">
                                      <span>Total Discount</span><span>-{formatCurrency(displayTotalDiscount)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg pt-3 border-t border-slate-100 text-indigo-700">
                                      <span>Grand Total</span><span>{formatCurrency(displayFinalAmount)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}

          {data && data.totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">{data.totalCount} total  page {data.page} of {data.totalPages}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition">Prev</button>
                <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition">Next</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <MobileTileList
          data={orders}
          keyExtractor={(o) => o.id}
          onTileClick={handleTileClick}
          isLoading={isLoading}
          emptyMessage="No orders found"
          emptyIcon={<ShoppingCart className="w-10 h-10" />}
          page={data?.page}
          totalPages={data?.totalPages}
          onPageChange={setPage}
          renderTile={(order) => {
            const customer = customers.find(c => c.id === order.customerId || c.shopName === order.customerName);
            const isNonTaxCustomer = (customer?.customerType || (order as any).customerType || '').toLowerCase().replace(/[-\s]/g, '') === 'nontax';
            
            let mobDisplayTotalGross = 0;
            let mobDisplayTotalTax = 0;
            let mobDisplayTotalDiscount = 0;

            order.items?.forEach(item => {
              const baseAmt = (item.unitPrice || 0) * (item.quantity || 0);
              const rDisc = baseAmt * ((item.discountPercent || 0) / 100);
              const rTax = item.taxAmount || 0;
              mobDisplayTotalGross += isNonTaxCustomer ? (baseAmt + rTax) : baseAmt;
              if (!isNonTaxCustomer) mobDisplayTotalTax += rTax;
              mobDisplayTotalDiscount += rDisc;
            });

            const mobFinalAmount = isNonTaxCustomer
              ? mobDisplayTotalGross - mobDisplayTotalDiscount
              : mobDisplayTotalGross + mobDisplayTotalTax - mobDisplayTotalDiscount;

            return (
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(order.id)}
                    onChange={(e) => { e.stopPropagation(); toggleSelection(order.id); }}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">{order.orderNumber}</p>
                    <p className="text-sm text-slate-500 truncate">{order.customerName}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                  <span>{formatDate(order.orderDate)}</span>
                  <span>Rep: {order.repName || ''}</span>
                  <span>{order.items?.length || 0} items</span>
                </div>
                <div className="flex justify-between items-center pt-2.5 border-t border-slate-50">
                  <p className="font-bold text-slate-900">{formatCurrency(mobFinalAmount)}</p>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedOrderId === order.id ? 'rotate-90 text-blue-500' : ''}`} />
                </div>
                {expandedOrderId === order.id && (
                  <div className="mt-3 pt-3 border-t border-blue-100 space-y-3 animate-fade-in">
                    {order.items?.map((item) => {
                      const baseAmt = (item.unitPrice || 0) * (item.quantity || 0);
                      const rTax = item.taxAmount || 0;
                      const lineGross = isNonTaxCustomer ? (baseAmt + rTax) : baseAmt;
                      return (
                        <div key={item.id} className="flex justify-between text-xs bg-slate-50 rounded-lg p-2.5">
                          <div>
                            <span className="font-medium text-slate-800">{item.productName}</span>
                            <span className="text-slate-400 ml-1"> {item.quantity}</span>
                          </div>
                          <span className="font-semibold">{formatCurrency(lineGross)}</span>
                        </div>
                      );
                    })}
                    <div className="text-xs space-y-1.5 bg-white border border-slate-100 rounded-xl p-3 mt-1">
                      <div className="flex justify-between text-slate-500"><span>Total Gross</span><span>{formatCurrency(mobDisplayTotalGross)}</span></div>
                      {!isNonTaxCustomer && <div className="flex justify-between text-slate-500"><span>Total Tax</span><span>{formatCurrency(mobDisplayTotalTax)}</span></div>}
                      <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{formatCurrency(mobDisplayTotalDiscount)}</span></div>
                      <div className="flex justify-between font-bold text-indigo-700 pt-1.5 border-t border-slate-100"><span>Grand Total</span><span>{formatCurrency(mobFinalAmount)}</span></div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      <button onClick={(e) => { e.stopPropagation(); exportOrders('pdf', false, order); }} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 active:scale-95 flex items-center gap-1"><FileText className="w-3 h-3"/> PDF</button>
                      <button onClick={(e) => { e.stopPropagation(); exportOrders('excel', false, order); }} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 active:scale-95 flex items-center gap-1"><FileSpreadsheet className="w-3 h-3"/> Excel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          }}
        />
      )}

      {/* Sticky selection action bar  */}
      {selectedIds.size > 0 &&
        createPortal(
          <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-5 pointer-events-none">
            <div
              className="pointer-events-auto flex items-center gap-2 flex-wrap justify-center px-5 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 mx-4"
              style={{ animation: 'slideDown 0.2s ease-out both' }}
            >
              <span className="text-sm font-semibold text-slate-200">{selectedIds.size} selected</span>
              <div className="h-4 w-px bg-slate-600" />
              <button onClick={() => exportOrders('excel', true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </button>
              <button onClick={() => exportOrders('pdf', true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition">
                <FileText className="w-3.5 h-3.5" /> PDF
              </button>
              <button onClick={() => { setBulkStatusValue(''); setShowBulkStatusModal(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition">
                <RefreshCw className="w-3.5 h-3.5" /> Change Status
              </button>
              <button onClick={() => setBulkDeleteConfirm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* Per-order status change modal  */}
      {statusChangeOrder &&
        createPortal(
          <div className="fixed inset-0 z-50 flex flex-col items-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setStatusChangeOrder(null)} />
            <div className="relative mt-16 w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl border border-slate-200" style={{ animation: 'slideDown 0.25s ease-out both' }}>
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div>
                  <h3 className="font-semibold text-slate-900">Change Status</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{statusChangeOrder.orderNumber}</p>
                </div>
                <button onClick={() => setStatusChangeOrder(null)} className="p-2 hover:bg-slate-100 rounded-xl transition">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <select value={statusPickerValue} onChange={(e) => setStatusPickerValue(e.target.value as OrderStatus)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition">
                  {statusOptions.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="flex gap-3">
                  <button onClick={() => setStatusChangeOrder(null)} className="flex-1 py-2.5 bg-slate-100 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition">Cancel</button>
                  <button
                    disabled={!statusPickerValue || statusPickerValue === statusChangeOrder.status}
                    onClick={() => updateStatusMut.mutate({ id: statusChangeOrder.id, status: statusPickerValue as OrderStatus })}
                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Bulk status change modal  */}
      {showBulkStatusModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex flex-col items-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowBulkStatusModal(false)} />
            <div className="relative mt-16 w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl border border-slate-200" style={{ animation: 'slideDown 0.25s ease-out both' }}>
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div>
                  <h3 className="font-semibold text-slate-900">Bulk Status Change</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedIds.size} orders selected</p>
                </div>
                <button onClick={() => setShowBulkStatusModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <select value={bulkStatusValue} onChange={(e) => setBulkStatusValue(e.target.value as OrderStatus)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/15 transition">
                  <option value="">Select new status</option>
                  {statusOptions.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="flex gap-3">
                  <button onClick={() => setShowBulkStatusModal(false)} className="flex-1 py-2.5 bg-slate-100 rounded-xl text-sm font-medium hover:bg-slate-200 transition">Cancel</button>
                  <button disabled={!bulkStatusValue} onClick={handleBulkStatusChange} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
                    Apply to {selectedIds.size}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Reject confirmation  */}
      <ConfirmModal
        open={!!rejectOrder}
        title="Reject Order"
        description={rejectOrder ? `Reject order ${rejectOrder.orderNumber}? This cannot be undone.` : ''}
        confirmLabel="Reject"
        confirmVariant="orange"
        onConfirm={() => { if (rejectOrder) rejectMut.mutate(rejectOrder.id); }}
        onCancel={() => setRejectOrder(null)}
      />

      {/* Delete confirmation  */}
      {deleteOrder && (
        <DeleteOrderModal
          orderNumber={deleteOrder.orderNumber}
          isPending={deleteMut.isPending}
          onClose={() => setDeleteOrder(null)}
          onConfirm={() => deleteMut.mutate(deleteOrder.id)}
        />
      )}

      {/* Bulk delete confirmation  */}
      <ConfirmModal
        open={bulkDeleteConfirm}
        title="Delete Selected Orders"
        description={`Permanently delete ${selectedIds.size} selected orders? This cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.size}`}
        confirmVariant="orange"
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteConfirm(false)}
      />
    </div>
  );
}

function DeleteOrderModal({ orderNumber, isPending, onClose, onConfirm }: { orderNumber: string; isPending: boolean; onClose: () => void; onConfirm: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Delete order</h2>
        <p className="text-sm text-slate-500 mb-6">Are you sure you want to delete order <strong>{orderNumber}</strong>? This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Cancel</button>
          <button onClick={onConfirm} disabled={isPending} className="flex-1 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium transition disabled:opacity-50">{isPending ? 'Deleting...' : 'Delete order'}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}