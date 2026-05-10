import { useState, useEffect, useMemo, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../services/api/ordersApi';
import { repsApi } from '../../services/api/repsApi';
import { customersApi } from '../../services/api/customersApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { taxCodeToRate } from '../../utils/calculations';
import { getShopName } from '../../utils/shopName';
import {
  ShoppingCart, CheckCircle, XCircle, ChevronRight,
  Search, Trash2, X, FileSpreadsheet, FileText,
  SlidersHorizontal, RefreshCw, Package,
  ArrowUpDown, Zap, Check, ChevronDown
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
  const [showBulkStatusInline, setShowBulkStatusInline] = useState(false);
  const [showBulkExportInline, setShowBulkExportInline] = useState(false);

  // Products-style toolbar state
  const [selectionMode, setSelectionMode] = useState(false);
  const [toolbarPanel, setToolbarPanel] = useState<'filter' | 'sort' | 'action' | null>(null);
  const [filterSubPanel, setFilterSubPanel] = useState<'status' | 'rep' | 'customer' | 'date' | null>(null);
  const [sortField, setSortField] = useState<string>('orderDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  const togglePanel = (panel: 'filter' | 'sort' | 'action') => {
    setToolbarPanel(p => p === panel ? null : panel);
    if (panel !== 'filter') setFilterSubPanel(null);
  };
  const toggleFilterSub = (sub: 'status' | 'rep' | 'customer' | 'date') => {
    setFilterSubPanel(p => p === sub ? null : sub);
  };

  useEffect(() => {
    if (statusChangeOrder) setStatusPickerValue(statusChangeOrder.status || '');
  }, [statusChangeOrder]);

  useEffect(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [page, status, fromDate, toDate, repIdFilter, customerIdFilter]);

  // Escape key exits selection mode
  useEffect(() => {
    if (!selectionMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelectionMode(false); setSelectedIds(new Set()); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectionMode]);

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

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      let av: any, bv: any;
      switch (sortField) {
        case 'orderNumber':  av = a.orderNumber;       bv = b.orderNumber;       break;
        case 'customerName': av = a.customerName;      bv = b.customerName;      break;
        case 'repName':      av = a.repName ?? '';     bv = b.repName ?? '';     break;
        case 'status':       av = a.status;            bv = b.status;            break;
        default:             av = a.orderDate || '';   bv = b.orderDate || '';   break;
      }
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [orders, sortField, sortDir]);

  const activeFilterCount = (status ? 1 : 0) + (repIdFilter ? 1 : 0) + (customerIdFilter ? 1 : 0) + ((fromDate || toDate) ? 1 : 0);

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
      setShowBulkStatusInline(false);
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

          const excelHeaders = ['#', 'Item Code', 'Item Description', 'Qty', 'Rate', 'Disc %', 'Disc Amt'];
          if (!isNonTaxCustomer) {
            excelHeaders.push('Tax');
          }
          excelHeaders.push('Line Gross');
          rows.push(excelHeaders);

          // Setup Column Widths for better styling
          const colWidths = [
            { wch: 5 },   // #
            { wch: 15 },  // Item Code
            { wch: 40 },  // Item Description
            { wch: 8 },   // Qty
            { wch: 15 },  // Rate
            { wch: 10 },  // Disc %
            { wch: 15 },  // Disc Amt
          ];
          if (!isNonTaxCustomer) {
            colWidths.push({ wch: 15 }); // Tax
          }
          colWidths.push({ wch: 20 }); // Line Gross

          (o.items || []).forEach((it, i) => {
            const rate = it.unitPrice || 0;
            const qty = it.quantity || 0;
            const discPct = it.discountPercent || 0;
            const baseAmount = rate * qty;
            const rowTaxRate = taxCodeToRate(it.taxCode);
            const allIncRate = Math.round(rate * (1 + rowTaxRate) * 100) / 100;
            const displayRate = isNonTaxCustomer ? allIncRate : rate;
            const displayTotal = isNonTaxCustomer ? allIncRate * qty : baseAmount;
            const rowDiscountAmount = isNonTaxCustomer ? (allIncRate * qty * discPct) / 100 : (baseAmount * (discPct / 100));
            const rowTaxAmount = isNonTaxCustomer ? 0 : (rate * qty - baseAmount * (discPct / 100)) * rowTaxRate;

            totalGrossAmount += displayTotal;
            if (!isNonTaxCustomer) totalTaxAmount += rowTaxAmount;
            totalDiscountAmount += rowDiscountAmount;

            const rowData: any[] = [
              i + 1, it.productSKU || '—', it.productName, qty, displayRate,
              discPct ? `${discPct}%` : '—', rowDiscountAmount || '—'
            ];

            if (!isNonTaxCustomer) {
              rowData.push(it.taxCode || '—');
            }
            rowData.push(displayTotal);
            rows.push(rowData);
          });

          const finalAmount = isNonTaxCustomer
            ? totalGrossAmount - totalDiscountAmount
            : totalGrossAmount + totalTaxAmount - totalDiscountAmount;

          rows.push([]);
          rows.push([...Array(excelHeaders.length - 2).fill(null), 'Gross Amount', totalGrossAmount]);
          rows.push([...Array(excelHeaders.length - 2).fill(null), 'Discount Amount', -totalDiscountAmount]);
          if (!isNonTaxCustomer) {
            rows.push([...Array(excelHeaders.length - 2).fill(null), 'Net Amount', totalGrossAmount - totalDiscountAmount]);
            rows.push([...Array(excelHeaders.length - 2).fill(null), 'Total Tax Amount', totalTaxAmount]);
          }
          rows.push([...Array(excelHeaders.length - 2).fill(null), 'Total Invoice Value', finalAmount]);

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
            ? ['No', 'Item Code', 'Item Description', 'Qty', 'Rate', 'Disc %', 'Disc Amt', 'Line Gross']
            : ['No', 'Item Code', 'Item Description', 'Qty', 'Rate', 'Disc %', 'Disc Amt', 'Tax', 'Line Gross'];

          const tRows = (o.items || []).map((it, i) => {
            const rate = it.unitPrice || 0;
            const qty = it.quantity || 0;
            const discPct = it.discountPercent || 0;
            const baseAmount = rate * qty;
            const rowTaxRate = taxCodeToRate(it.taxCode);
            const allIncRate = Math.round(rate * (1 + rowTaxRate) * 100) / 100;
            const displayRate = isNonTaxCustomer ? allIncRate : rate;
            const displayTotal = isNonTaxCustomer ? allIncRate * qty : baseAmount;
            const rowDiscountAmount = isNonTaxCustomer ? (allIncRate * qty * discPct) / 100 : (baseAmount * (discPct / 100));
            const rowTaxAmount = isNonTaxCustomer ? 0 : (baseAmount - baseAmount * (discPct / 100)) * rowTaxRate;

            totalGrossAmount += displayTotal;
            if (!isNonTaxCustomer) totalTaxAmount += rowTaxAmount;
            totalDiscountAmount += rowDiscountAmount;

            if (isNonTaxCustomer) {
              return [
                i + 1, it.productSKU || '', it.productName, qty, formatAmt(displayRate), 
                discPct ? `${discPct}%` : '—', rowDiscountAmount ? formatAmt(rowDiscountAmount) : '—', formatAmt(displayTotal)
              ];
            } else {
              return [
                i + 1, it.productSKU || '', it.productName, qty, formatAmt(rate), 
                discPct ? `${discPct}%` : '—', rowDiscountAmount ? formatAmt(rowDiscountAmount) : '—',
                it.taxCode || '—', formatAmt(displayTotal)
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
                : { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { cellWidth: 14, halign: 'center' }, 8: { halign: 'right' } }
            }
          });

          const afterTableY = (doc as any).lastAutoTable.finalY;

          // --- 6. Totals Box ---
          const finalAmount = isNonTaxCustomer
            ? totalGrossAmount - totalDiscountAmount
            : totalGrossAmount + totalTaxAmount - totalDiscountAmount;

          const summaryLines: { label: string; value: string; isBold?: boolean }[] = [];
          summaryLines.push({ label: 'Gross Amount', value: formatAmt(totalGrossAmount) });
          summaryLines.push({ label: 'Discount Amount', value: `-${formatAmt(totalDiscountAmount)}` });
          if (!isNonTaxCustomer) {
            summaryLines.push({ label: 'Net Amount', value: formatAmt(totalGrossAmount - totalDiscountAmount) });
            summaryLines.push({ label: 'Total Tax Amount', value: formatAmt(totalTaxAmount) });
          }
          summaryLines.push({ label: 'Total Invoice Value', value: `LKR ${formatAmt(finalAmount)}`, isBold: true });

          const totalsRowH = 6;
          // Calculate right col widths directly from AutoTable to align perfectly
          const tableConfig = (doc as any).lastAutoTable;
          const cols = tableConfig.columns;
          let totalsW = 0;
          if(isNonTaxCustomer) {
             totalsW = cols[5].width + cols[6].width + cols[7].width;
          } else {
             totalsW = cols[6].width + cols[7].width + cols[8].width;
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

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/70 rounded-2xl shadow-[0_2px_16px_-4px_rgba(0,0,0,0.08)] overflow-hidden">

          {/* Row 1: Search + count */}
          <div className="px-4 pt-3 pb-3 flex items-center gap-2.5 flex-wrap">
            <div className="relative flex-1 min-w-[180px] group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Search order # or customer…"
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
            <div className="hidden sm:block h-7 w-px bg-slate-200" />
            {data?.items && (
              <span className="hidden sm:inline text-xs text-slate-400 select-none">
                {orders.length} order{orders.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Row 2: Control bar */}
          <div className="px-2 py-1 sm:px-3 sm:py-1.5 bg-slate-50/80 border-t border-slate-100 flex items-center">
            <button
              onClick={() => togglePanel('filter')}
              className={`flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${toolbarPanel === 'filter' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:inline">Filter</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold leading-none px-1">{activeFilterCount}</span>
              )}
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <button
              onClick={() => togglePanel('sort')}
              className={`flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${toolbarPanel === 'sort' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:inline">Sort</span>
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <button
              onClick={() => togglePanel('action')}
              className={`flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${toolbarPanel === 'action' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:inline">Action</span>
              {selectedIds.size > 0 && (
                <span className="inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold leading-none px-1">{selectedIds.size}</span>
              )}
            </button>
          </div>

          {/* ── Filter Panel ──────────────────────────────────────────────── */}
          {toolbarPanel === 'filter' && (
            <div className="border-t border-slate-100 bg-slate-50/60">
              {/* Sub-tabs */}
              <div className="flex border-b border-slate-100">
                {([
                  { key: 'status',   label: 'Status',   short: 'Status', count: status ? 1 : 0 },
                  { key: 'rep',      label: 'Rep',      short: 'Rep',    count: repIdFilter ? 1 : 0 },
                  { key: 'customer', label: 'Customer', short: 'Cust.',  count: customerIdFilter ? 1 : 0 },
                  { key: 'date',     label: 'Date',     short: 'Date',   count: (fromDate || toDate) ? 1 : 0 },
                ] as { key: 'status'|'rep'|'customer'|'date'; label: string; short: string; count: number }[]).map(({ key, label, short, count }) => (
                  <button
                    key={key}
                    onClick={() => toggleFilterSub(key)}
                    className={`flex-1 inline-flex items-center justify-center gap-1 py-2 text-[11px] sm:text-xs font-medium border-b-2 transition-all ${
                      filterSubPanel === key ? 'border-indigo-500 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/60'
                    }`}
                  >
                    <span className="sm:hidden">{short}</span>
                    <span className="hidden sm:inline">{label}</span>
                    {count > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[14px] h-[14px] sm:min-w-[16px] sm:h-4 rounded-full bg-indigo-600 text-white text-[8px] sm:text-[9px] font-bold leading-none px-0.5 sm:px-1">{count}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Status sub-panel */}
              {filterSubPanel === 'status' && (
                <div className="px-3 py-2.5 sm:px-4 sm:py-3 bg-white">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {ORDER_STATUSES.map(s => (
                      <button
                        key={s}
                        onClick={() => { setStatus(prev => prev === s ? '' : s); setPage(1); }}
                        className={`inline-flex items-center gap-0.5 sm:gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md text-[11px] sm:text-xs font-medium border transition-all ${
                          status === s ? 'bg-black border-black text-white' : 'bg-white border-black text-slate-700 hover:bg-black hover:text-white'
                        }`}
                      >
                        {status === s && <Check className="w-3 h-3" />}{s}
                      </button>
                    ))}
                    {status && <button onClick={() => { setStatus(''); setPage(1); }} className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium">clear</button>}
                  </div>
                </div>
              )}

              {/* Rep sub-panel */}
              {filterSubPanel === 'rep' && (
                <div className="px-3 py-2.5 sm:px-4 sm:py-3 bg-white">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {reps.length === 0 && <span className="text-xs text-slate-400 italic">No reps loaded</span>}
                    {reps.map(r => (
                      <button
                        key={r.id}
                        onClick={() => { setRepIdFilter(prev => prev === r.id ? '' : r.id); setPage(1); }}
                        className={`inline-flex items-center gap-0.5 sm:gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md text-[11px] sm:text-xs font-medium border transition-all ${
                          repIdFilter === r.id ? 'bg-black border-black text-white' : 'bg-white border-black text-slate-700 hover:bg-black hover:text-white'
                        }`}
                      >
                        {repIdFilter === r.id && <Check className="w-3 h-3" />}{r.fullName}
                      </button>
                    ))}
                    {repIdFilter && <button onClick={() => { setRepIdFilter(''); setPage(1); }} className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium">clear</button>}
                  </div>
                </div>
              )}

              {/* Customer sub-panel */}
              {filterSubPanel === 'customer' && (
                <div className="px-3 py-2.5 sm:px-4 sm:py-3 bg-white">
                  <div className="flex items-center gap-2">
                    <select
                      value={customerIdFilter}
                      onChange={e => { setCustomerIdFilter(e.target.value); setPage(1); }}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition"
                    >
                      <option value="">All Customers</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.shopName}</option>)}
                    </select>
                    {customerIdFilter && (
                      <button onClick={() => { setCustomerIdFilter(''); setPage(1); }} className="p-1 text-red-400 hover:text-red-600 transition">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Date sub-panel */}
              {filterSubPanel === 'date' && (
                <div className="px-3 py-2.5 sm:px-4 sm:py-3 bg-white">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <span className="text-xs font-medium text-slate-500">Date range</span>
                    <div className="flex items-center gap-1.5 flex-1">
                      <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }}
                        className="flex-1 min-w-0 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition"
                      />
                      <span className="text-slate-300 text-xs shrink-0">–</span>
                      <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }}
                        className="flex-1 min-w-0 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition"
                      />
                      {(fromDate || toDate) && (
                        <button onClick={() => { setFromDate(''); setToDate(''); setPage(1); }} className="shrink-0 p-1 text-red-400 hover:text-red-600 transition">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Sort Panel ──────────────────────────────────────────────────── */}
          {toolbarPanel === 'sort' && (
            <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-t border-slate-100 bg-white">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-white border-black text-slate-700 hover:bg-black hover:text-white transition-all"
                >
                  {sortDir === 'asc' ? '↑ Ascending' : '↓ Descending'}
                </button>
                <div className="w-px h-4 bg-slate-200 mx-0.5" />
                {[
                  { field: 'orderDate',    label: 'Date' },
                  { field: 'orderNumber',  label: 'Order #' },
                  { field: 'customerName', label: 'Customer' },
                  { field: 'repName',      label: 'Rep' },
                  { field: 'status',       label: 'Status' },
                ].map(({ field, label }) => (
                  <button
                    key={field}
                    onClick={() => { if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else setSortField(field); }}
                    className={`inline-flex items-center gap-0.5 sm:gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md text-[11px] sm:text-xs font-medium border transition-all ${sortField === field ? 'bg-black border-black text-white' : 'bg-white border-black text-slate-700 hover:bg-black hover:text-white'}`}
                  >
                    {sortField === field && <Check className="w-3 h-3" />}{label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Action Panel ─────────────────────────────────────────────────── */}
          {toolbarPanel === 'action' && (
            <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-t border-slate-100 bg-white">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {selectionMode && selectedIds.size > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">{selectedIds.size}</span>
                    selected
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 italic">No rows selected — double-click a row to select</span>
                )}
                {selectedIds.size > 0 && (
                  <>
                    <button
                      onClick={() => { setShowBulkExportInline(p => !p); setShowBulkStatusInline(false); }}
                      className={`flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${showBulkExportInline ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600'}`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Export
                    </button>
                    <button
                      onClick={() => { setBulkStatusValue(''); setShowBulkStatusInline(p => !p); setShowBulkExportInline(false); }}
                      className={`flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${showBulkStatusInline ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600'}`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" /><span className="hidden sm:inline">Change</span> Status
                    </button>
                    <button onClick={() => setBulkDeleteConfirm(true)} className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-medium hover:bg-red-600 hover:text-white hover:border-red-600 transition">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </>
                )}
                {selectionMode && (
                  <button
                    onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); setToolbarPanel(null); setShowBulkStatusInline(false); setShowBulkExportInline(false); }}
                    className="ml-auto flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium hover:bg-slate-200 transition"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel selection
                  </button>
                )}
              </div>
              {showBulkExportInline && selectedIds.size > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">Export {selectedIds.size} order(s) as:</span>
                  <button onClick={() => { exportOrders('pdf', true); setShowBulkExportInline(false); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-medium hover:bg-red-600 hover:text-white hover:border-red-600 transition">
                    <FileText className="w-3.5 h-3.5" /> PDF
                  </button>
                  <button onClick={() => { exportOrders('excel', true); setShowBulkExportInline(false); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                  </button>
                </div>
              )}
              {showBulkStatusInline && selectedIds.size > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-2">
                  <p className="text-[11px] text-slate-500 font-medium">Select new status for {selectedIds.size} order(s):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ORDER_STATUSES.map(s => (
                      <button
                        key={s}
                        onClick={() => setBulkStatusValue(s === bulkStatusValue ? '' : s)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition select-none ${
                          s === bulkStatusValue
                            ? 'bg-black border-black text-white shadow-sm'
                            : 'bg-white border-black text-slate-700 opacity-80 hover:opacity-100'
                        }`}
                      >
                        {s === bulkStatusValue && <Check className="w-2.5 h-2.5 shrink-0" />}
                        {s.replace(/([a-z])([A-Z])/g, '$1 $2')}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-0.5">
                    <button
                      disabled={!bulkStatusValue}
                      onClick={handleBulkStatusChange}
                      className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 transition"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setBulkStatusValue(''); setShowBulkStatusInline(false); }}
                      className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Mobile card list (< lg) ──────────────────────────────────────── */}
      <div className="lg:hidden bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading orders…</div>
        ) : sortedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <ShoppingCart className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No orders found</p>
          </div>
        ) : (
          <>
            {sortedOrders.map((order) => {
              const customer = customers.find(c => c.id === order.customerId || c.shopName === order.customerName);
              const isNonTaxCustomer = (customer?.customerType || (order as any).customerType || '').toLowerCase().replace(/[-\s]/g, '') === 'nontax';
              let mobGross = 0, mobTax = 0, mobDisc = 0;
              order.items?.forEach(item => {
                const r = item.unitPrice || 0;
                const q = item.quantity || 0;
                const d = item.discountPercent || 0;
                const base = r * q;
                const rTaxRate = taxCodeToRate(item.taxCode);
                const allIncR = Math.round(r * (1 + rTaxRate) * 100) / 100;
                mobGross += isNonTaxCustomer ? allIncR * q : base;
                if (!isNonTaxCustomer) mobTax += (base - base * d / 100) * rTaxRate;
                mobDisc += isNonTaxCustomer ? allIncR * q * d / 100 : base * d / 100;
              });
              const mobTotal = isNonTaxCustomer ? mobGross - mobDisc : mobGross + mobTax - mobDisc;
              return (
                <div key={order.id}>
                  <div
                    onDoubleClick={() => { if (!selectionMode) { setSelectionMode(true); setSelectedIds(new Set([order.id])); } }}
                    onClick={() => { if (selectionMode) toggleSelection(order.id); else setExpandedOrderId(p => p === order.id ? null : order.id); }}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100 transition-colors cursor-default select-none ${
                      selectionMode && selectedIds.has(order.id) ? 'bg-indigo-50' : expandedOrderId === order.id ? 'bg-blue-50/40' : 'bg-white active:bg-slate-50'
                    }`}
                  >
                    {selectionMode ? (
                      <div className={`shrink-0 w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${selectedIds.has(order.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                        {selectedIds.has(order.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                    ) : (
                      <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4 text-blue-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate leading-snug">{order.orderNumber}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{customers.find(c => c.id === order.customerId)?.shopName || order.customerName}</p>
                    </div>
                    <div className="shrink-0 text-right flex flex-col items-end gap-1">
                      <StatusBadge status={order.status} />
                      <p className="text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(mobTotal)}</p>
                    </div>
                    <ChevronRight className={`shrink-0 w-4 h-4 text-slate-300 transition-transform duration-200 ${expandedOrderId === order.id && !selectionMode ? 'rotate-90 text-blue-400' : ''}`} />
                  </div>
                  {expandedOrderId === order.id && !selectionMode && (
                    <div className="bg-blue-50/30 px-4 py-3 border-b border-blue-100 space-y-2.5">
                      {order.items?.map((item) => {
                        const r = item.unitPrice || 0;
                        const q = item.quantity || 0;
                        const rTaxRate = taxCodeToRate(item.taxCode);
                        const allIncR = Math.round(r * (1 + rTaxRate) * 100) / 100;
                        const lineGross = isNonTaxCustomer ? allIncR * q : r * q;
                        return (
                          <div key={item.id} className="flex justify-between text-xs bg-white rounded-lg p-2.5 shadow-sm">
                            <div><span className="font-medium text-slate-800">{item.productName}</span><span className="text-slate-400 ml-2">×{item.quantity}</span></div>
                            <span className="font-semibold">{formatCurrency(lineGross)}</span>
                          </div>
                        );
                      })}
                      <div className="text-xs space-y-1 bg-white border border-slate-100 rounded-xl p-3">
                        <div className="flex justify-between text-slate-500"><span>Gross</span><span>{formatCurrency(mobGross)}</span></div>
                        {!isNonTaxCustomer && <div className="flex justify-between text-slate-500"><span>Tax</span><span>{formatCurrency(mobTax)}</span></div>}
                        <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{formatCurrency(mobDisc)}</span></div>
                        <div className="flex justify-between font-bold text-indigo-700 pt-1.5 border-t border-slate-100"><span>Grand Total</span><span>{formatCurrency(mobTotal)}</span></div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); exportOrders('pdf', false, order); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 active:scale-95">
                          <FileText className="w-3.5 h-3.5" /> PDF
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); exportOrders('excel', false, order); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 active:scale-95">
                          <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-0.5" onClick={e => e.stopPropagation()}>
                        {ORDER_STATUSES.map(s => (
                          <button
                            key={s}
                            disabled={updateStatusMut.isPending}
                            onClick={() => { if (s !== order.status) updateStatusMut.mutate({ id: order.id, status: s }); }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition select-none ${
                              s === order.status
                                ? 'bg-black border-black text-white shadow-sm'
                                : 'bg-white border-black text-slate-700 opacity-70 hover:opacity-100 active:opacity-100 cursor-pointer'
                            }`}
                          >
                            {s === order.status && <Check className="w-2.5 h-2.5 shrink-0" />}
                            {s.replace(/([a-z])([A-Z])/g, '$1 $2')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {!selectionMode && (
              <p className="text-center text-[11px] text-slate-400 py-3 italic select-none">Double-tap a row to enter selection mode</p>
            )}
            {selectionMode && (
              <p className="text-center text-[11px] text-indigo-500 py-3 font-medium select-none">
                {selectedIds.size} selected &mdash;{' '}
                <button onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }} className="underline underline-offset-2">Exit (Esc)</button>
              </p>
            )}
          </>
        )}
        {data && data.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">{data.totalCount} total</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition">Prev</button>
              <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Desktop table (≥ lg) ──────────────────────────────────────────── */}
      <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading orders…</div>
        ) : sortedOrders.length === 0 ? (
          <div className="p-14 text-center">
            <ShoppingCart className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No orders found</p>
          </div>
        ) : (
          <table className="w-full text-[12px] border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                {selectionMode && (
                  <th className="px-3 py-3.5 w-10 border-r border-slate-200 text-center">
                    <input type="checkbox" checked={selectedIds.size === sortedOrders.length && sortedOrders.length > 0} onChange={toggleAll} />
                  </th>
                )}
                <th className="px-3 py-3.5 w-8 border-r border-slate-200" />
                <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Order</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Shop</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Rep</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Items</th>
                <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Total</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Date</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map((order) => {
                const customer = customers.find(c => c.id === order.customerId || c.shopName === order.customerName);
                const isNonTaxCustomer = (customer?.customerType || (order as any).customerType || '').toLowerCase().replace(/[-\s]/g, '') === 'nontax';
                let displayTotalGross = 0, displayTotalTax = 0, displayTotalDiscount = 0;
                order.items?.forEach(item => {
                  const rate = item.unitPrice || 0;
                  const qty = item.quantity || 0;
                  const discPct = item.discountPercent || 0;
                  const baseAmount = rate * qty;
                  const rowTaxRate = taxCodeToRate(item.taxCode);
                  const allIncRate = Math.round(rate * (1 + rowTaxRate) * 100) / 100;
                  const rowDiscountAmount = isNonTaxCustomer ? (allIncRate * qty * discPct) / 100 : (baseAmount * (discPct / 100));
                  const rowTaxAmount = isNonTaxCustomer ? 0 : (baseAmount - baseAmount * (discPct / 100)) * rowTaxRate;
                  displayTotalGross += isNonTaxCustomer ? allIncRate * qty : baseAmount;
                  if (!isNonTaxCustomer) displayTotalTax += rowTaxAmount;
                  displayTotalDiscount += rowDiscountAmount;
                });
                const displayFinalAmount = isNonTaxCustomer
                  ? displayTotalGross - displayTotalDiscount
                  : displayTotalGross + displayTotalTax - displayTotalDiscount;

                return (
                  <Fragment key={order.id}>
                    <tr
                      onDoubleClick={() => { if (!selectionMode) { setSelectionMode(true); setSelectedIds(new Set([order.id])); } }}
                      onClick={() => { if (selectionMode) toggleSelection(order.id); else setExpandedOrderId(p => p === order.id ? null : order.id); }}
                      className={`border-b border-slate-100 cursor-pointer transition-colors select-none ${
                        selectionMode && selectedIds.has(order.id)
                          ? 'bg-indigo-50/60'
                          : expandedOrderId === order.id
                          ? 'bg-blue-50/50 border-blue-100'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {selectionMode && (
                        <td className="px-3 py-3.5 border border-slate-200" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.has(order.id)} onChange={() => toggleSelection(order.id)} className="shrink-0" />
                        </td>
                      )}
                      <td className="px-3 py-3.5 w-8 border border-slate-200">
                        <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${expandedOrderId === order.id ? 'rotate-90 text-blue-500' : ''}`} />
                      </td>
                      <td className="px-4 py-3.5 border border-slate-200">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-slate-900 text-xs">{order.orderNumber}</span>
                          {order.isFromApprovedQuotation && (
                            <span className="inline-flex w-fit px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Approved Quotation</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-700 border border-slate-200">{customers.find(c => c.id === order.customerId)?.shopName || (order as any).shopName || order.customerName || '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 border border-slate-200">{order.repName || '—'}</td>
                      <td className="px-4 py-3.5 text-center text-xs text-slate-500 border border-slate-200">{order.items?.length || 0}</td>
                      <td className="px-4 py-3.5 text-right text-xs font-semibold text-slate-900 border border-slate-200">{formatCurrency(displayFinalAmount)}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 border border-slate-200">{formatDate(order.orderDate)}</td>
                      <td className="px-4 py-3.5 text-center border border-slate-200"><StatusBadge status={order.status} /></td>
                    </tr>

                    {expandedOrderId === order.id && (
                      <tr className="border-b border-blue-100">
                        <td colSpan={99} className="p-0">
                          <div className="bg-gradient-to-b from-slate-100 to-slate-50 px-8 py-5" style={{ animation: 'fadeIn 0.18s ease-out both' }}>
                            <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-semibold text-slate-700">{order.orderNumber}</span>
                                <span className="text-slate-400">·</span>
                                <span className="text-slate-500">{customers.find(c => c.id === order.customerId)?.shopName || (order as any).shopName || order.customerName || '—'}</span>
                                {order.deliveryAddress && (
                                  <><span className="text-slate-400">·</span><span className="text-xs text-slate-400 truncate max-w-[200px]">{order.deliveryAddress}</span></>
                                )}
                              </div>
                              <div className="flex flex-col gap-2.5 items-end">
                                {/* Status chips */}
                                <div className="flex flex-wrap gap-1 justify-end" onClick={e => e.stopPropagation()}>
                                  {ORDER_STATUSES.map(s => (
                                    <button
                                      key={s}
                                      disabled={updateStatusMut.isPending}
                                      onClick={() => { if (s !== order.status) updateStatusMut.mutate({ id: order.id, status: s }); }}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition select-none ${
                                        s === order.status
                                          ? 'bg-black border-black text-white shadow-sm'
                                          : 'bg-white border-black text-slate-700 opacity-70 hover:opacity-100 cursor-pointer'
                                      }`}
                                    >
                                      {s === order.status && <Check className="w-2.5 h-2.5 shrink-0" />}
                                      {s.replace(/([a-z])([A-Z])/g, '$1 $2')}
                                    </button>
                                  ))}
                                </div>
                                {/* Export + Delete row */}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-slate-400 font-medium">Export:</span>
                                  <button onClick={(e) => { e.stopPropagation(); exportOrders('pdf', false, order); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-600 hover:text-white hover:border-red-600 transition">
                                    <FileText className="w-3.5 h-3.5" /> PDF
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); exportOrders('excel', false, order); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition">
                                    <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                                  </button>
                                  <div className="w-px h-4 bg-slate-200" />
                                  <button onClick={() => { setDeleteOrder(order); setExpandedOrderId(null); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-600 hover:text-white hover:border-red-600 transition">
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                            {order.items && order.items.length > 0 && (
                              <div className="rounded-xl overflow-hidden border border-slate-200 mb-4">
                                <table className="w-full text-sm border-collapse">
                                  <thead>
                                    <tr className="bg-slate-100/80">
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide border border-slate-200">No</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide border border-slate-200">Item Code</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide border border-slate-200">Item Description</th>
                                      <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide border border-slate-200">Qty</th>
                                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide border border-slate-200">Rate</th>
                                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide border border-slate-200">Disc %</th>
                                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide border border-slate-200">Disc Amt</th>
                                      {!isNonTaxCustomer && <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide border border-slate-200">Tax</th>}
                                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide border border-slate-200">Line Gross</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {order.items.map((item, i) => {
                                      const rate = item.unitPrice || 0;
                                      const qty = item.quantity || 0;
                                      const discPct = item.discountPercent || 0;
                                      const baseAmount = rate * qty;
                                      const rowTaxRate = taxCodeToRate(item.taxCode);
                                      const allIncRate = Math.round(rate * (1 + rowTaxRate) * 100) / 100;
                                      const displayRate = isNonTaxCustomer ? allIncRate : rate;
                                      const lineGross = isNonTaxCustomer ? allIncRate * qty : baseAmount;
                                      const rowDiscountAmount = isNonTaxCustomer ? (allIncRate * qty * discPct) / 100 : (baseAmount * (discPct / 100));
                                      return (
                                        <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                          <td className="px-4 py-2.5 text-center text-xs text-slate-400 font-medium border border-slate-200">{i + 1}</td>
                                          <td className="px-4 py-2.5 text-slate-400 text-xs border border-slate-200">{item.productSKU || '—'}</td>
                                          <td className="px-4 py-2.5 font-medium text-slate-900 border border-slate-200">{item.productName}</td>
                                          <td className="px-4 py-2.5 text-center text-slate-700 border border-slate-200">{qty}</td>
                                          <td className="px-4 py-2.5 text-right text-slate-600 border border-slate-200">{formatCurrency(displayRate)}</td>
                                          <td className="px-4 py-2.5 text-right text-slate-500 border border-slate-200">{discPct ? `${discPct}%` : <span className="text-slate-300">—</span>}</td>
                                          <td className="px-4 py-2.5 text-right text-slate-500 border border-slate-200">{rowDiscountAmount ? formatCurrency(rowDiscountAmount) : <span className="text-slate-300">—</span>}</td>
                                          {!isNonTaxCustomer && <td className="px-4 py-2.5 text-center text-slate-500 border border-slate-200">{item.taxCode || <span className="text-slate-300">—</span>}</td>}
                                          <td className="px-4 py-2.5 text-right font-semibold text-slate-900 border border-slate-200">{formatCurrency(lineGross)}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            <div className="flex justify-end">
                              <div className="w-full max-w-md space-y-2 text-sm bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                <div className="flex items-center justify-between gap-8 font-medium text-slate-500"><span>Gross Amount</span><span className="whitespace-nowrap tabular-nums">{formatCurrency(displayTotalGross)}</span></div>
                                <div className="flex items-center justify-between gap-8 font-medium text-orange-500 pb-3 border-b border-slate-100"><span>Discount Amount</span><span className="whitespace-nowrap tabular-nums">-{formatCurrency(displayTotalDiscount)}</span></div>
                                {!isNonTaxCustomer && (
                                  <>
                                    <div className="flex items-center justify-between gap-8 font-medium text-slate-500"><span>Net Amount</span><span className="whitespace-nowrap tabular-nums">{formatCurrency(displayTotalGross - displayTotalDiscount)}</span></div>
                                    <div className="flex items-center justify-between gap-8 font-medium text-slate-500 pb-3 border-b border-slate-100"><span>Total Tax Amount</span><span className="whitespace-nowrap tabular-nums">{formatCurrency(displayTotalTax)}</span></div>
                                  </>
                                )}
                                <div className="flex items-center justify-between gap-8 font-bold pt-1"><span className="text-slate-800 uppercase tracking-wider text-sm">Total Invoice Value</span><span className="text-xl font-black text-orange-600 whitespace-nowrap tabular-nums">{formatCurrency(displayFinalAmount)}</span></div>
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
            <span className="text-xs text-slate-500">{data.totalCount} total · page {data.page} of {data.totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition">Prev</button>
              <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition">Next</button>
            </div>
          </div>
        )}
      </div>

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
      {bulkDeleteConfirm && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ pointerEvents: 'auto' }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setBulkDeleteConfirm(false)} />
          <div
            className="relative mt-16 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl border border-slate-200"
            style={{ animation: 'slideDown 0.25s ease-out both' }}
          >
            <div className="flex items-start gap-4 p-6">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-slate-900">Delete Selected Orders</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Permanently delete <span className="font-semibold text-slate-700">{selectedIds.size} order{selectedIds.size !== 1 ? 's' : ''}</span>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-5">
              <button onClick={() => setBulkDeleteConfirm(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition"
              >
                Delete {selectedIds.size}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function DeleteOrderModal({ orderNumber, isPending, onClose, onConfirm }: { orderNumber: string; isPending: boolean; onClose: () => void; onConfirm: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ pointerEvents: 'auto' }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative mt-16 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl border border-slate-200"
        style={{ animation: 'slideDown 0.25s ease-out both' }}
      >
        <div className="flex items-start gap-4 p-6">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900">Delete Order</h3>
            <p className="mt-1 text-sm text-slate-500">
              Are you sure you want to delete order <span className="font-semibold text-slate-700">{orderNumber}</span>? This action cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-5">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition disabled:opacity-50"
          >
            {isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}