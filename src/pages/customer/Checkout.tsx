import { useSelector, useDispatch } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import type { RootState } from '../../store/store';
import { clearCart } from '../../store/slices/cartSlice';
import { ordersApi } from '../../services/api/ordersApi';
import { formatCurrency } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Loader2, CheckCircle, ShoppingCart, ShoppingBag, MapPin, MessageSquare, Package } from 'lucide-react';
import type { Order } from '../../types/order.types';
import toast from 'react-hot-toast';
import { calculateLine } from '../../utils/calculations';

export default function CustomerCheckout() {
  const { items } = useSelector((state: RootState) => state.cart);
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [lastOrderDate, setLastOrderDate] = useState<string | null>(null);
  const [lastOrderNotes, setLastOrderNotes] = useState<string>('');
  const [lastOrderAddress, setLastOrderAddress] = useState<string>('');

  const total = items.reduce((sum, item) => {
    const calc = calculateLine({
      rate: item.unitPrice,
      qty: item.quantity,
      discountPercent: item.discountPercent,
      taxAmount: item.taxRate != null ? item.taxRate * item.unitPrice * (1 - (item.discountPercent ?? 0) / 100) : undefined,
    });
    return sum + calc.total;
  }, 0);

  const placeOrderMut = useMutation({
    mutationFn: () => ordersApi.customerCreate({
      customerId: user?.id || '',
      deliveryAddress: address || undefined,
      deliveryNotes: notes || undefined,
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        discountPercent: item.discountPercent,
      })),
    }),
    onSuccess: (resp) => {
      const order = resp.data.data as Order;
      setLastOrder(order);
      setLastOrderNotes(notes);
      setLastOrderAddress(address);
      if (order) {
        setLastOrderId(order.orderNumber || order.id);
        setLastOrderDate(order.orderDate ? new Date(order.orderDate).toLocaleDateString() : new Date().toLocaleDateString());
      }
      dispatch(clearCart());
      if (typeof window !== 'undefined') {
        localStorage.removeItem('quickRows');
      }
      setSuccess(true);
      toast.success('Order placed successfully!');
    },
    onError: () => {
      toast.error('Failed to place order. Please try again.');
    },
  });

  const downloadReceipt = async () => {
    if (!lastOrder) {
      return;
    }
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

      // ── TOP HEADER ──────────────────────────────────────────────
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...DARK);
      doc.text('Janasiri Distribution Pvt Ltd', 14, 16);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text('No 205 Wattarantenna Passage, Kandy, Sri Lanka', 14, 21);
      doc.text('Phone: 0814 950206  |  Hotline: 0777 675322', 14, 25);
      doc.text('Email: janasiridistributors@yahoo.com', 14, 29);

      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLUE);
      doc.text('PURCHASE ORDER', pageWidth - 14, 16, { align: 'right' });

      const dateLabel = 'DATE';
      const poLabel = 'PO #';
      const dateValue = lastOrderDate || new Date().toLocaleDateString();
      
      let poValue = String(lastOrderId || '').replace(/[^\x00-\x7F]/g, ''); 
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

      // ── VENDOR / SHIP TO ────────────────────────────────────────
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

      doc.setTextColor(...DARK);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const vY = sectionY + 10;
      doc.text('Janasiri Distribution Pvt Ltd', 16, vY);
      doc.text('No 205 Wattarantenna Passage', 16, vY + 5);
      doc.text('Kandy, Sri Lanka', 16, vY + 10);
      doc.text('Phone: 0814 950206', 16, vY + 15);
      doc.text('Hotline: 0777 675322', 16, vY + 20);

      const sY = sectionY + 10;
      doc.text(user?.username || '[Name]', colMid + 2, sY);
      doc.text('[Company Name]', colMid + 2, sY + 5);
      doc.text(lastOrderAddress || '[Street Address]', colMid + 2, sY + 10);
      doc.text('[City, ST ZIP]', colMid + 2, sY + 15);
      doc.text(user?.email || '[Phone]', colMid + 2, sY + 20);

      doc.setDrawColor(180, 180, 180);
      doc.rect(14, sectionY, 88, 30);
      doc.rect(colMid, sectionY, 88, 30);

      // ── ITEMS TABLE ─────────────────────────────────────────────
      const tableStartY = sectionY + 36;

      const cols = ['Description', 'Item', 'Rate', 'Qty', 'Disc%', 'Disc Amt', 'Tax', 'Tax Amt', 'Amount'];

      const rows = lastOrder.items.map(item => {
        const rate = item.unitPrice;
        const qty = item.quantity;
        const discPct = item.discountPercent ?? 0;
        const taxPerUnit = qty ? (item.taxAmount ?? 0) / qty : 0;
        const calc = calculateLine({
          rate,
          qty,
          discountPercent: discPct,
          taxAmount: taxPerUnit,
        });
        return [
          item.productName,
          item.productSKU || '',
          formatCurrency(rate),
          qty,
          discPct ? `${discPct}%` : '-',
          calc.discount ? formatCurrency(calc.discount) : '-',
          '-',
          calc.tax ? formatCurrency(calc.tax) : '-',
          formatCurrency(calc.total),
        ];
      });

      while (rows.length < 8) rows.push(['', '', '', '', '', '', '', '', '']);

      autoTable(doc, {
        head: [cols],
        body: rows,
        startY: tableStartY,
        styles: {
          fontSize: 7.5,
          cellPadding: 1.5,
          overflow: 'linebreak',
          valign: 'middle'
        },
        headStyles: {
          fillColor: BLUE,
          textColor: WHITE,
          fontStyle: 'bold',
          fontSize: 7.5,
        },
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
        tableWidth: 'auto',
        alternateRowStyles: { fillColor: [255, 255, 255] },
        tableLineColor: [180, 180, 180],
        tableLineWidth: 0.2,
        didDrawCell: (data) => {
          const { cell } = data;
          if (cell.section === 'body' || cell.section === 'head') {
            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.2);
            doc.rect(cell.x, cell.y, cell.width, cell.height);
          }
        },
      });

      const afterTableY = (doc as any).lastAutoTable.finalY;

      // ── TOTALS (bottom-right) + COMMENTS (bottom-left) ──────────
      const totalsX = pageWidth - 80;
      const totalsStartY = afterTableY + 4;
      const grand = lastOrder.items.reduce((s, i) => s + (i.lineTotal ?? i.unitPrice * i.quantity), 0);
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

      // ── COMMENTS BOX ─────────────────────────────────────────────
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
      if (lastOrderNotes) {
        const splitNotes = doc.splitTextToSize(lastOrderNotes, commentsBoxW - 4);
        doc.text(splitNotes, commentsBoxX + 2, commentsBoxY + 11);
      }

      // ── FOOTER ───────────────────────────────────────────────────
      const pageH2 = doc.internal.pageSize.getHeight();
      const ftY2 = pageH2 - 32;
      doc.setDrawColor(31, 73, 125);
      doc.setLineWidth(0.4);
      doc.line(14, ftY2, pageWidth - 14, ftY2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(31, 73, 125);
      doc.text('HOW TO CONTACT US', 14, ftY2 + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      doc.text('Janasiri Distribution Pvt Ltd  |  No 205 Wattarantenna Passage, Kandy, Sri Lanka', 14, ftY2 + 11);
      doc.text('HEAD OFFICE (Kandy): No 205 Wattarantenna Passage  –  0777 675322  |  KANDY: No 02 Mawilmada Road  –  0814 950206', 14, ftY2 + 17);
      doc.text('COLOMBO: No.41A, Gnanathilaka Road, Mount Lavinia  –  75 381 6756', 14, ftY2 + 22);
      doc.text('Office: 0814 950206  |  Hotline: 0777 675322  |  Email: janasiridistributors@yahoo.com', 14, ftY2 + 27);

      doc.save('purchase-order.pdf');
    } catch (e) {
      console.error('receipt generation error', e);
    }
  };

  if (success) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[70vh] px-6">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-3xl flex items-center justify-center mb-5 animate-scale-in">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Order Placed!</h2>
        <p className="text-sm text-slate-400 mb-8 text-center max-w-xs">Your order has been submitted successfully and is pending approval.</p>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => navigate('/shop/orders')}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-orange-500/25 active:scale-95 transition-all"
          >
            View Orders
          </button>
          <button
            onClick={() => navigate('/shop/products')}
            className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold shadow-sm active:scale-95 transition-all"
          >
            Continue Shopping
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

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
        <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 rounded-3xl flex items-center justify-center mb-5">
          <ShoppingCart className="w-9 h-9 text-slate-300" />
        </div>
        <p className="text-slate-500 font-medium mb-4">Your cart is empty</p>
        <button
          onClick={() => navigate('/shop/products')}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-orange-500/25 active:scale-95 transition-all flex items-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" /> Browse Products
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-32">
      <div className="bg-gradient-to-br from-orange-500 to-rose-500 text-white px-5 pt-5 pb-10">
        <h1 className="text-xl font-bold">Checkout</h1>
        <p className="text-orange-100 text-sm mt-0.5">{items.length} item{items.length > 1 ? 's' : ''} in your order</p>
      </div>

      <div className="px-4 -mt-5 space-y-4 relative z-10">
        <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 border border-slate-100 p-5">
          <h2 className="font-bold text-slate-900 mb-3 text-sm">Order Summary</h2>
          <div className="space-y-2.5">
            {items.map(item => {
              const calc = calculateLine({
                rate: item.unitPrice,
                qty: item.quantity,
                discountPercent: item.discountPercent,
                taxAmount: item.taxRate != null ? item.taxRate * item.unitPrice * (1 - (item.discountPercent ?? 0) / 100) : undefined,
              });
              return (
                <div key={item.productId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-orange-400" />
                    </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-slate-700">{item.productName}</span>
                    <span className="text-sm font-semibold text-orange-600 ml-2">x{item.quantity}</span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{formatCurrency(calc.total)}</span>
                </div>
              );
            })}
          </div>
          <div className="border-t border-slate-100 mt-3 pt-3 space-y-2">
            <div className="flex justify-between font-bold text-base"><span className="text-slate-900">Subtotal</span><span className="text-orange-600">{formatCurrency(total)}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 border border-slate-100 p-5 space-y-4">
          <h2 className="font-bold text-slate-900 text-sm">Delivery Details</h2>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 mb-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> Delivery Address
              <span className="text-xs text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition"
              placeholder="Enter delivery address"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 mb-2">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" /> Notes
              <span className="text-xs text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none resize-none transition"
              placeholder="Special instructions..."
            />
          </div>
        </div>
      </div>

      <div className="fixed bottom-14 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 p-4 z-40 pb-safe">
        <button
          onClick={() => placeOrderMut.mutate()}
          disabled={placeOrderMut.isPending}
          className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-60 disabled:shadow-none"
        >
          {placeOrderMut.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Placing Order...</>
          ) : (
            <>Place Order &bull; {formatCurrency(total)}</>
          )}
        </button>
      </div>
    </div>
  );
}