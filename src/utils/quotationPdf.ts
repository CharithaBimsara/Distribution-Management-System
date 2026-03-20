import { formatCurrency, formatDate } from './formatters';
import type { Quotation } from '../types/quotation.types';
import * as XLSX from 'xlsx';

function isTaxQuotation(quotation: Quotation) {
  return (quotation.items || []).some((item) => {
    const taxAmount = item.taxAmount || 0;
    return taxAmount > 0 || !!item.taxCode;
  }) || (quotation.taxAmount || 0) > 0;
}

export async function downloadQuotationPdf(quotation: Quotation) {
  const { jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = autoTableModule.default || (autoTableModule as any);

  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(16);
  doc.setTextColor(31, 41, 55);
  doc.text(`Quotation ${quotation.quotationNumber}`, 14, 16);

  doc.setFontSize(10);
  doc.text(`Status: ${quotation.status}`, 14, 24);
  doc.text(`Created: ${formatDate(quotation.createdAt)}`, 90, 24);
  doc.text(`Total: ${formatCurrency(quotation.totalAmount)}`, 180, 24);
  doc.text(`Type: ${isTaxQuotation(quotation) ? 'Tax' : 'Non-Tax'}`, 250, 24);

  const withTax = isTaxQuotation(quotation);
  const head = withTax
    ? [['Description', 'Item', 'Qty', 'Rate', 'MRP', 'Disc %', 'Disc Amt', 'Tax', 'Tax Amt', 'Amount', 'Request Price']]
    : [['Description', 'Item', 'Qty', 'Rate', 'MRP', 'Disc %', 'Disc Amt', 'Amount', 'Request Price']];

  const body = (quotation.items || []).map((item) => {
    const rate = item.unitPrice || 0;
    const qty = item.quantity || 0;
    const discPct = item.discountPercent || 0;
    const discAmt = (rate * qty * discPct) / 100;
    const taxAmt = item.taxAmount || 0;
    const amount = item.lineTotal ?? ((rate * qty) - discAmt + taxAmt);

    const rowWithTax = [
      item.productName || '-',
      item.productSKU || '-',
      String(qty),
      formatCurrency(rate),
      formatCurrency(item.mrp ?? rate),
      String(discPct),
      formatCurrency(discAmt),
      item.taxCode || '-',
      formatCurrency(taxAmt),
      formatCurrency(amount),
      item.expectedPrice != null ? formatCurrency(item.expectedPrice) : '-',
    ];
    if (withTax) return rowWithTax;
    return [
      rowWithTax[0],
      rowWithTax[1],
      rowWithTax[2],
      rowWithTax[3],
      rowWithTax[4],
      rowWithTax[5],
      rowWithTax[6],
      rowWithTax[9],
      rowWithTax[10],
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: 30,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85] },
    columnStyles: withTax
      ? {
          0: { cellWidth: 58 },
          1: { cellWidth: 20 },
          2: { cellWidth: 12, halign: 'center' },
          3: { cellWidth: 22, halign: 'right' },
          4: { cellWidth: 22, halign: 'right' },
          5: { cellWidth: 14, halign: 'right' },
          6: { cellWidth: 22, halign: 'right' },
          7: { cellWidth: 14, halign: 'center' },
          8: { cellWidth: 22, halign: 'right' },
          9: { cellWidth: 24, halign: 'right' },
          10: { cellWidth: 28, halign: 'right' },
        }
      : {
          0: { cellWidth: 64 },
          1: { cellWidth: 22 },
          2: { cellWidth: 12, halign: 'center' },
          3: { cellWidth: 24, halign: 'right' },
          4: { cellWidth: 24, halign: 'right' },
          5: { cellWidth: 16, halign: 'right' },
          6: { cellWidth: 24, halign: 'right' },
          7: { cellWidth: 26, halign: 'right' },
          8: { cellWidth: 30, halign: 'right' },
        },
  });

  doc.save(`${quotation.quotationNumber}.pdf`);
}

function buildQuotationHead(withTax: boolean) {
  return withTax
    ? [['Description', 'Item', 'Qty', 'Rate', 'MRP', 'Disc %', 'Disc Amt', 'Tax', 'Tax Amt', 'Amount', 'Request Price']]
    : [['Description', 'Item', 'Qty', 'Rate', 'MRP', 'Disc %', 'Disc Amt', 'Amount', 'Request Price']];
}

function buildQuotationBody(quotation: Quotation, withTax: boolean) {
  return (quotation.items || []).map((item) => {
    const rate = item.unitPrice || 0;
    const qty = item.quantity || 0;
    const discPct = item.discountPercent || 0;
    const discAmt = (rate * qty * discPct) / 100;
    const taxAmt = item.taxAmount || 0;
    const amount = item.lineTotal ?? ((rate * qty) - discAmt + taxAmt);

    const rowWithTax = [
      item.productName || '-',
      item.productSKU || '-',
      String(qty),
      formatCurrency(rate),
      formatCurrency(item.mrp ?? rate),
      String(discPct),
      formatCurrency(discAmt),
      item.taxCode || '-',
      formatCurrency(taxAmt),
      formatCurrency(amount),
      item.expectedPrice != null ? formatCurrency(item.expectedPrice) : '-',
    ];
    if (withTax) return rowWithTax;
    return [
      rowWithTax[0],
      rowWithTax[1],
      rowWithTax[2],
      rowWithTax[3],
      rowWithTax[4],
      rowWithTax[5],
      rowWithTax[6],
      rowWithTax[9],
      rowWithTax[10],
    ];
  });
}

