import { useState, useEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../services/api/ordersApi';
import { repsApi } from '../../services/api/repsApi';
import { customersApi } from '../../services/api/customersApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  ShoppingCart, Eye, CheckCircle, XCircle, ChevronRight,
  Search, Trash2, X, Check, FileSpreadsheet, FileText,
  SlidersHorizontal, RefreshCw,
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
  //  Filter state 
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [search, setSearch] = useState('');
  const [repIdFilter, setRepIdFilter] = useState('');
  const [customerIdFilter, setCustomerIdFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  //  Selection state (always enabled)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSingleExportDrop, setShowSingleExportDrop] = useState<string | null>(null); // order id

  //  Detail / modal state 
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


  //  Queries 
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

  //  Mutations 
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

  //  Data 
  const orders: Order[] = (data?.items || []).filter((o: Order) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q);
  });

  const reps: { id: string; fullName: string }[] = repsData || [];
  const customers: { id: string; shopName: string }[] = customersData || [];

  //  Selection helpers 
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
    // if the user actually clicked a checkbox itself, toggle selection
    if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
      toggleSelection(order.id);
      return;
    }
    // otherwise open/close detail (same as earlier behavior)
    setExpandedOrderId((prev) => (prev === order.id ? null : order.id));
  };

  // tile-specific click just opens detail, checkbox propagation already blocked
  const handleTileClick = (order: Order) => {
    setExpandedOrderId((prev) => (prev === order.id ? null : order.id));
  };

  //  Bulk operations 
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

  //  Export – professional purchase-order format
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

    /** Returns discount amount: prefer stored value, else derive from percent × qty × price */
    const calcDiscAmt = (it: { unitPrice: number; quantity: number; discountPercent?: number | null; discountAmount?: number | null }) => {
      if (it.discountAmount != null && it.discountAmount !== 0) return it.discountAmount;
      if (it.discountPercent) return (it.unitPrice * it.quantity * it.discountPercent) / 100;
      return 0;
    };

    try {
      if (format === 'excel') {
        /* ─────────────────────────────────────────────────────────────
           EXCEL – one sheet per order, full tabular layout
        ───────────────────────────────────────────────────────────── */
        const wb = XLSX.utils.book_new();

        for (const o of items) {
          const rows: (string | number | null)[][] = [];

          // ── Document title ──
          rows.push(['PURCHASE ORDER', null, null, null, null, null, null, null, null, null, null]);
          rows.push([null]);

          // ── Order information ──
          rows.push(['Order #', o.orderNumber, null, null, null, 'Date', formatDate(o.orderDate), null, null, null, null]);
          rows.push(['Customer', o.customerName, null, null, null, 'Status', o.status, null, null, null, null]);
          rows.push(['Sales Rep', o.repName || '—', null, null, null, null, null, null, null, null, null]);
          if (o.deliveryAddress) rows.push(['Delivery', o.deliveryAddress, null, null, null, null, null, null, null, null, null]);
          rows.push([null]);

          // ── Items header ──
          rows.push(['#', 'Product', 'SKU', 'Qty', 'Unit Price', 'MRP', 'Disc %', 'Disc Amt', 'Tax', 'Tax Amt', 'Line Total']);

          // ── Line items ──
          (o.items || []).forEach((it, i) => {
            const da = calcDiscAmt(it);
            rows.push([
              i + 1,
              it.productName,
              it.productSKU || '—',
              it.quantity,
              it.unitPrice,
              it.mrp ?? null,
              it.discountPercent ? `${it.discountPercent}%` : '—',
              da || null,
              'V18',
              it.taxAmount ?? null,
              it.lineTotal,
            ]);
          });
          rows.push([null]);

          // ── Totals ──
          rows.push([null, null, null, null, null, null, null, null, null, 'Subtotal', o.subTotal]);
          if (o.discountAmount > 0) rows.push([null, null, null, null, null, null, null, null, null, 'Discount', -o.discountAmount]);
          if (o.taxAmount > 0)     rows.push([null, null, null, null, null, null, null, null, null, 'Tax (V18)', o.taxAmount]);
          rows.push([null, null, null, null, null, null, null, null, null, '*** GRAND TOTAL ***', o.totalAmount]);

          const ws = XLSX.utils.aoa_to_sheet(rows);
          ws['!cols'] = [
            { wch: 4 },   // #
            { wch: 36 },  // Product
            { wch: 14 },  // SKU
            { wch: 6 },   // Qty
            { wch: 13 },  // Unit Price
            { wch: 13 },  // MRP
            { wch: 9 },   // Disc %
            { wch: 13 },  // Disc Amt
            { wch: 6 },   // Tax
            { wch: 13 },  // Tax Amt
            { wch: 15 },  // Line Total
          ];

          const safeName = o.orderNumber.replace(/[:/\\?*[\]]/g, '-').substring(0, 31);
          XLSX.utils.book_append_sheet(wb, ws, safeName);
        }

        const xlsxFile = items.length === 1 ? `${items[0].orderNumber}.xlsx` : 'orders-bulk-export.xlsx';
        XLSX.writeFile(wb, xlsxFile);
        toast.success('Excel exported');

      } else {
        // PDF – portrait A4, professional purchase-order format, one page per order
        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const BLUE: [number, number, number] = [31, 73, 125];
        const WHITE: [number, number, number] = [255, 255, 255];
        const DARK: [number, number, number] = [0, 0, 0];
        const LGRAY: [number, number, number] = [242, 242, 242];

        items.forEach((o, index) => {
          if (index > 0) doc.addPage();

          // ── Company name + address (top-left) ──────────────────────
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...DARK);
          doc.text('Janasiri Distribution Pvt Ltd', 14, 16);
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');
          doc.text('No 205 Wattarantenna Passage, Kandy, Sri Lanka', 14, 21);
          doc.text('Phone: 0814 950206  |  Hotline: 0777 675322', 14, 25);
          doc.text('Email: janasiridistributors@yahoo.com', 14, 29);

          // ── PURCHASE ORDER title (top-right) ────────────────────────
          doc.setFontSize(20);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...BLUE);
          doc.text('PURCHASE ORDER', pageW - 14, 16, { align: 'right' });

          let poVal = String(o.orderNumber || '').replace(/[^\x00-\x7F]/g, '');
          if (poVal.length > 14) poVal = poVal.substring(0, 14) + '...';
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...DARK);
          doc.text('DATE', pageW - 60, 23.5);
          doc.text('PO #', pageW - 60, 30);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setDrawColor(180, 180, 180);
          doc.rect(pageW - 48, 19, 34, 5.5, 'S');
          doc.setTextColor(0, 0, 0);
          doc.text(formatDate(o.orderDate), pageW - 15, 23.5, { align: 'right' });
          doc.rect(pageW - 48, 25.5, 34, 5.5, 'S');
          doc.text(poVal, pageW - 15, 30, { align: 'right' });

          // ── VENDOR / SHIP TO boxes ───────────────────────────────────
          const secY = 42;
          const colMid = pageW / 2 + 2;
          doc.setFillColor(...BLUE);
          doc.rect(14, secY, 88, 6, 'F');
          doc.setTextColor(...WHITE);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text('VENDOR', 16, secY + 4.2);
          doc.setFillColor(...BLUE);
          doc.rect(colMid, secY, 88, 6, 'F');
          doc.text('SHIP TO', colMid + 2, secY + 4.2);

          doc.setTextColor(...DARK);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          const vY = secY + 10;
          doc.text('Janasiri Distribution Pvt Ltd', 16, vY);
          doc.text('No 205 Wattarantenna Passage', 16, vY + 5);
          doc.text('Kandy, Sri Lanka', 16, vY + 10);
          doc.text('Phone: 0814 950206', 16, vY + 15);
          doc.text('Hotline: 0777 675322', 16, vY + 20);

          const sY = secY + 10;
          doc.text(o.customerName || '', colMid + 2, sY);
          doc.text(o.repName ? `Rep: ${o.repName}` : '', colMid + 2, sY + 5);
          const addrParts = doc.splitTextToSize(o.deliveryAddress || '', 80);
          doc.text(addrParts[0] || '', colMid + 2, sY + 10);
          if (addrParts[1]) doc.text(addrParts[1], colMid + 2, sY + 15);
          doc.text(`Status: ${o.status}`, colMid + 2, sY + 20);

          doc.setDrawColor(180, 180, 180);
          doc.rect(14, secY, 88, 30);
          doc.rect(colMid, secY, 88, 30);

          // ── Items table ─────────────────────────────────────────────
          const tableStartY = secY + 36;
          const tCols = ['#', 'Product', 'SKU', 'Qty', 'Rate', 'MRP', 'Disc%', 'Disc Amt', 'Tax', 'Tax Amt', 'Total'];
          const tRows = (o.items || []).map((it, i) => {
            const da = calcDiscAmt(it);
            return [
              i + 1,
              it.productName,
              it.productSKU || '—',
              it.quantity,
              formatCurrency(it.unitPrice),
              it.mrp ? formatCurrency(it.mrp) : '—',
              it.discountPercent ? `${it.discountPercent}%` : '—',
              da ? formatCurrency(da) : '—',
              'V18',
              it.taxAmount ? formatCurrency(it.taxAmount) : '—',
              formatCurrency(it.lineTotal),
            ];
          });
          while (tRows.length < 5) tRows.push(['', '', '', '', '', '', '', '', '', '', '']);

          autoTable(doc, {
            head: [tCols],
            body: tRows,
            startY: tableStartY,
            styles: { fontSize: 7, cellPadding: 1.8, overflow: 'linebreak', valign: 'middle' },
            headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 7 },
            columnStyles: {
              0:  { cellWidth: 7,  halign: 'center' },
              1:  { cellWidth: 42 },
              2:  { cellWidth: 14 },
              3:  { cellWidth: 8,  halign: 'center' },
              4:  { cellWidth: 18, halign: 'right' },
              5:  { cellWidth: 17, halign: 'right' },
              6:  { cellWidth: 10, halign: 'center' },
              7:  { cellWidth: 17, halign: 'right' },
              8:  { cellWidth: 8,  halign: 'center' },
              9:  { cellWidth: 17, halign: 'right' },
              10: { cellWidth: 24, halign: 'right' },
            },
            alternateRowStyles: { fillColor: [255, 255, 255] },
            tableLineColor: [180, 180, 180],
            tableLineWidth: 0.2,
            tableWidth: 'auto',
            didDrawCell: (d: any) => {
              if (d.cell.section === 'body' || d.cell.section === 'head') {
                doc.setDrawColor(180, 180, 180);
                doc.setLineWidth(0.2);
                doc.rect(d.cell.x, d.cell.y, d.cell.width, d.cell.height);
              }
            },
          });

          const afterTableY = (doc as any).lastAutoTable.finalY;

          // ── Totals (right) + Comments (left) ────────────────────────
          const totalsX = pageW - 80;
          const totalsStartY = afterTableY + 4;
          const totRows: [string, string][] = [
            ['SUBTOTAL',  formatCurrency(o.subTotal)],
            ['DISCOUNT',  o.discountAmount > 0 ? `- ${formatCurrency(o.discountAmount)}` : '—'],
            ['TAX (V18)', o.taxAmount > 0 ? formatCurrency(o.taxAmount) : '—'],
            ['SHIPPING',  '—'],
          ];
          const rowH = 6;
          const boxRight = pageW - 14;
          const boxW = boxRight - totalsX;

          doc.setFontSize(8.5);
          doc.setDrawColor(180, 180, 180);
          totRows.forEach(([label, val], i) => {
            const ry = totalsStartY + i * rowH;
            doc.setFillColor(...LGRAY);
            doc.rect(totalsX, ry - 4, boxW / 2, rowH, 'FD');
            doc.setFillColor(...WHITE);
            doc.rect(totalsX + boxW / 2, ry - 4, boxW / 2, rowH, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...DARK);
            doc.text(label, totalsX + 2, ry);
            doc.setFont('helvetica', 'normal');
            doc.text(val, boxRight - 2, ry, { align: 'right' });
          });
          const totalRowY = totalsStartY + totRows.length * rowH;
          doc.setFillColor(...BLUE);
          doc.rect(totalsX, totalRowY - 4, boxW, rowH + 1, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(...WHITE);
          doc.text('TOTAL', totalsX + 2, totalRowY);
          doc.text(formatCurrency(o.totalAmount), boxRight - 2, totalRowY, { align: 'right' });

          // Comments box (left side)
          const cbX = 14, cbY = afterTableY + 4;
          const cbW = totalsX - 18;
          const cbH = totRows.length * rowH + 10;
          doc.setFillColor(...LGRAY);
          doc.setTextColor(...DARK);
          doc.rect(cbX, cbY, cbW, 6, 'F');
          doc.setDrawColor(180, 180, 180);
          doc.rect(cbX, cbY, cbW, cbH);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.text('Comments or Special Instructions', cbX + 2, cbY + 4);
          const notes = (o as any).deliveryNotes || (o as any).notes || '';
          if (notes) {
            const split = doc.splitTextToSize(String(notes), cbW - 4);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.text(split, cbX + 2, cbY + 11);
          }

          // ── Footer – full company contact ────────────────────────────
          const ftY = pageH - 32;
          doc.setDrawColor(31, 73, 125);
          doc.setLineWidth(0.4);
          doc.line(14, ftY, pageW - 14, ftY);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(31, 73, 125);
          doc.text('HOW TO CONTACT US', 14, ftY + 5);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(80, 80, 80);
          doc.text('Janasiri Distribution Pvt Ltd  |  No 205 Wattarantenna Passage, Kandy, Sri Lanka', 14, ftY + 11);
          doc.text('HEAD OFFICE (Kandy): No 205 Wattarantenna Passage  –  0777 675322  |  KANDY: No 02 Mawilmada Road  –  0814 950206', 14, ftY + 17);
          doc.text('COLOMBO: No.41A, Gnanathilaka Road, Mount Lavinia  –  75 381 6756', 14, ftY + 22);
          doc.text('Office: 0814 950206  |  Hotline: 0777 675322  |  Email: janasiridistributors@yahoo.com', 14, ftY + 27);
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

  //  Misc 
  const hasActiveFilters = !!(status || repIdFilter || customerIdFilter || fromDate || toDate || search);
  const clearFilters = () => {
    setStatus(''); setRepIdFilter(''); setCustomerIdFilter('');
    setFromDate(''); setToDate(''); setSearch(''); setPage(1);
  };
  const colCount = 8; // checkboxes always visible

  return (
    <div className="animate-fade-in flex flex-col gap-4 pb-28">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <p className="text-slate-500 text-sm mt-1">Manage and track customer orders</p>
      </div>

      {/*  Sticky Toolbar  */}
      <div className="sticky top-0 z-30">
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-2xl shadow-[0_2px_16px_-4px_rgba(0,0,0,0.10)] px-4 py-3 space-y-2.5">

          {/* Row 1: Search + action buttons */}
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


            {/* only search input on toolbar; checkboxes shown in table below */}
            {/* no export or select controls needed */}
          </div>

          {/* Row 2: Filters */}
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

      {/*  Order list  */}
      {isDesktop ? (
        // Custom expandable table
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Rep</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Items</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
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
                      <td className="px-4 py-3.5 text-sm text-slate-700">{order.customerName}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">{order.repName || ''}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">{formatDate(order.orderDate)}</td>
                      <td className="px-4 py-3.5 text-right text-sm font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-4 py-3.5 text-center text-sm text-slate-500">{order.items?.length || 0}</td>
                      <td className="px-4 py-3.5 text-center"><StatusBadge status={order.status} /></td>
                    </tr>

                    {/*  Inline expandable detail row  */}
                    {expandedOrderId === order.id && (
                      <tr className="border-b border-blue-100">
                        <td colSpan={colCount + 2} className="p-0">
                          <div
                            className="bg-gradient-to-b from-blue-50/70 to-slate-50/20 px-8 py-5"
                            style={{ animation: 'fadeIn 0.18s ease-out both' }}
                          >
                            <div>
                              {/* Detail actions row */}
                              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="font-semibold text-slate-700">{order.orderNumber}</span>
                                  <span className="text-slate-400"></span>
                                  <span className="text-slate-500">{order.customerName}</span>
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
                                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Full Details
                                  </button>
                                  {order.status === 'Pending' && (
                                    <>
                                      <button onClick={() => approveMut.mutate(order.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition">
                                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                                      </button>
                                      <button onClick={() => setRejectOrder(order)} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600 transition">
                                        <XCircle className="w-3.5 h-3.5" /> Reject
                                      </button>
                                    </>
                                  )}
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
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">SKU</th>
                                        {/* category not stored on order item, left blank */}
                                        <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Rate</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">MRP</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Disc %</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Disc Amt</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Tax</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Tax Amt</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Line Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {order.items.map((item, i) => (
                                        <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                          <td className="px-4 py-2.5 text-center text-xs text-slate-400 font-medium">{i + 1}</td>
                                          <td className="px-4 py-2.5 font-medium text-slate-900">{item.productName}</td>
                                          <td className="px-4 py-2.5 text-slate-400 text-xs">{item.productSKU || ''}</td>
                                          <td className="px-4 py-2.5 text-center text-slate-700">{item.quantity}</td>
                                          <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                                          <td className="px-4 py-2.5 text-right text-slate-500">
                                            {item.mrp ? formatCurrency(item.mrp) : <span className="text-slate-300">—</span>}
                                          </td>
                                          <td className="px-4 py-2.5 text-right text-slate-500">
                                            {item.discountPercent != null && item.discountPercent !== 0 ? `${item.discountPercent}%` : <span className="text-slate-300">—</span>}
                                          </td>
                                          <td className="px-4 py-2.5 text-right text-slate-500">
                                            {item.discountPercent
                                              ? formatCurrency((item.unitPrice * item.quantity * item.discountPercent) / 100)
                                              : <span className="text-slate-300">—</span>}
                                          </td>
                                          {/* tax code/description not available – placeholder */}
                                          <td className="px-4 py-2.5 text-right text-slate-500">V18</td>
                                          <td className="px-4 py-2.5 text-right text-slate-500">
                                            {item.taxAmount ? formatCurrency(item.taxAmount) : <span className="text-slate-300">—</span>}
                                          </td>
                                          <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* Totals summary  right aligned */}
                              <div className="flex justify-end">
                                <div className="w-60 space-y-1.5 text-sm bg-white border border-slate-100 rounded-xl p-4">
                                  <div className="flex justify-between text-slate-500">
                                    <span>Subtotal</span><span>{formatCurrency(order.subTotal)}</span>
                                  </div>
                                  {order.discountAmount > 0 && (
                                    <div className="flex justify-between text-slate-500">
                                      <span>Discount</span><span className="text-emerald-600">{formatCurrency(order.discountAmount)}</span>
                                    </div>
                                  )}
                                  {order.taxAmount > 0 && (
                                    <div className="flex justify-between text-slate-500">
                                      <span>Tax</span><span>{formatCurrency(order.taxAmount)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between font-bold text-base pt-2.5 border-t border-slate-200 text-indigo-700">
                                    <span>Total</span><span>{formatCurrency(order.totalAmount)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
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
        // Mobile tiles
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
          renderTile={(order) => (
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
                <p className="font-bold text-slate-900">{formatCurrency(order.totalAmount)}</p>
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedOrderId === order.id ? 'rotate-90 text-blue-500' : ''}`} />
              </div>
              {expandedOrderId === order.id && (
                <div className="mt-3 pt-3 border-t border-blue-100 space-y-3 animate-fade-in">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs bg-slate-50 rounded-lg p-2.5">
                      <div>
                        <span className="font-medium text-slate-800">{item.productName}</span>
                        <span className="text-slate-400 ml-1"> {item.quantity}</span>
                        {item.productSKU && <span className="text-slate-400 ml-1 text-[10px]">({item.productSKU})</span>}
                      </div>
                      <span className="font-semibold">{formatCurrency(item.lineTotal)}</span>
                    </div>
                  ))}
                  <div className="text-xs space-y-1.5 bg-white border border-slate-100 rounded-xl p-3 mt-1">
                    <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(order.subTotal)}</span></div>
                    {order.discountAmount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>{formatCurrency(order.discountAmount)}</span></div>}
                    {order.taxAmount > 0 && <div className="flex justify-between text-slate-500"><span>Tax</span><span>{formatCurrency(order.taxAmount)}</span></div>}
                    <div className="flex justify-between font-bold text-indigo-700 pt-1.5 border-t border-slate-100"><span>Total</span><span>{formatCurrency(order.totalAmount)}</span></div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <button onClick={() => navigate(`/admin/orders/${order.id}`)} className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 active:scale-95">View</button>
                    {order.status === 'Pending' && (
                      <>
                        <button onClick={() => approveMut.mutate(order.id)} className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 active:scale-95">Approve</button>
                        <button onClick={() => setRejectOrder(order)} className="px-2.5 py-1 text-xs font-medium rounded-lg bg-orange-50 text-orange-600 active:scale-95">Reject</button>
                      </>
                    )}
                    <button onClick={() => setStatusChangeOrder(order)} className="px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 active:scale-95">Status</button>
                    <button onClick={() => setDeleteOrder(order)} className="px-2.5 py-1 text-xs font-medium rounded-lg bg-red-50 text-red-600 active:scale-95">Delete</button>
                  </div>
                </div>
              )}
            </div>
          )}
        />
      )}

      {/*  Sticky selection action bar  */}
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
              <button onClick={() => exportOrders('pdf', true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition">
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

      {/*  Per-order status change modal  */}
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

      {/*  Bulk status change modal  */}
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

      {/*  Reject confirmation  */}
      <ConfirmModal
        open={!!rejectOrder}
        title="Reject Order"
        description={rejectOrder ? `Reject order ${rejectOrder.orderNumber}? This cannot be undone.` : ''}
        confirmLabel="Reject"
        confirmVariant="orange"
        onConfirm={() => { if (rejectOrder) rejectMut.mutate(rejectOrder.id); }}
        onCancel={() => setRejectOrder(null)}
      />

      {/*  Delete confirmation  */}
      {deleteOrder && (
        <DeleteOrderModal
          orderNumber={deleteOrder.orderNumber}
          isPending={deleteMut.isPending}
          onClose={() => setDeleteOrder(null)}
          onConfirm={() => deleteMut.mutate(deleteOrder.id)}
        />
      )}

      {/*  Bulk delete confirmation  */}
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
  // always render through portal so it's on top of the page DOM
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

