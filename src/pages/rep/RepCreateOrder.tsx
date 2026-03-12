import { useState, useEffect } from 'react';
import type { Order } from '../../types/order.types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../services/api/customersApi';
import { ordersApi } from '../../services/api/ordersApi';
import { formatCurrency } from '../../utils/formatters';
import { calculateLine } from '../../utils/calculations';
import { orderDraftUtils } from '../../utils/orderDraft';
import { ArrowLeft, User, Package, ShoppingCart, Trash2, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function RepCreateOrder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState(orderDraftUtils.get());
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState(draft.deliveryAddress || '');
  const [deliveryNotes, setDeliveryNotes] = useState(draft.deliveryNotes || '');

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

  const total = draft.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalWithCalc = draft.items.reduce((s, i) => s + (i.lineTotal ?? 0), 0);
  const itemCount = draft.items.length;
  const exceedsCredit = false;

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

  return (
    <div className="animate-fade-in pb-16">
      <div className="px-4 lg:px-6 pt-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { orderDraftUtils.clear(); navigate(-1); }} className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Create Order</h1>
            <p className="text-sm text-slate-500 mt-0.5">Select customer → Add products → Place order</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
          <div className="hidden lg:block mb-4">
            <label className="block text-sm text-slate-600 mb-1">Customer</label>
            <select
              value={draft.customerId || ''}
              onChange={e => {
                const id = e.target.value;
                const cust = customerList?.items.find(c => c.id === id);
                if (id && cust) {
                  orderDraftUtils.setCustomer(id, cust.shopName);
                  setDraft(orderDraftUtils.get());
                } else {
                  orderDraftUtils.setCustomer('', '');
                  setDraft(orderDraftUtils.get());
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="">-- select customer --</option>
              {customerList?.items.map(c => (
                <option key={c.id} value={c.id}>{c.shopName}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Customer</h2>
            </div>
            {draft.customerId && (
              <button onClick={() => navigate('/rep/orders/new/customers')} className="text-sm text-emerald-600 hover:underline">
                Change
              </button>
            )}
          </div>

          {!draft.customerId ? (
            <button onClick={() => navigate('/rep/orders/new/customers')} className="w-full py-12 border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/50 transition group lg:hidden">
              <User className="w-12 h-12 mx-auto text-slate-400 group-hover:text-emerald-600 mb-3" />
              <div className="text-lg font-semibold text-slate-700 group-hover:text-emerald-600">Select Customer</div>
              <div className="text-sm text-slate-500 mt-1">Tap to choose from your customers</div>
            </button>
          ) : (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
              <div className="text-lg font-bold text-slate-900">{draft.customerName}</div>
              {selectedCustomer && (
                <div className="mt-2 text-sm">
                  <div>
                    <div className="text-slate-600">Location</div>
                    <div className="font-semibold text-slate-900">{selectedCustomer.city}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Products</h2>
              {draft.items.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                  {itemCount} item{itemCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {draft.items.length > 0 && (
              <div className="text-sm font-bold text-slate-900">
                Total: {formatCurrency(totalWithCalc)}
              </div>
            )}
          </div>

          {draft.items.length === 0 ? (
            <button onClick={() => navigate('/rep/orders/new/products')} className="w-full py-12 border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/50 transition group">
              <Package className="w-12 h-12 mx-auto text-slate-400 group-hover:text-emerald-600 mb-3" />
              <div className="text-lg font-semibold text-slate-700 group-hover:text-emerald-600">Add Products</div>
              <div className="text-sm text-slate-500 mt-1">Browse catalog and add items to cart</div>
            </button>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {draft.items.map(item => (
                  <div key={item.productId} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{item.name}</div>
                      <div className="text-xs text-slate-500">{item.sku} • {formatCurrency(item.price)}</div>
                      {item.discountPercent != null && (
                        <div className="text-xs text-orange-600">Disc {item.discountPercent}%</div>
                      )}
                      {item.taxAmount != null && (
                        <div className="text-xs text-indigo-600">Tax {formatCurrency(item.taxAmount)}</div>
                      )}
                    </div>
                    <div className="text-sm text-slate-600">
                      {item.quantity} × {formatCurrency(item.price)} ={' '}
                      {formatCurrency(item.lineTotal ?? 0)}
                    </div>
                    <div className="text-sm font-bold text-slate-900 w-24 text-right">
                      {formatCurrency(item.lineTotal ?? 0)}
                    </div>
                    <button onClick={() => { orderDraftUtils.removeItem(item.productId); setDraft(orderDraftUtils.get()); }} className="p-1.5 text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/rep/orders/new/products')} className="w-full py-3 border-2 border-emerald-600 text-emerald-600 font-semibold rounded-xl hover:bg-emerald-50 transition">
                + Add More Products
              </button>
            </>
          )}
        </div>

        {draft.customerId && draft.items.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Delivery Information (Optional)</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Delivery Address</label>
                <input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-emerald-500" placeholder="Enter delivery address..." />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Delivery Notes</label>
                <textarea value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-emerald-500 resize-none" rows={2} placeholder="Special instructions..." />
              </div>
            </div>
          </div>
        )}

        {draft.items.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border-2 border-emerald-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-slate-700">Order Total</span>
              <span className="text-2xl font-bold text-emerald-600">{formatCurrency(total)}</span>
            </div>

            {exceedsCredit && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                ⚠️ Warning: This order will exceed customer's credit limit
              </div>
            )}

            <button disabled={!draft.customerId || draft.items.length === 0 || createMut.isPending} onClick={handleSubmit} className="w-full py-4 bg-emerald-600 text-white font-bold text-lg rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {createMut.isPending ? 'Placing Order...' : `Place Order — ${formatCurrency(total)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}