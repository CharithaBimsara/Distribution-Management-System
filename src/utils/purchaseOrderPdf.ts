import type { Order } from '../types/order.types';
import { formatCurrency } from './formatters';
import { calculateLine } from './calculations';

export async function downloadPurchaseOrderPdf(order: Order): Promise<void> {
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
  const dateValue = new Date(order.orderDate).toLocaleDateString();

  let poValue = String(order.orderNumber || order.id || '').replace(/[^\x00-\x7F]/g, '');
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
  doc.text('Janasiri Distribution Pvt Ltd', 16, vY);
  doc.text('No 205 Wattarantenna Passage', 16, vY + 5);
  doc.text('Kandy, Sri Lanka', 16, vY + 10);
  doc.text('Phone: 0814 950206', 16, vY + 15);
  doc.text('Hotline: 0777 675322', 16, vY + 20);

  const sY = sectionY + 10;
  doc.text(order.customerName || '[Name]', colMid + 2, sY);
  doc.text('[Company Name]', colMid + 2, sY + 5);
  doc.text(order.deliveryAddress || '[Street Address]', colMid + 2, sY + 10);
  doc.text('[City, ST ZIP]', colMid + 2, sY + 15);
  doc.text('[Phone]', colMid + 2, sY + 20);

  doc.setDrawColor(180, 180, 180);
  doc.rect(14, sectionY, 88, 30);
  doc.rect(colMid, sectionY, 88, 30);

  const tableStartY = sectionY + 36;
  const cols = ['Description', 'Item', 'Rate', 'Qty', 'Disc%', 'Disc Amt', 'Tax', 'Tax Amt', 'Amount'];
  const rows = order.items.map((item: any) => {
    const rate = item.unitPrice;
    const qty = item.quantity;
    const discPct = item.discountPercent ?? 0;
    const taxPerUnit = qty ? (item.taxAmount ?? 0) / qty : 0;
    const calc = calculateLine({ rate, qty, discountPercent: discPct, taxAmount: taxPerUnit });
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
    alternateRowStyles: { fillColor: [255, 255, 255] },
    tableLineColor: [180, 180, 180],
    tableLineWidth: 0.2,
    tableWidth: 'auto',
    didDrawCell: (cellData: any) => {
      const { cell } = cellData;
      if (cell.section === 'body' || cell.section === 'head') {
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.2);
        doc.rect(cell.x, cell.y, cell.width, cell.height);
      }
    },
  });

  const afterTableY = (doc as any).lastAutoTable.finalY;

  const totalsX = pageWidth - 80;
  const totalsStartY = afterTableY + 4;
  const grand = order.items.reduce((s: number, i: any) => s + (i.lineTotal ?? i.unitPrice * i.quantity), 0);
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

  if (order.deliveryNotes) {
    const splitNotes = doc.splitTextToSize(order.deliveryNotes, commentsBoxW - 4);
    doc.text(splitNotes, commentsBoxX + 2, commentsBoxY + 11);
  }

  const pageH = doc.internal.pageSize.getHeight();
  const ftY = pageH - 32;
  doc.setDrawColor(31, 73, 125);
  doc.setLineWidth(0.4);
  doc.line(14, ftY, pageWidth - 14, ftY);
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

  doc.save(`order-${order.orderNumber || order.id}.pdf`);
}
