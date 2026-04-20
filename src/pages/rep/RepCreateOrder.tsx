import { useState, useEffect } from 'react';
import type { Order } from '../../types/order.types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../services/api/customersApi';
import { ordersApi } from '../../services/api/ordersApi';
import { productsApi } from '../../services/api/productsApi';
import { formatCurrency } from '../../utils/formatters';
import { calculateLine } from '../../utils/calculations';
import { orderDraftUtils } from '../../utils/orderDraft';
import { ArrowLeft, User, Package, ShoppingCart, Trash2, CheckCircle, MapPin, ChevronRight, Download, Eye, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import type { Product } from '../../types/product.types';
import ProductDropdown from '../../components/common/ProductDropdown';

type DesktopOrderRow = {
  id: string;
  product?: Product;
  qty: number;
};

export default function RepCreateOrder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isDesktop = useIsDesktop();

  const [draft, setDraft] = useState(orderDraftUtils.get());
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState(draft.deliveryAddress || '');
  const [deliveryNotes, setDeliveryNotes] = useState(draft.deliveryNotes || '');
  const [desktopCustomerId, setDesktopCustomerId] = useState(draft.customerId || '');
  const [rowSearches, setRowSearches] = useState<Record<string, string>>({});
  const [desktopRows, setDesktopRows] = useState<DesktopOrderRow[]>(() => {
    if (!draft.items.length) return [{ id: crypto.randomUUID(), qty: 1 }];
    return draft.items.map(item => ({
      id: crypto.randomUUID(),
      qty: item.quantity,
      product: {
        id: item.productId,
        name: item.name,
        sku: item.sku,
        sellingPrice: item.price,
        quantity: 0,
        createdAt: '',
        mrp: item.mrp,
        discountPercent: item.discountPercent,
        taxAmount: item.taxAmount,
        taxCode: item.taxCode,
      },
    }));
  });

  /* ── PDF Receipt (preserved) ── */
  const downloadReceipt = async () => {
    if (!createdOrder) return;
    try {
      const { jsPDF } = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable');
      const autoTable = autoTableModule.default || (autoTableModule as any);
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const BLUE = [31, 73, 125] as [number, number, number];
      const WHITE: [number, number, number] = [255, 255, 255];
      const DARK: [number, number, number] = [0, 0, 0];
      const LIGHT_GRAY: [number, number, number] = [242, 242, 242];
      doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
      doc.text('Janasiri Distribution', 14, 16);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text('[Street Address]', 14, 21); doc.text('[City, ST ZIP]', 14, 25);
      doc.text('Phone: (000) 000-0000', 14, 29); doc.text('Fax: (000) 000-0000', 14, 33);
      doc.text('Website:', 14, 37);
      doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLUE);
      doc.text('PURCHASE ORDER', pageWidth - 14, 16, { align: 'right' });
      const dateValue = new Date(createdOrder.orderDate).toLocaleDateString();
      let poValue = String(createdOrder.orderNumber || createdOrder.id || '').replace(/[^\u0000-\u007F]/g, '');
      if (poValue.length > 14) poValue = poValue.substring(0, 14) + '...';
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
      doc.text('DATE', pageWidth - 60, 23.5); doc.text('PO #', pageWidth - 60, 30);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setDrawColor(180, 180, 180);
      doc.rect(pageWidth - 48, 19, 34, 5.5, 'S'); doc.text(dateValue, pageWidth - 15, 23.5, { align: 'right' });
      doc.rect(pageWidth - 48, 25.5, 34, 5.5, 'S'); doc.text(poValue, pageWidth - 15, 30, { align: 'right' });
      const sectionY = 44; const colMid = pageWidth / 2 + 2;
      doc.setFillColor(...BLUE); doc.rect(14, sectionY, 88, 6, 'F');
      doc.setTextColor(...WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.text('VENDOR', 16, sectionY + 4.2);
      doc.setFillColor(...BLUE); doc.rect(colMid, sectionY, 88, 6, 'F');
      doc.setTextColor(...WHITE); doc.text('SHIP TO', colMid + 2, sectionY + 4.2);
      const vY = sectionY + 10; doc.setTextColor(...DARK); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      doc.text('[Company Name]', 16, vY); doc.text('[Contact or Department]', 16, vY + 5);
      doc.text('[Street Address]', 16, vY + 10); doc.text('[City, ST ZIP]', 16, vY + 15);
      doc.text('Phone: (000) 000-0000', 16, vY + 20);
      const sY = sectionY + 10;
      doc.text(createdOrder.customerName || '[Name]', colMid + 2, sY);
      doc.text('[Company Name]', colMid + 2, sY + 5);
      doc.text(createdOrder.deliveryAddress || '[Street Address]', colMid + 2, sY + 10);
      doc.text('[City, ST ZIP]', colMid + 2, sY + 15); doc.text('[Phone]', colMid + 2, sY + 20);
      doc.setDrawColor(180, 180, 180); doc.rect(14, sectionY, 88, 30); doc.rect(colMid, sectionY, 88, 30);
      const tableStartY = sectionY + 36;
      const cols = isNonTaxCustomer
        ? ['Description','Item','Rate','Qty','Disc%','Disc Amt','Amount']
        : ['Description','Item','Rate','Qty','Disc%','Disc Amt','Tax','Tax Amt','Amount'];
      const pdfRows = createdOrder.items.map((it: any) => {
        const rate = it.unitPrice; const qty = it.quantity; const discPct = it.discountPercent ?? 0;
        const taxPerUnit = qty ? (it.taxAmount ?? 0) / qty : 0;
        const calc = calculateLine({ rate, qty, discountPercent: discPct, taxAmount: taxPerUnit });
        const displayRate = isNonTaxCustomer ? rate + taxPerUnit : rate;
        const rowGross = isNonTaxCustomer ? (rate * qty + (it.taxAmount ?? 0)) : calc.total;
        if (isNonTaxCustomer) {
          return [it.productName, it.productSKU || '', formatCurrency(displayRate), qty,
            discPct ? `${discPct}%` : '-', calc.discount ? formatCurrency(calc.discount) : '-',
            formatCurrency(rowGross)];
        }
        return [it.productName, it.productSKU || '', formatCurrency(displayRate), qty,
          discPct ? `${discPct}%` : '-', calc.discount ? formatCurrency(calc.discount) : '-',
          '-', calc.tax ? formatCurrency(calc.tax) : '-', formatCurrency(calc.total)];
      });
      while (pdfRows.length < 8) pdfRows.push(Array(cols.length).fill(''));
      autoTable(doc, {
        head: [cols], body: pdfRows, startY: tableStartY,
        styles: { fontSize: 7.5, cellPadding: 1.5, overflow: 'linebreak', valign: 'middle' },
        headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
        columnStyles: isNonTaxCustomer
          ? { 0: { cellWidth: 55 }, 1: { cellWidth: 15 }, 2: { cellWidth: 22, halign: 'right' },
            3: { cellWidth: 8, halign: 'center' }, 4: { cellWidth: 10, halign: 'right' },
            5: { cellWidth: 18, halign: 'right' }, 6: { cellWidth: 28, halign: 'right' } }
          : { 0: { cellWidth: 55 }, 1: { cellWidth: 15 }, 2: { cellWidth: 22, halign: 'right' },
            3: { cellWidth: 8, halign: 'center' }, 4: { cellWidth: 10, halign: 'right' },
            5: { cellWidth: 18, halign: 'right' }, 6: { cellWidth: 8, halign: 'center' },
            7: { cellWidth: 18, halign: 'right' }, 8: { cellWidth: 28, halign: 'right' } },
        alternateRowStyles: { fillColor: [255,255,255] }, tableLineColor: [180,180,180], tableLineWidth: 0.2,
        tableWidth: 'auto',
        didDrawCell: (data: any) => { const { cell } = data;
          if (cell.section==='body'||cell.section==='head') {
            doc.setDrawColor(180,180,180); doc.setLineWidth(0.2); doc.rect(cell.x,cell.y,cell.width,cell.height); } }
      });
      const afterTableY = (doc as any).lastAutoTable.finalY;
      const totalsX = pageWidth - 80; const totalsStartY = afterTableY + 4;
      const grand = createdOrder.items.reduce((s: number, i: any) => s + (i.lineTotal ?? i.unitPrice * i.quantity), 0);
      const tax = 0; const shipping = 0; const other = 0; const totalFinal = grand + tax + shipping + other;
      const totalsRows = [['SUBTOTAL', formatCurrency(grand)], ['TAX', tax ? formatCurrency(tax) : '-'],
        ['SHIPPING', shipping ? formatCurrency(shipping) : '-'], ['OTHER', other ? formatCurrency(other) : '-']];
      const rowH = 6; const boxRight = pageWidth - 14; const boxW = boxRight - totalsX;
      doc.setFontSize(8.5); doc.setDrawColor(180, 180, 180);
      totalsRows.forEach(([label, val], i) => {
        const y = totalsStartY + i * rowH;
        doc.setFillColor(...LIGHT_GRAY); doc.rect(totalsX, y - 4, boxW / 2, rowH, 'FD');
        doc.setFillColor(...WHITE); doc.rect(totalsX + boxW / 2, y - 4, boxW / 2, rowH, 'FD');
        doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK); doc.text(label, totalsX + 2, y);
        doc.setFont('helvetica', 'normal'); doc.text(val, boxRight - 2, y, { align: 'right' });
      });
      const totalRowY = totalsStartY + totalsRows.length * rowH;
      doc.setFillColor(...BLUE); doc.rect(totalsX, totalRowY - 4, boxW, rowH + 1, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...WHITE);
      doc.text('TOTAL', totalsX + 2, totalRowY); doc.text(formatCurrency(totalFinal), boxRight - 2, totalRowY, { align: 'right' });
      const commentsBoxX = 14; const commentsBoxY = afterTableY + 4;
      const commentsBoxW = totalsX - 18; const commentsBoxH = totalsRows.length * 6 + 10;
      doc.setFillColor(...LIGHT_GRAY); doc.setTextColor(...DARK);
      doc.rect(commentsBoxX, commentsBoxY, commentsBoxW, 6, 'F'); doc.setDrawColor(180, 180, 180);
      doc.rect(commentsBoxX, commentsBoxY, commentsBoxW, commentsBoxH);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
      doc.text('Comments or Special Instructions', commentsBoxX + 2, commentsBoxY + 4);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      if (createdOrder.deliveryNotes) {
        const splitNotes = doc.splitTextToSize(createdOrder.deliveryNotes, commentsBoxW - 4);
        doc.text(splitNotes, commentsBoxX + 2, commentsBoxY + 11);
      }
      const footerY = Math.max(afterTableY + 38, commentsBoxY + commentsBoxH + 8);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
      doc.text('If you have any questions about this purchase order, please contact:', pageWidth / 2, footerY, { align: 'center' });
      doc.text(`${createdOrder.customerName || '[Name]'}, [Phone #, E-mail]`, pageWidth / 2, footerY + 5, { align: 'center' });
      doc.save(`order-${createdOrder.orderNumber||createdOrder.id}.pdf`);
    } catch (e) { console.error('receipt generation error', e); }
  };

  /* ── Effects ── */
  useEffect(() => {
    const refreshDraft = () => setDraft(orderDraftUtils.get());
    window.addEventListener('focus', refreshDraft);
    refreshDraft();
    return () => window.removeEventListener('focus', refreshDraft);
  }, []);

  useEffect(() => {
    orderDraftUtils.setDeliveryInfo(deliveryAddress, deliveryNotes);
  }, [deliveryAddress, deliveryNotes]);

  /* ── Queries ── */
  const { data: selectedCustomer } = useQuery({
    queryKey: ['rep-customer', draft.customerId],
    queryFn: () => customersApi.repGetById(draft.customerId!).then(r => r.data.data),
    enabled: !!draft.customerId,
  });

  const { data: selectedDesktopCustomerDetail } = useQuery({
    queryKey: ['rep-customer', desktopCustomerId],
    queryFn: () => customersApi.repGetById(desktopCustomerId!).then(r => r.data.data),
    enabled: isDesktop && !!desktopCustomerId,
  });

  const { data: customerList } = useQuery({
    queryKey: ['rep-customers'],
    queryFn: () => customersApi.repGetCustomers({ page: 1, pageSize: 2000 }).then(r => r.data.data),
  });

  const { data: productCatalog } = useQuery({
    queryKey: ['rep-products-for-order-create'],
    queryFn: () => productsApi.getAllForSelection(),
    enabled: isDesktop,
  });

  /* ── Mutations ── */
  const createMut = useMutation({
    mutationFn: (d: { customerId: string; deliveryAddress?: string; deliveryNotes?: string; items: { productId: string; quantity: number }[] }) => ordersApi.repCreate(d),
    onSuccess: (res) => {
      const order = res.data.data;
      queryClient.invalidateQueries({ queryKey: ['rep-orders'] });
      orderDraftUtils.clear();
      toast.success('Order created successfully!');
      setCreatedOrder(order);
    },
    onError: () => toast.error('Failed to create order'),
  });

  const handleSubmit = () => {
    if (!draft.customerId) return toast.error('Please select a customer');
    if (draft.items.length === 0) return toast.error('Add at least one product');
    createMut.mutate({
      customerId: draft.customerId,
      deliveryAddress: deliveryAddress || undefined,
      deliveryNotes: deliveryNotes || undefined,
      items: draft.items.map(({ productId, quantity }) => ({ productId, quantity }))
    });
  };

  /* ── Computed ── */
  const itemCount = draft.items.length;
  const desktopProducts: Product[] = productCatalog || [];
  const isNonTaxCustomer = isDesktop
    ? ((selectedDesktopCustomerDetail?.customerType || '').toLowerCase().replace(/[-\s]/g, '') === 'nontax')
    : ((selectedCustomer?.customerType || '').toLowerCase().replace(/[-\s]/g, '') === 'nontax');

  const mobileTotalGross = draft.items.reduce((s, i) => {
    const rate = i.price || 0, qty = i.quantity || 0, taxAmt = i.taxAmount || 0;
    return s + (isNonTaxCustomer ? (rate * qty + taxAmt * qty) : rate * qty);
  }, 0);
  const mobileTotalTax = draft.items.reduce((s, i) => {
    return s + (isNonTaxCustomer ? 0 : (i.taxAmount || 0)) * (i.quantity || 0);
  }, 0);
  const mobileTotalDiscount = draft.items.reduce((s, i) => {
    return s + ((i.price || 0) * (i.quantity || 0) * ((i.discountPercent || 0) / 100));
  }, 0);
  const total = isNonTaxCustomer
    ? mobileTotalGross - mobileTotalDiscount
    : mobileTotalGross + mobileTotalTax - mobileTotalDiscount;

  const getBaseRate = (p: Product) => (p.sellingPrice || 0) + (p.discountAmount || 0);
  const getCalcInput = (p: Product) => {
    const isSpecialPrice = p.discountPercent == null && (p.discountAmount || 0) > 0;
    const rate = isSpecialPrice ? (p.sellingPrice || 0) : getBaseRate(p);
    const discountPercent = isSpecialPrice ? 0 : (p.discountPercent ?? 0);
    const taxAmount = p.taxAmount ?? 0;
    return { rate, discountPercent, taxAmount, isSpecialPrice };
  };

  const desktopRowsWithProduct = desktopRows.filter(r => !!r.product);

  const desktopTotalGross = desktopRowsWithProduct.reduce((sum, row) => {
    const p = row.product as Product;
    const pricing = getCalcInput(p);
    const rowBase = pricing.rate * row.qty, rowTax = (p.taxAmount || 0) * row.qty;
    return sum + (isNonTaxCustomer ? (rowBase + rowTax) : rowBase);
  }, 0);
  const desktopTotalTax = desktopRowsWithProduct.reduce((sum, row) => {
    return sum + (isNonTaxCustomer ? 0 : ((row.product as Product).taxAmount || 0)) * row.qty;
  }, 0);
  const desktopTotalDiscount = desktopRowsWithProduct.reduce((sum, row) => {
    const p = row.product as Product;
    const pricing = getCalcInput(p);
    return sum + (pricing.isSpecialPrice ? 0 : (p.discountAmount || 0)) * row.qty;
  }, 0);
  const desktopTotal = isNonTaxCustomer
    ? desktopTotalGross - desktopTotalDiscount
    : desktopTotalGross + desktopTotalTax - desktopTotalDiscount;

  const upsertDesktopRow = (rowId: string, updates: Partial<DesktopOrderRow>) => {
    setDesktopRows(prev => {
      const next = prev.map(row => (row.id === rowId ? { ...row, ...updates } : row));
      if (next[next.length - 1]?.id === rowId && updates.product) {
        next.push({ id: crypto.randomUUID(), qty: 1 });
      }
      return next;
    });
  };
  const removeDesktopRow = (rowId: string) => {
    setDesktopRows(prev => {
      const filtered = prev.filter(row => row.id !== rowId);
      return filtered.length ? filtered : [{ id: crypto.randomUUID(), qty: 1 }];
    });
  };

  const handleDesktopSubmit = () => {
    if (!desktopCustomerId) return toast.error('Please select a customer');
    if (!desktopRowsWithProduct.length) return toast.error('Add at least one product');
    createMut.mutate({
      customerId: desktopCustomerId,
      deliveryAddress: deliveryAddress || undefined,
      deliveryNotes: deliveryNotes || undefined,
      items: desktopRowsWithProduct.map(row => ({ productId: (row.product as Product).id, quantity: row.qty })),
    });
  };

  /* ═══════ SUCCESS SCREEN ═══════ */
  if (createdOrder) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 mb-6 animate-[bounceIn_0.5s_ease-out]">
            <CheckCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Order Placed!</h2>
          <p className="text-slate-500 mb-8">Your order has been submitted and is being processed.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => navigate(`/rep/orders/${createdOrder.id}`)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition active:scale-[0.98]">
              <Eye className="w-4 h-4" /> View Order
            </button>
            <button onClick={downloadReceipt}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition active:scale-[0.98]">
              <Download className="w-4 h-4" /> Download Receipt
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════ DESKTOP LAYOUT ═══════ */
  if (isDesktop) {
    const customerName = (customerList?.items || []).find((c: any) => c.id === desktopCustomerId)?.shopName;
    return (
      <div className="min-h-screen bg-slate-50/50">
        <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Create New Order</h1>
                <p className="text-sm text-slate-500">Select a customer, add products, and place the order</p>
              </div>
            </div>
            {desktopRowsWithProduct.length > 0 && (
              <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-700">{desktopRowsWithProduct.length} items</span>
                <span className="text-emerald-300">|</span>
                <span className="text-sm font-bold text-emerald-700">{formatCurrency(desktopTotal)}</span>
              </div>
            )}
          </div>

          {/* Customer */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Customer</h2>
                  {customerName && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {customerName}
                      {isNonTaxCustomer && <span className="text-orange-600 font-semibold"> &bull; Non-Tax</span>}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="p-5">
              <select value={desktopCustomerId} onChange={(e) => setDesktopCustomerId(e.target.value)}
                className="w-full max-w-lg px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition">
                <option value="">Select a customer...</option>
                {(customerList?.items || []).map((c: any) => <option key={c.id} value={c.id}>{c.shopName}</option>)}
              </select>
            </div>
          </div>

          {/* Product Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Package className="w-4 h-4 text-violet-600" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">Order Items</h2>
              </div>
              <button onClick={() => setDesktopRows(prev => [...prev, { id: crypto.randomUUID(), qty: 1 }])}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition">
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider min-w-[280px]">Product</th>
                    <th className="text-left px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">SKU</th>
                    <th className="text-center px-3 py-3 font-semibold text-[10px] uppercase tracking-wider w-20">Qty</th>
                    <th className="text-right px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">Rate</th>
                    <th className="text-right px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">MRP</th>
                    <th className="text-right px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">Disc %</th>
                    <th className="text-right px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">Disc Amt</th>
                    {!isNonTaxCustomer && <th className="text-right px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">Tax</th>}
                    {!isNonTaxCustomer && <th className="text-right px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">Tax Amt</th>}
                    <th className="text-right px-3 py-3 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">Amount</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {desktopRows.map((row) => {
                    const p = row.product;
                    const selectedIds = new Set(desktopRows.filter(r => r.id !== row.id && r.product).map(r => (r.product as Product).id));
                    let rate = 0, discPct = 0, discAmt = 0, taxAmt = 0, grossAmount = 0;
                    if (p) {
                      const pricing = getCalcInput(p);
                      rate = pricing.rate; discPct = pricing.discountPercent;
                      discAmt = pricing.isSpecialPrice ? 0 : (p.discountAmount || 0);
                      taxAmt = p.taxAmount || 0;
                      const baseAmount = rate * row.qty, rowTaxAmount = taxAmt * row.qty;
                      grossAmount = isNonTaxCustomer ? (baseAmount + rowTaxAmount) : baseAmount;
                    }
                    return (
                      <tr key={row.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-2 min-w-[280px]">
                          <ProductDropdown rowId={row.id}
                            value={rowSearches[row.id] !== undefined ? rowSearches[row.id] : (p?.name || '')}
                            products={desktopProducts} selectedProductIds={selectedIds} currentProductId={p?.id}
                            onChange={(val) => { setRowSearches(prev => ({ ...prev, [row.id]: val })); if (!val.trim()) upsertDesktopRow(row.id, { product: undefined }); }}
                            onSelect={(product) => { upsertDesktopRow(row.id, { product }); setRowSearches(prev => ({ ...prev, [row.id]: product.name })); }}
                          />
                        </td>
                        <td className="px-3 py-2 text-slate-500 font-mono text-[10px] whitespace-nowrap">{p?.sku || ''}</td>
                        <td className="px-2 py-2 text-center">
                          <input type="number" min={1} value={row.qty} disabled={!p}
                            onChange={(e) => upsertDesktopRow(row.id, { qty: Math.max(1, Number(e.target.value) || 1) })}
                            className="w-16 text-center text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition disabled:opacity-40"
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700 whitespace-nowrap">{p ? formatCurrency(isNonTaxCustomer ? rate + taxAmt : rate) : ''}</td>
                        <td className="px-3 py-2 text-right text-slate-400 whitespace-nowrap">{p?.mrp != null ? formatCurrency(p.mrp) : ''}</td>
                        <td className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">{p && discPct > 0 ? `${discPct}%` : ''}</td>
                        <td className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">{p && discAmt > 0 ? formatCurrency(discAmt) : ''}</td>
                        {!isNonTaxCustomer && <td className="px-3 py-2 text-right text-slate-400 whitespace-nowrap">{p?.taxCode || ''}</td>}
                        {!isNonTaxCustomer && <td className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">{p && taxAmt > 0 ? formatCurrency(taxAmt) : ''}</td>}
                        <td className="px-3 py-2 text-right font-bold text-slate-900 whitespace-nowrap">{p ? formatCurrency(grossAmount) : ''}</td>
                        <td className="px-2 py-2 text-center">
                          <button onClick={() => removeDesktopRow(row.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Delivery Information</h2>
                  <p className="text-xs text-slate-400">Optional</p>
                </div>
              </div>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Address</label>
                <input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 placeholder-slate-400 transition"
                  placeholder="Enter delivery address..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Instructions</label>
                <input value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 placeholder-slate-400 transition"
                  placeholder="Special instructions..." />
              </div>
            </div>
          </div>

          {/* Summary & Submit */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 space-y-3">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Gross Amount</span>
                <span className="font-semibold text-slate-700">{formatCurrency(desktopTotalGross)}</span>
              </div>
              {!isNonTaxCustomer && (
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Tax</span>
                  <span className="font-semibold text-slate-700">+{formatCurrency(desktopTotalTax)}</span>
                </div>
              )}
              {desktopTotalDiscount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount</span>
                  <span className="font-semibold">-{formatCurrency(desktopTotalDiscount)}</span>
                </div>
              )}
              <div className="h-px bg-slate-100" />
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-slate-900">Grand Total</span>
                <span className="text-2xl font-bold text-emerald-600">{formatCurrency(desktopTotal)}</span>
              </div>
            </div>
            <div className="px-5 pb-5">
              <button disabled={!desktopCustomerId || desktopRowsWithProduct.length === 0 || createMut.isPending}
                onClick={handleDesktopSubmit}
                className="w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-[0.99] flex items-center justify-center gap-2.5 text-sm shadow-lg shadow-emerald-600/20">
                <ShoppingCart className="w-4 h-4" />
                {createMut.isPending ? 'Placing Order...' : `Place Order — ${formatCurrency(desktopTotal)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════ MOBILE / TABLET LAYOUT ═══════ */
  return (
    <div className="pb-28">
      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => { orderDraftUtils.clear(); navigate(-1); }}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition shrink-0">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900">Review Order</h1>
            <p className="text-xs text-slate-500">Confirm details and place your order</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex gap-2">
          {[
            { label: 'Customer', done: !!draft.customerId },
            { label: 'Products', done: draft.items.length > 0 },
            { label: 'Place', done: !!draft.customerId && draft.items.length > 0 },
          ].map((step, i) => (
            <div key={i} className={`flex-1 rounded-xl p-3 text-center transition-all ${step.done ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-slate-200'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${step.done ? 'text-emerald-600' : 'text-slate-400'}`}>{step.label}</p>
              <p className={`text-xs font-bold mt-0.5 ${step.done ? 'text-emerald-700' : 'text-slate-300'}`}>{step.done ? '\u2713' : '\u2014'}</p>
            </div>
          ))}
        </div>

        {/* Customer Card */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm font-bold text-slate-900">Customer</span>
            </div>
            {draft.customerId && (
              <button onClick={() => navigate('/rep/orders/new/customers')} className="text-xs font-semibold text-emerald-600">Change</button>
            )}
          </div>
          <div className="p-4">
            {!draft.customerId ? (
              <button onClick={() => navigate('/rep/orders/new/customers')}
                className="w-full py-10 border-2 border-dashed border-slate-200 rounded-xl hover:border-emerald-400 hover:bg-emerald-50/30 transition group text-center">
                <User className="w-8 h-8 mx-auto text-slate-300 group-hover:text-emerald-500 mb-2" />
                <p className="text-sm font-bold text-slate-500 group-hover:text-emerald-600">Select Customer</p>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {draft.customerName?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{draft.customerName}</p>
                  {selectedCustomer && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedCustomer.city || 'No location'} &bull; {selectedCustomer.phoneNumber || 'No phone'}
                      {isNonTaxCustomer && <span className="text-orange-600 font-semibold"> &bull; Non-Tax</span>}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </div>
            )}
          </div>
        </div>

        {/* Products Card */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <Package className="w-4 h-4 text-violet-600" />
              </div>
              <span className="text-sm font-bold text-slate-900">Products</span>
              {draft.items.length > 0 && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">{draft.items.length}</span>
              )}
            </div>
            {draft.items.length > 0 && (
              <button onClick={() => navigate('/rep/orders/new/products')} className="text-xs font-semibold text-emerald-600">Edit</button>
            )}
          </div>
          <div className="p-4">
            {draft.items.length === 0 ? (
              <button onClick={() => navigate('/rep/orders/new/products')}
                className="w-full py-10 border-2 border-dashed border-slate-200 rounded-xl hover:border-emerald-400 hover:bg-emerald-50/30 transition group text-center">
                <Package className="w-8 h-8 mx-auto text-slate-300 group-hover:text-emerald-500 mb-2" />
                <p className="text-sm font-bold text-slate-500 group-hover:text-emerald-600">Add Products</p>
              </button>
            ) : (
              <div className="space-y-3">
                {draft.items.map(item => {
                  const rate = item.price || 0, qty = item.quantity || 0, taxAmt = item.taxAmount || 0;
                  const displayRate = isNonTaxCustomer ? rate + taxAmt : rate;
                  const baseAmount = rate * qty, rowTax = taxAmt * qty;
                  const grossAmount = isNonTaxCustomer ? (baseAmount + rowTax) : baseAmount;
                  return (
                    <div key={item.productId} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{item.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{item.sku} &bull; {formatCurrency(displayRate)} x {qty}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(grossAmount)}</p>
                        {!isNonTaxCustomer && taxAmt > 0 && (
                          <p className="text-[10px] text-slate-400">+tax {formatCurrency(taxAmt)}</p>
                        )}
                      </div>
                      <button onClick={() => { orderDraftUtils.removeItem(item.productId); setDraft(orderDraftUtils.get()); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                <button onClick={() => navigate('/rep/orders/new/products')}
                  className="w-full py-2.5 border border-emerald-200 text-emerald-600 font-semibold rounded-xl text-xs hover:bg-emerald-50 transition">
                  + Add More Products
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Delivery */}
        {draft.customerId && draft.items.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900">Delivery</span>
                  <span className="text-xs text-slate-400 ml-2">Optional</span>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                placeholder="Delivery address..." />
              <textarea value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} rows={2}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                placeholder="Special instructions..." />
            </div>
          </div>
        )}

        {/* Summary */}
        {draft.items.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Gross Amount</span><span className="font-semibold text-slate-700">{formatCurrency(mobileTotalGross)}</span>
            </div>
            {!isNonTaxCustomer && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>Tax</span><span className="font-semibold text-slate-700">+{formatCurrency(mobileTotalTax)}</span>
              </div>
            )}
            {mobileTotalDiscount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount</span><span className="font-semibold">-{formatCurrency(mobileTotalDiscount)}</span>
              </div>
            )}
            <div className="h-px bg-slate-100" />
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900">Grand Total</span>
              <span className="text-xl font-bold text-emerald-600">{formatCurrency(total)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Bar */}
      {draft.items.length > 0 && (
        <div className="fixed left-0 right-0 bottom-[calc(env(safe-area-inset-bottom,0px)+70px)] z-40 px-3">
          <div className="max-w-2xl mx-auto">
            <button disabled={!draft.customerId || draft.items.length === 0 || createMut.isPending}
              onClick={handleSubmit}
              className="w-full bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-600/30 p-4 flex items-center gap-3 disabled:opacity-50 active:scale-[0.98] transition">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[10px] font-semibold text-emerald-100 uppercase tracking-wider">{itemCount} Item{itemCount !== 1 ? 's' : ''}</p>
                <p className="text-base font-bold">{formatCurrency(total)}</p>
              </div>
              <span className="px-5 py-2.5 bg-white text-emerald-700 rounded-xl text-sm font-bold shrink-0">
                {createMut.isPending ? 'Placing...' : 'Place Order'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
