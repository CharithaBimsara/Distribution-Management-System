import { useState, useEffect } from 'react';
import type { Order } from '../../types/order.types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../services/api/customersApi';
import { ordersApi } from '../../services/api/ordersApi';
import { productsApi } from '../../services/api/productsApi';
import { formatCurrency } from '../../utils/formatters';
import { calculateLine } from '../../utils/calculations';
import { orderDraftUtils } from '../../utils/orderDraft';
import { ArrowLeft, User, Package, ShoppingCart, Trash2, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import type { Product } from '../../types/product.types';

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

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...DARK);
      doc.text('Janasiri Distribution', 14, 16);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('[Street Address]', 14, 21);
      doc.text('[City, ST ZIP]', 14, 25);
      doc.text('Phone: (000) 000-0000', 14, 29);
      doc.text('Fax: (000) 000-0000', 14, 33);
      doc.text('Website:', 14, 37);

      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLUE);
      doc.text('PURCHASE ORDER', pageWidth - 14, 16, { align: 'right' });

      const dateLabel = 'DATE';
      const poLabel = 'PO #';
      const dateValue = new Date(createdOrder.orderDate).toLocaleDateString();
      
      let poValue = String(createdOrder.orderNumber || createdOrder.id || '').replace(/[^\u0000-\u007F]/g, ''); 
      if (poValue.length > 14) {
        poValue = poValue.substring(0, 14) + '...';
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...DARK);
      doc.text(dateLabel, pageWidth - 60, 23.5);
      doc.text(poLabel, pageWidth - 60, 30);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      
      doc.setDrawColor(180, 180, 180);
      
      doc.rect(pageWidth - 48, 19, 34, 5.5, 'S'); 
      doc.setTextColor(0, 0, 0);
      doc.text(dateValue, pageWidth - 15, 23.5, { align: 'right' });
      
      doc.rect(pageWidth - 48, 25.5, 34, 5.5, 'S'); 
      doc.text(poValue, pageWidth - 15, 30, { align: 'right' });

      const sectionY = 44;
      const colMid = pageWidth / 2 + 2;

      doc.setFillColor(...BLUE);
      doc.rect(14, sectionY, 88, 6, 'F');
      doc.setTextColor(...WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('VENDOR', 16, sectionY + 4.2);

      doc.setFillColor(...BLUE);
      doc.rect(colMid, sectionY, 88, 6, 'F');
      doc.setTextColor(...WHITE);
      doc.text('SHIP TO', colMid + 2, sectionY + 4.2);

      const vY = sectionY + 10;
      doc.setTextColor(...DARK);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('[Company Name]', 16, vY);
      doc.text('[Contact or Department]', 16, vY + 5);
      doc.text('[Street Address]', 16, vY + 10);
      doc.text('[City, ST ZIP]', 16, vY + 15);
      doc.text('Phone: (000) 000-0000', 16, vY + 20);

      const sY = sectionY + 10;
      doc.text(createdOrder.customerName || '[Name]', colMid + 2, sY);
      doc.text('[Company Name]', colMid + 2, sY + 5);
      doc.text(createdOrder.deliveryAddress || '[Street Address]', colMid + 2, sY + 10);
      doc.text('[City, ST ZIP]', colMid + 2, sY + 15);
      doc.text('[Phone]', colMid + 2, sY + 20);

      doc.setDrawColor(180, 180, 180);
      doc.rect(14, sectionY, 88, 30);
      doc.rect(colMid, sectionY, 88, 30);

      const tableStartY = sectionY + 36;
      const cols = ['Description','Item','Rate','Qty','Disc%','Disc Amt','Tax','Tax Amt','Amount'];
      const rows = createdOrder.items.map((it: any) => {
        const rate = it.unitPrice;
        const qty = it.quantity;
        const discPct = it.discountPercent ?? 0;
        const taxPerUnit = qty ? (it.taxAmount ?? 0) / qty : 0;
        const calc = calculateLine({ rate, qty, discountPercent: discPct, taxAmount: taxPerUnit });
        return [
          it.productName,
          it.productSKU || '',
          formatCurrency(rate),
          qty,
          discPct ? `${discPct}%` : '-',
          calc.discount ? formatCurrency(calc.discount) : '-',
          '-',
          calc.tax ? formatCurrency(calc.tax) : '-',
          formatCurrency(calc.total),
        ];
      });
      while (rows.length < 8) rows.push(['','','','','','','','','']);

      autoTable(doc, {
        head: [cols],
        body: rows,
        startY: tableStartY,
        styles: { fontSize: 7.5, cellPadding: 1.5, overflow: 'linebreak', valign: 'middle' },
        headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 55 },                          
          1: { cellWidth: 15 },                          
          2: { cellWidth: 22, halign: 'right' },         
          3: { cellWidth: 8, halign: 'center' },         
          4: { cellWidth: 10, halign: 'right' },         
          5: { cellWidth: 18, halign: 'right' },         
          6: { cellWidth: 8, halign: 'center' },         
          7: { cellWidth: 18, halign: 'right' },         
          8: { cellWidth: 28, halign: 'right' }, 
        },
        alternateRowStyles: { fillColor: [255,255,255] },
        tableLineColor: [180,180,180],
        tableLineWidth: 0.2,
        tableWidth: 'auto',
        didDrawCell: (data: any) => { 
            const { cell } = data; 
            if (cell.section==='body'||cell.section==='head') { 
                doc.setDrawColor(180,180,180); 
                doc.setLineWidth(0.2); 
                doc.rect(cell.x,cell.y,cell.width,cell.height);
            } 
        }
      });

      const afterTableY = (doc as any).lastAutoTable.finalY;

      const totalsX = pageWidth - 80;
      const totalsStartY = afterTableY + 4;
      const grand = createdOrder.items.reduce((s: number, i: any) => s + (i.lineTotal ?? i.unitPrice * i.quantity), 0);
      const tax = 0;
      const shipping = 0;
      const other = 0;
      const totalFinal = grand + tax + shipping + other;

      const totalsRows = [
        ['SUBTOTAL', formatCurrency(grand)],
        ['TAX', tax ? formatCurrency(tax) : '-'],
        ['SHIPPING', shipping ? formatCurrency(shipping) : '-'],
        ['OTHER', other ? formatCurrency(other) : '-'],
      ];

      const rowH = 6;
      const boxRight = pageWidth - 14;
      const boxW = boxRight - totalsX;

      doc.setFontSize(8.5);
      doc.setDrawColor(180, 180, 180);
      totalsRows.forEach(([label, val], i) => {
        const y = totalsStartY + i * rowH;
        doc.setFillColor(...LIGHT_GRAY);
        doc.rect(totalsX, y - 4, boxW / 2, rowH, 'FD');
        doc.setFillColor(...WHITE);
        doc.rect(totalsX + boxW / 2, y - 4, boxW / 2, rowH, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK);
        doc.text(label, totalsX + 2, y);
        doc.setFont('helvetica', 'normal');
        doc.text(val, boxRight - 2, y, { align: 'right' });
      });

      const totalRowY = totalsStartY + totalsRows.length * rowH;
      doc.setFillColor(...BLUE);
      doc.rect(totalsX, totalRowY - 4, boxW, rowH + 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...WHITE);
      doc.text('TOTAL', totalsX + 2, totalRowY);
      doc.text(formatCurrency(totalFinal), boxRight - 2, totalRowY, { align: 'right' });

      const commentsBoxX = 14;
      const commentsBoxY = afterTableY + 4;
      const commentsBoxW = totalsX - 18;
      const commentsBoxH = totalsRows.length * 6 + 10;

      doc.setFillColor(...LIGHT_GRAY);
      doc.setTextColor(...DARK);
      doc.rect(commentsBoxX, commentsBoxY, commentsBoxW, 6, 'F');
      doc.setDrawColor(180, 180, 180);
      doc.rect(commentsBoxX, commentsBoxY, commentsBoxW, commentsBoxH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Comments or Special Instructions', commentsBoxX + 2, commentsBoxY + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      
      if (createdOrder.deliveryNotes) {
        const splitNotes = doc.splitTextToSize(createdOrder.deliveryNotes, commentsBoxW - 4);
        doc.text(splitNotes, commentsBoxX + 2, commentsBoxY + 11);
      }

      const footerY = Math.max(afterTableY + 38, commentsBoxY + commentsBoxH + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        'If you have any questions about this purchase order, please contact:',
        pageWidth / 2,
        footerY,
        { align: 'center' }
      );
      doc.text(
        `${createdOrder.customerName || '[Name]'}, [Phone #, E-mail]`,
        pageWidth / 2,
        footerY + 5,
        { align: 'center' }
      );

      doc.save(`order-${createdOrder.orderNumber||createdOrder.id}.pdf`);
    } catch (e) {
      console.error('receipt generation error', e);
    }
  };

  useEffect(() => {
    const refreshDraft = () => setDraft(orderDraftUtils.get());
    window.addEventListener('focus', refreshDraft);
    refreshDraft();
    return () => window.removeEventListener('focus', refreshDraft);
  }, []);

  useEffect(() => {
    orderDraftUtils.setDeliveryInfo(deliveryAddress, deliveryNotes);
  }, [deliveryAddress, deliveryNotes]);

  const { data: selectedCustomer } = useQuery({
    queryKey: ['rep-customer', draft.customerId],
    queryFn: () => customersApi.repGetById(draft.customerId!).then(r => r.data.data),
    enabled: !!draft.customerId,
  });

  const { data: customerList } = useQuery({
    queryKey: ['rep-customers'],
    queryFn: () => customersApi.repGetCustomers({ page: 1, pageSize: 2000 }).then(r => r.data.data),
  });

  const { data: productCatalog } = useQuery({
    queryKey: ['rep-products-for-order-create'],
    queryFn: () => productsApi.getAll({ page: 1, pageSize: 500 }).then(r => r.data.data),
    enabled: isDesktop,
  });

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

  const total = draft.items.reduce((s, i) => s + (i.lineTotal ?? calculateLine({ rate: i.price, qty: i.quantity, discountPercent: i.discountPercent, taxAmount: i.taxAmount }).total), 0);
  const itemCount = draft.items.length;
  const exceedsCredit = false;
  const desktopProducts: Product[] = productCatalog?.items || [];
  const selectedDesktopCustomer = (customerList?.items || []).find((c: any) => c.id === desktopCustomerId);
  const isNonTaxCustomer = ((selectedDesktopCustomer?.customerType || '').toLowerCase().replace(/[-\s]/g, '') === 'nontax');
  const desktopRowsWithProduct = desktopRows.filter(r => !!r.product);
  const desktopTotal = desktopRowsWithProduct.reduce((sum, row) => {
    const p = row.product as Product;
    const calc = calculateLine({
      rate: p.sellingPrice || 0,
      qty: row.qty,
      discountPercent: p.discountPercent ?? 0,
      taxAmount: p.taxAmount,
    });
    return sum + calc.total;
  }, 0);

  const upsertDesktopRow = (rowId: string, updates: Partial<DesktopOrderRow>) => {
    setDesktopRows(prev => {
      const next = prev.map(row => (row.id === rowId ? { ...row, ...updates } : row));
      const isLast = next[next.length - 1]?.id === rowId;
      if (isLast && updates.product) {
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
      items: desktopRowsWithProduct.map(row => ({
        productId: (row.product as Product).id,
        quantity: row.qty,
      })),
    });
  };

  if (createdOrder) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[70vh] px-6">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-3xl flex items-center justify-center mb-5 animate-scale-in">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Order Placed!</h2>
        <p className="text-sm text-slate-400 mb-8 text-center max-w-xs">Your order has been submitted successfully.</p>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => navigate(`/rep/orders/${createdOrder.id}`)}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-orange-500/25 active:scale-95 transition-all"
          >
            View Order
          </button>
          <button
            onClick={downloadReceipt}
            className="flex-1 px-4 py-3 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold shadow-sm active:scale-95 transition-all"
          >
            Download Receipt
          </button>
        </div>
      </div>
    );
  }

  if (isDesktop) {
    return (
      <div className="animate-fade-in pb-16">
        <div className="px-4 md:px-6 pt-5 max-w-6xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Create Order</h1>
              <p className="text-sm text-slate-500 mt-0.5">Select customer and products in one table</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Customer</label>
            <select
              value={desktopCustomerId}
              onChange={(e) => setDesktopCustomerId(e.target.value)}
              className="w-full md:max-w-md px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300"
            >
              <option value="">Select customer</option>
              {(customerList?.items || []).map((customer: any) => (
                <option key={customer.id} value={customer.id}>{customer.shopName}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full table-auto text-[11px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  <th className="text-left px-3 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">Description</th>
                  <th className="whitespace-nowrap text-left px-3 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">Item</th>
                  <th className="whitespace-nowrap text-center px-3 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">Qty</th>
                  <th className="whitespace-nowrap text-right px-3 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">Rate</th>
                  <th className="whitespace-nowrap text-right px-3 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">MRP</th>
                  <th className="whitespace-nowrap text-right px-3 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">Disc %</th>
                  <th className="whitespace-nowrap text-right px-3 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">Disc Amt</th>
                  {!isNonTaxCustomer && <th className="whitespace-nowrap text-right px-3 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">Tax</th>}
                  {!isNonTaxCustomer && <th className="whitespace-nowrap text-right px-3 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">Tax Amt</th>}
                  <th className="whitespace-nowrap text-right px-3 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">Amount</th>
                  <th className="whitespace-nowrap text-center px-2 py-2 font-semibold text-slate-600 text-[9px] uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {desktopRows.map((row) => {
                  const p = row.product;
                  const selectedIds = new Set(
                    desktopRows.filter((r) => r.id !== row.id && r.product).map((r) => (r.product as Product).id)
                  );
                  const calc = p
                    ? calculateLine({
                        rate: p.sellingPrice || 0,
                        qty: row.qty,
                        discountPercent: p.discountPercent ?? 0,
                        taxAmount: isNonTaxCustomer ? 0 : p.taxAmount,
                      })
                    : null;
                  return (
                    <tr key={row.id} className="odd:bg-white even:bg-slate-50/50">
                      <td className="px-2 py-1.5 min-w-[260px]">
                        <select
                          value={p?.id || ''}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const product = desktopProducts.find((item) => item.id === selectedId);
                            if (!product) return;
                            upsertDesktopRow(row.id, { product });
                          }}
                          className="w-full border border-slate-300 rounded-md px-2 py-1 bg-white text-[11px]"
                        >
                          <option value="">Select product</option>
                          {desktopProducts.map((option) => (
                            <option key={option.id} value={option.id} disabled={selectedIds.has(option.id)}>
                              {option.name} ({option.sku})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-1.5 text-slate-600 font-mono text-[10px] whitespace-nowrap">{p?.sku || ''}</td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="number"
                          min={1}
                          value={row.qty}
                          disabled={!p}
                          onChange={(e) => upsertDesktopRow(row.id, { qty: Math.max(1, Number(e.target.value) || 1) })}
                          className="w-14 text-center text-[11px] border border-slate-300 rounded-md px-1 py-0.5"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">{p ? formatCurrency(p.sellingPrice || 0) : ''}</td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">{p?.mrp != null ? formatCurrency(p.mrp) : ''}</td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">{p ? (p.discountPercent ?? 0) : ''}</td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">{calc ? formatCurrency(calc.discount) : ''}</td>
                      {!isNonTaxCustomer && <td className="px-3 py-1.5 text-right whitespace-nowrap">{p?.taxCode || ''}</td>}
                      {!isNonTaxCustomer && <td className="px-3 py-1.5 text-right whitespace-nowrap">{calc ? formatCurrency(calc.tax) : ''}</td>}
                      <td className="px-3 py-1.5 text-right font-semibold whitespace-nowrap">{calc ? formatCurrency(calc.total) : ''}</td>
                      <td className="px-2 py-1.5 text-center">
                        <button onClick={() => removeDesktopRow(row.id)} className="text-red-500 hover:text-red-700 text-[11px]">x</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => setDesktopRows((prev) => [...prev, { id: crypto.randomUUID(), qty: 1 }])}
            className="w-full py-2 text-xs font-semibold border border-dashed border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition"
          >
            + Add Row
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Delivery Information (Optional)</h3>
            <div className="grid grid-cols-2 gap-3">
              <input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm" placeholder="Delivery address..." />
              <input value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm" placeholder="Special instructions..." />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border-2 border-emerald-200 p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-slate-700">Order Total</span>
              <span className="text-3xl font-bold text-emerald-600">{formatCurrency(desktopTotal)}</span>
            </div>
            <button
              disabled={!desktopCustomerId || desktopRowsWithProduct.length === 0 || createMut.isPending}
              onClick={handleDesktopSubmit}
              className="w-full py-4 bg-emerald-600 text-white font-bold text-lg rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <ShoppingCart className="w-6 h-6" />
              {createMut.isPending ? 'Placing Order...' : `Place Order — ${formatCurrency(desktopTotal)}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-24 md:pb-28 lg:pb-16">
      <div className="px-4 md:px-5 lg:px-6 pt-4 md:pt-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5 md:mb-6">
          <button onClick={() => { orderDraftUtils.clear(); navigate(-1); }} className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 w-fit">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl lg:text-2xl font-bold text-slate-900">Review & Place Order</h1>
            <p className="text-sm md:text-base lg:text-sm text-slate-500 mt-1">Confirm customer, products, and delivery details</p>
          </div>
        </div>

        {/* Step Status Chips - Mobile/Tablet only */}
        {!isDesktop && (
          <div className="grid grid-cols-3 gap-2.5 mb-6 md:mb-7">
            <StepMini label="Customer" done={!!draft.customerId} />
            <StepMini label="Products" done={draft.items.length > 0} />
            <StepMini label="Ready" done={!!draft.customerId && draft.items.length > 0} />
          </div>
        )}

        {/* Customer Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6 mb-4 md:mb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <User className="w-5 h-5 text-emerald-700" />
              </div>
              <h2 className="text-lg md:text-base font-bold text-slate-900">Customer</h2>
            </div>
            {draft.customerId && (
              <button onClick={() => navigate('/rep/orders/new/customers')} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition">
                Change
              </button>
            )}
          </div>

          {!draft.customerId ? (
            <button onClick={() => navigate('/rep/orders/new/customers')} className="w-full py-16 md:py-12 border-2 border-dashed border-slate-300 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/50 transition group">
              <User className="w-12 h-12 mx-auto text-slate-400 group-hover:text-emerald-600 mb-3" />
              <div className="text-lg md:text-base font-bold text-slate-700 group-hover:text-emerald-600">Select Customer</div>
              <div className="text-sm text-slate-500 mt-2">Tap to choose from your customers</div>
            </button>
          ) : (
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 rounded-2xl p-5 md:p-5 border border-emerald-200">
              <div className="text-lg md:text-base font-bold text-slate-900 mb-3">{draft.customerName}</div>
              {selectedCustomer && (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Location</div>
                    <div className="text-base md:text-sm font-semibold text-slate-900 mt-1">{selectedCustomer.city}</div>
                  </div>
                  <div className="pt-3 border-t border-emerald-200">
                    <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Contact</div>
                    <div className="text-sm md:text-base font-semibold text-slate-900 mt-1">{selectedCustomer.phoneNumber || 'N/A'}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Products Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6 mb-4 md:mb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-700" />
              </div>
              <h2 className="text-lg md:text-base font-bold text-slate-900">Products</h2>
              {draft.items.length > 0 && (
                <span className="ml-2 px-2.5 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg">
                  {draft.items.length}
                </span>
              )}
            </div>
            {draft.items.length > 0 && (
              <button onClick={() => navigate('/rep/orders/new/products')} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition">
                Edit
              </button>
            )}
          </div>

          {draft.items.length === 0 ? (
            <button onClick={() => navigate('/rep/orders/new/products')} className="w-full py-16 md:py-12 border-2 border-dashed border-slate-300 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/50 transition group">
              <Package className="w-12 h-12 mx-auto text-slate-400 group-hover:text-emerald-600 mb-3" />
              <div className="text-lg md:text-base font-bold text-slate-700 group-hover:text-emerald-600">Add Products</div>
              <div className="text-sm text-slate-500 mt-2">Browse catalog and add items to cart</div>
            </button>
          ) : (
            <>
              <div className="mb-4">
                {isDesktop ? (
                  <div className="rounded-xl overflow-x-auto border border-slate-200">
                    <table className="w-full text-[11px] min-w-[980px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase">Description</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase">Item</th>
                          <th className="px-3 py-2 text-center font-semibold text-slate-500 uppercase">Qty</th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Rate</th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">MRP</th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Disc %</th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Disc Amt</th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Tax</th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Tax Amt</th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Amount</th>
                          <th className="px-3 py-2 text-center font-semibold text-slate-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {draft.items.map(item => {
                          const rate = item.price || 0;
                          const qty = item.quantity || 0;
                          const discPct = item.discountPercent || 0;
                          const calc = calculateLine({ rate, qty, discountPercent: discPct, taxAmount: item.taxAmount });
                          const amount = item.lineTotal ?? calc.total;
                          return (
                            <tr key={item.productId}>
                              <td className="px-3 py-2.5 text-slate-800 max-w-[220px] truncate" title={item.name || '-'}>{item.name || '-'}</td>
                              <td className="px-3 py-2.5 text-slate-600">{item.sku || '-'}</td>
                              <td className="px-3 py-2.5 text-center text-slate-600">{qty}</td>
                              <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(rate)}</td>
                              <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(item.mrp ?? rate)}</td>
                              <td className="px-3 py-2.5 text-right text-slate-700">{discPct}</td>
                              <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(calc.discount)}</td>
                              <td className="px-3 py-2.5 text-right text-slate-700">{item.taxCode || '-'}</td>
                              <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(calc.tax)}</td>
                              <td className="px-3 py-2.5 text-right font-semibold text-slate-900">{formatCurrency(amount)}</td>
                              <td className="px-3 py-2.5 text-center">
                                <button onClick={() => { orderDraftUtils.removeItem(item.productId); setDraft(orderDraftUtils.get()); }} className="inline-flex p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {draft.items.map(item => (
                      <div key={item.productId} className="flex flex-col md:flex-row md:items-center gap-3 bg-slate-50 rounded-2xl p-4 md:p-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-base md:text-sm font-bold text-slate-900 truncate">{item.name}</div>
                          <div className="text-xs md:text-xs text-slate-500 mt-1 space-y-0.5">
                            <div>{item.sku} • {formatCurrency(item.price)}</div>
                            {item.discountPercent != null && (
                              <div className="text-orange-700 font-semibold">Disc {item.discountPercent}%</div>
                            )}
                            {item.taxAmount != null && (
                              <div className="text-emerald-700 font-semibold">Tax {formatCurrency(item.taxAmount)}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-3">
                          <div className="text-sm text-slate-600 md:min-w-[120px] text-right">
                            {item.quantity} × {formatCurrency(item.price)}
                          </div>
                          <div className="text-base md:text-sm font-bold text-slate-900 md:min-w-[100px] text-right">
                            {formatCurrency(item.lineTotal ?? 0)}
                          </div>
                          <button onClick={() => { orderDraftUtils.removeItem(item.productId); setDraft(orderDraftUtils.get()); }} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => navigate('/rep/orders/new/products')} className="w-full py-3.5 md:py-3 border-2 border-emerald-600 text-emerald-600 font-bold rounded-xl hover:bg-emerald-50 transition text-base md:text-sm">
                + Add More Products
              </button>
            </>
          )}
        </div>

        {/* Delivery Info Section */}
        {draft.customerId && draft.items.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6 mb-4 md:mb-5">
            <h3 className="text-lg md:text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Package className="w-4 h-4 text-amber-700" />
              </div>
              Delivery Information
            </h3>
            <p className="text-sm text-slate-500 mb-4">(Optional) Add delivery address and special instructions</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Delivery Address</label>
                <input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} className="w-full px-4 py-3 md:py-2.5 border border-slate-300 rounded-xl text-sm outline-emerald-500 placeholder-slate-400" placeholder="Enter delivery address..." />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Special Instructions</label>
                <textarea value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} className="w-full px-4 py-3 md:py-2.5 border border-slate-300 rounded-xl text-sm outline-emerald-500 resize-none placeholder-slate-400" rows={3} placeholder="Any special instructions for delivery..." />
              </div>
            </div>
          </div>
        )}

        {/* Desktop Order Total */}
        {draft.items.length > 0 && isDesktop && (
          <div className="bg-white rounded-2xl shadow-lg border-2 border-emerald-200 p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-slate-700">Order Total</span>
              <span className="text-3xl font-bold text-emerald-600">{formatCurrency(total)}</span>
            </div>

            {exceedsCredit && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 font-semibold">
                ⚠️ Warning: This order will exceed customer's credit limit
              </div>
            )}

            <button disabled={!draft.customerId || draft.items.length === 0 || createMut.isPending} onClick={handleSubmit} className="w-full py-4 bg-emerald-600 text-white font-bold text-lg rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3">
              <ShoppingCart className="w-6 h-6" />
              {createMut.isPending ? 'Placing Order...' : `Place Order — ${formatCurrency(total)}`}
            </button>
          </div>
        )}
      </div>

      {draft.items.length > 0 && !isDesktop && (
        <div className="fixed left-0 right-0 bottom-[calc(env(safe-area-inset-bottom,0px)+70px)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+74px)] z-40 px-3 md:px-4">
          <div className="max-w-3xl mx-auto bg-gradient-to-r from-emerald-600 to-emerald-700 border-2 border-emerald-500 rounded-2xl shadow-2xl shadow-emerald-500/30 p-4 flex items-center gap-3 text-white">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wide">{itemCount} Item{itemCount !== 1 ? 's' : ''}</p>
              <p className="text-base md:text-lg font-bold text-white truncate">{formatCurrency(total)}</p>
            </div>
            <button
              disabled={!draft.customerId || draft.items.length === 0 || createMut.isPending}
              onClick={handleSubmit}
              className="px-5 py-3 rounded-xl bg-white text-emerald-700 text-sm font-bold hover:bg-emerald-50 disabled:opacity-60 active:scale-95 transition whitespace-nowrap shadow-lg"
            >
              {createMut.isPending ? 'Placing...' : 'Place'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepMini({ label, done }: { label: string; done: boolean }) {
  return (
    <div className={`rounded-xl border-2 px-3 py-3.5 md:py-2.5 transition-all ${done ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-400'}`}>
      <p className="text-[9px] md:text-[8px] uppercase tracking-widest font-bold opacity-70">{label}</p>
      <p className="text-sm md:text-xs font-bold mt-1 md:mt-0.5">{done ? '✓ Done' : 'Pending'}</p>
    </div>
  );
}