function renderQuotationPage(doc: any, autoTable: any, quotation: Quotation) {
  doc.setFontSize(16);
  doc.setTextColor(31, 41, 55);
  doc.text(`Quotation ${quotation.quotationNumber}`, 14, 16);

  doc.setFontSize(10);
  doc.text(`Status: ${quotation.status}`, 14, 24);
  doc.text(`Created: ${formatDate(quotation.createdAt)}`, 90, 24);
  doc.text(`Total: ${formatCurrency(quotation.totalAmount)}`, 180, 24);
  const withTax = isTaxQuotation(quotation);
  doc.text(`Type: ${withTax ? 'Tax' : 'Non-Tax'}`, 250, 24);

  autoTable(doc, {
    head: buildQuotationHead(withTax),
    body: buildQuotationBody(quotation, withTax),
    startY: 30,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85] },
    columnStyles: withTax
      ? {
          0: { cellWidth: 58 },
          1: { cellWidth: 20 },
          2: { cellWidth: 12, halign: 'center' },
          3: { cellWidth: 22, halign: 'right' },
          4: { cellWidth: 22, halign: 'right' },
          5: { cellWidth: 14, halign: 'right' },
          6: { cellWidth: 22, halign: 'right' },
          7: { cellWidth: 14, halign: 'center' },
          8: { cellWidth: 22, halign: 'right' },
          9: { cellWidth: 24, halign: 'right' },
          10: { cellWidth: 28, halign: 'right' },
        }
      : {
          0: { cellWidth: 64 },
          1: { cellWidth: 22 },
          2: { cellWidth: 12, halign: 'center' },
          3: { cellWidth: 24, halign: 'right' },
          4: { cellWidth: 24, halign: 'right' },
          5: { cellWidth: 16, halign: 'right' },
          6: { cellWidth: 24, halign: 'right' },
          7: { cellWidth: 26, halign: 'right' },
          8: { cellWidth: 30, halign: 'right' },
        },
  });
}

export async function downloadQuotationsPdf(quotations: Quotation[]) {
  if (!quotations.length) return;

  const { jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = autoTableModule.default || (autoTableModule as any);

  const doc = new jsPDF({ orientation: 'landscape' });

  quotations.forEach((quotation, index) => {
    if (index > 0) doc.addPage();
    renderQuotationPage(doc, autoTable, quotation);
  });

  doc.save(`quotations-${Date.now()}.pdf`);
}

export function downloadQuotationsExcel(quotations: Quotation[]) {
  if (!quotations.length) return;

  const wb = XLSX.utils.book_new();

  quotations.forEach((q) => {
    const rows: (string | number)[][] = [];

    rows.push(['QUOTATION', q.quotationNumber]);
    rows.push(['Status', q.status]);
    rows.push(['Type', isTaxQuotation(q) ? 'Tax' : 'Non-Tax']);
    rows.push(['Customer', q.customerName || q.shopName || '-']);
    rows.push(['Rep', q.repName || '-']);
    rows.push(['Created', formatDate(q.createdAt)]);
    rows.push(['Valid Until', q.validUntil ? formatDate(q.validUntil) : '-']);
    rows.push([]);

    const withTax = isTaxQuotation(q);
    rows.push(withTax
      ? ['Description', 'Item', 'Qty', 'Rate', 'MRP', 'Disc %', 'Disc Amt', 'Tax', 'Tax Amt', 'Amount', 'Request Price']
      : ['Description', 'Item', 'Qty', 'Rate', 'MRP', 'Disc %', 'Disc Amt', 'Amount', 'Request Price']);

    (q.items || []).forEach((item) => {
      const rate = item.unitPrice || 0;
      const qty = item.quantity || 0;
      const discPct = item.discountPercent || 0;
      const discAmt = (rate * qty * discPct) / 100;
      const taxAmt = item.taxAmount || 0;
      const amount = item.lineTotal ?? ((rate * qty) - discAmt + taxAmt);

      const rowWithTax = [
        item.productName || '-',
        item.productSKU || '-',
        qty,
        rate,
        item.mrp ?? rate,
        discPct,
        discAmt,
        item.taxCode || '-',
        taxAmt,
        amount,
        item.expectedPrice ?? 0,
      ];
      if (withTax) {
        rows.push(rowWithTax);
      } else {
        rows.push([
          rowWithTax[0],
          rowWithTax[1],
          rowWithTax[2],
          rowWithTax[3],
          rowWithTax[4],
          rowWithTax[5],
          rowWithTax[6],
          rowWithTax[9],
          rowWithTax[10],
        ]);
      }
    });

    rows.push([]);
    if (withTax) {
      rows.push(['', '', '', '', '', '', '', '', 'Subtotal', q.subTotal || 0]);
      rows.push(['', '', '', '', '', '', '', '', 'Tax', q.taxAmount || 0]);
      rows.push(['', '', '', '', '', '', '', '', 'Total', q.totalAmount || 0]);
    } else {
      rows.push(['', '', '', '', '', '', '', 'Subtotal', q.subTotal || 0]);
      rows.push(['', '', '', '', '', '', '', 'Total', q.totalAmount || 0]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = withTax
      ? [
          { wch: 40 },
          { wch: 16 },
          { wch: 8 },
          { wch: 12 },
          { wch: 12 },
          { wch: 10 },
          { wch: 12 },
          { wch: 10 },
          { wch: 12 },
          { wch: 14 },
          { wch: 14 },
        ]
      : [
          { wch: 40 },
          { wch: 16 },
          { wch: 8 },
          { wch: 12 },
          { wch: 12 },
          { wch: 10 },
          { wch: 12 },
          { wch: 14 },
          { wch: 14 },
        ];

    const safeName = (q.quotationNumber || 'Quotation').replace(/[:/\\?*\[\]]/g, '-').substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });

  XLSX.writeFile(wb, `quotations-${Date.now()}.xlsx`);
}
