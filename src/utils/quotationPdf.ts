import { formatCurrency, formatDate } from './formatters';
import { getShopNameOrPlaceholder } from './shopName';
import type { Quotation } from '../types/quotation.types';
import * as XLSX from 'xlsx';

// Table එක ඇතුලේ LKR කියන කෑල්ල නැතුව ලස්සනට ඉලක්කම් පෙන්නන්න හදපු function එක
const formatNumber = (num: number) => {
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function isTaxQuotation(quotation: Quotation) {
  return (quotation.items || []).some((item) => {
    const taxAmount = item.taxAmount || 0;
    return taxAmount > 0 || !!item.taxCode;
  }) || (quotation.taxAmount || 0) > 0;
}

function renderQuotationPage(doc: any, autoTable: any, quotation: Quotation, isTaxCustomer?: boolean) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const DARK: [number, number, number] = [0, 0, 0];
  
  const isTax = isTaxCustomer !== undefined ? isTaxCustomer : isTaxQuotation(quotation);
  const title = isTax ? 'TAX QUOTATION' : 'QUOTATION';

  // --- HEADER SECTION ---
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('JANASIRI DISTRIBUTORS (PVT) LTD', 14, 16);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Reg Address: No 205 Wattarantenna Passage, Kandy.', 14, 21);
  doc.text('TP: 0814 950206 / Hotline: 0777 675322', 14, 25);
  doc.text('Email: janasiridistributors@yahoo.com / Vat 114608394-7000', 14, 29);
  doc.text('Bank AC: Sampath Bank PLC / Kandy Super Grade Branch / AC: 0007 1002 3131', 14, 33);

  // --- Top Right Info Grid ---
  const gridX = 135; 
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(title, gridX + 15, 15, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  
  // Draw simple grid for Date / Quotation No / Department
  doc.rect(gridX, 17, 25, 6); 
  doc.text('Date', gridX + 2, 21); 
  doc.rect(gridX + 25, 17, 36, 6); 
  doc.text(formatDate(quotation.createdAt), gridX + 27, 21);
  
  doc.rect(gridX, 23, 25, 6); 
  doc.text('Quotation No', gridX + 2, 27); 
  doc.rect(gridX + 25, 23, 36, 6); 
  
  doc.setFontSize(7); 
  doc.text(String(quotation.quotationNumber || ''), gridX + 27, 27, { maxWidth: 34 });
  doc.setFontSize(8); 
  
  doc.rect(gridX, 29, 25, 6); 
  doc.text('Department', gridX + 2, 33); 
  doc.rect(gridX + 25, 29, 36, 6); 
  doc.text('CENTRAL', gridX + 27, 33);

  // --- CUSTOMER & SHIP TO SECTION ---
  const sectionY = 40;
  const colWidth = (pageWidth - 28) / 2;
  
  doc.rect(14, sectionY, colWidth, 6);
  doc.rect(14 + colWidth, sectionY, colWidth, 6);
  doc.setFont('helvetica', 'bold');
  doc.text('Shop Name', 16, sectionY + 4);
  doc.text('Ship To', 16 + colWidth, sectionY + 4);
  
  doc.rect(14, sectionY + 6, colWidth, 18);
  doc.rect(14 + colWidth, sectionY + 6, colWidth, 18);
  doc.setFont('helvetica', 'normal');
  
  const shopName = getShopNameOrPlaceholder(quotation);
  const custAddress = doc.splitTextToSize('[Address]', colWidth - 4); // Address not directly in Quotation type, placeholder or add if needed
  const custName = doc.splitTextToSize(shopName, colWidth - 4);
  doc.text(custName, 16, sectionY + 11);
  doc.text(custAddress, 16, sectionY + 16);
  
  doc.text(custName, 16 + colWidth, sectionY + 11);
  doc.text(custAddress, 16 + colWidth, sectionY + 16);

  // --- TABLE SECTION ---
  const tableStartY = sectionY + 28;
  
  const baseCols = ['No', 'Item Code', 'Item Description', 'Qty', 'Rate', 'Disc %', 'Disc Amt'];
  const cols = isTax 
    ? [...baseCols, 'Tax Code', 'Tax Amt', 'Gross Amount', 'Req. Price'] 
    : [...baseCols, 'Line Gross', 'Req. Price'];

  let totalGross = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  const rows = (quotation.items || []).map((item, index) => {
    const rate = item.unitPrice || 0;
    const qty = item.quantity || 0;
    const discPct = item.discountPercent || 0;
    
    const rowGrossBase = rate * qty;
    const discAmt = (rowGrossBase * discPct) / 100;
    const taxAmt = item.taxAmount || 0;
    const taxPerUnit = qty ? taxAmt / qty : 0;
    
    const grossAmount = isTax ? rowGrossBase : (rowGrossBase + taxAmt);
    const displayRate = isTax ? rate : (rate + taxPerUnit);

    totalGross += isTax ? rowGrossBase : (rowGrossBase + taxAmt);
    totalDiscount += discAmt;
    totalTax += isTax ? taxAmt : 0;

    const reqPrice = item.expectedPrice != null && item.expectedPrice > 0 
        ? formatNumber(item.expectedPrice) 
        : '-';

    const rowData = [
      (index + 1).toString(),
      item.productSKU || '',
      item.productName || '',
      qty.toString(),
      formatNumber(displayRate),
      discPct ? `${discPct}%` : '0.00',
      formatNumber(discAmt)
    ];

    if (isTax) {
      rowData.push(item.taxCode || 'V18');
      rowData.push(formatNumber(taxAmt));
    }

    rowData.push(formatNumber(grossAmount));
    rowData.push(reqPrice); // Request Price

    return rowData;
  });

  // Fill empty rows to maintain grid structure (minimum 5 rows)
  while (rows.length < 5) rows.push(cols.map(() => ''));

  autoTable(doc, {
    head: [cols],
    body: rows,
    startY: tableStartY,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 18 },
      2: { cellWidth: 'auto' }, 
      3: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 16, halign: 'right' },
      5: { cellWidth: 12, halign: 'right' },
      6: { cellWidth: 16, halign: 'right' },
      ...(isTax ? { 
        7: { cellWidth: 14, halign: 'center' }, 
        8: { cellWidth: 16, halign: 'right' }, 
        9: { cellWidth: 20, halign: 'right' },
        10: { cellWidth: 20, halign: 'right' }
      } : { 
        7: { cellWidth: 24, halign: 'right' },
        8: { cellWidth: 24, halign: 'right' }
      })
    }
  });

  // --- FOOTER & TOTALS SECTION ---
  const afterTableY = (doc as any).lastAutoTable.finalY;
  const totalsX = pageWidth - 76;
  const boxW = 62;
  const rowH = 6;

  doc.setFontSize(8);
  doc.setDrawColor(0, 0, 0);

  // Signatures
  doc.text('Received By / Customer', 50, afterTableY + 20, { align: 'center' });
  doc.text('...................................', 50, afterTableY + 28, { align: 'center' });
  doc.text('Seal & signature', 50, afterTableY + 32, { align: 'center' });

  // Totals Grid
  if (isTax) {
    const finalAmount = totalGross - totalDiscount + totalTax; 
    
    const baseGross = totalGross;

    const totalsRows = [
      ['Total Gross', formatNumber(baseGross)],
      ['Total Tax', formatNumber(totalTax)],
      ['Total Discount', formatNumber(totalDiscount)],
      ['Total Estimate', formatCurrency(finalAmount)],
    ];

    totalsRows.forEach(([label, val], i) => {
      const y = afterTableY + (i * rowH);
      doc.rect(totalsX, y, boxW * 0.55, rowH);
      doc.rect(totalsX + (boxW * 0.55), y, boxW * 0.45, rowH);
      doc.setFont('helvetica', i === 3 ? 'bold' : 'normal'); 
      doc.text(label, totalsX + 2, y + 4);
      doc.text(val, totalsX + boxW - 2, y + 4, { align: 'right' });
    });
  } else {
    const finalAmount = totalGross - totalDiscount;
    
    const totalsRows = [
      ['Total Gross', formatNumber(totalGross)],
      ['Total Discount', formatNumber(totalDiscount)],
      ['Total Estimate', formatCurrency(finalAmount)],
    ];

    totalsRows.forEach(([label, val], i) => {
      const y = afterTableY + (i * rowH);
      doc.rect(totalsX, y, boxW * 0.55, rowH);
      doc.rect(totalsX + (boxW * 0.55), y, boxW * 0.45, rowH);
      doc.setFont('helvetica', i === 2 ? 'bold' : 'normal'); 
      doc.text(label, totalsX + 2, y + 4);
      doc.text(val, totalsX + boxW - 2, y + 4, { align: 'right' });
    });
  }
}

export async function downloadQuotationPdf(quotation: Quotation, isTaxCustomer?: boolean) {
  const { jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = autoTableModule.default || (autoTableModule as any);

  const doc = new jsPDF();
  renderQuotationPage(doc, autoTable, quotation, isTaxCustomer);
  doc.save(`${quotation.quotationNumber}.pdf`);
}

export async function downloadQuotationsPdf(quotations: Quotation[], customerTaxMap?: Map<string, boolean>) {
  if (!quotations.length) return;

  const { jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = autoTableModule.default || (autoTableModule as any);

  const doc = new jsPDF();

  quotations.forEach((quotation, index) => {
    if (index > 0) doc.addPage();
    const isTax = customerTaxMap?.get(quotation.customerId);
    renderQuotationPage(doc, autoTable, quotation, isTax);
  });

  doc.save(`quotations-${Date.now()}.pdf`);
}

// Excel Download remains mostly the same, ensuring it maps the Request Price 
export function downloadQuotationsExcel(quotations: Quotation[], customerTaxMap?: Map<string, boolean>) {
  if (!quotations.length) return;

  const wb = XLSX.utils.book_new();

  quotations.forEach((q) => {
    const rows: (string | number)[][] = [];
    const withTax = customerTaxMap?.has(q.customerId) ? (customerTaxMap.get(q.customerId) === true) : isTaxQuotation(q);

    rows.push(['QUOTATION', q.quotationNumber]);
    rows.push(['Status', q.status]);
    rows.push(['Type', withTax ? 'Tax' : 'Non-Tax']);
    rows.push(['Customer', q.customerName || q.shopName || '-']);
    rows.push(['Rep', q.repName || '-']);
    rows.push(['Created', formatDate(q.createdAt)]);
    rows.push(['Valid Until', q.validUntil ? formatDate(q.validUntil) : '-']);
    rows.push([]);

    rows.push(withTax
      ? ['No', 'Item Code', 'Item Description', 'Qty', 'Rate', 'Disc %', 'Disc Amt', 'Tax Code', 'Tax Amt', 'Gross Amount', 'Req. Price']
      : ['No', 'Item Code', 'Item Description', 'Qty', 'Rate', 'Disc %', 'Disc Amt', 'Line Gross', 'Req. Price']);

    (q.items || []).forEach((item, index) => {
      const rate = item.unitPrice || 0;
      const qty = item.quantity || 0;
      const discPct = item.discountPercent || 0;
      
      const rowGrossBase = rate * qty;
      const discAmt = (rowGrossBase * discPct) / 100;
      const taxAmt = item.taxAmount || 0;
      const taxPerUnit = qty ? taxAmt / qty : 0;
      
      const grossAmount = withTax ? rowGrossBase : (rowGrossBase + taxAmt);
      const displayRate = withTax ? rate : (rate + taxPerUnit);

      const rowWithTax = [
        index + 1,
        item.productSKU || '-',
        item.productName || '-',
        qty,
        rate,
        discPct,
        discAmt,
        item.taxCode || '-',
        taxAmt,
        grossAmount,
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
          displayRate,
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
      rows.push(['', '', '', '', '', '', '', '', 'Total Estimate', q.totalAmount || 0]);
    } else {
      rows.push(['', '', '', '', '', '', 'Subtotal', q.subTotal || 0]);
      rows.push(['', '', '', '', '', '', 'Total Estimate', q.totalAmount || 0]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = withTax
      ? [
          { wch: 6 },
          { wch: 16 },
          { wch: 40 },
          { wch: 8 },
          { wch: 12 },
          { wch: 10 },
          { wch: 12 },
          { wch: 10 },
          { wch: 12 },
          { wch: 14 },
          { wch: 14 },
        ]
      : [
          { wch: 8 },
          { wch: 18 },
          { wch: 45 },
          { wch: 10 },
          { wch: 14 },
          { wch: 10 },
          { wch: 14 },
          { wch: 16 },
          { wch: 16 },
        ];

    const safeName = (q.quotationNumber || 'Quotation').replace(/[:/\\?*\[\]]/g, '-').substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });

  XLSX.writeFile(wb, `quotations-${Date.now()}.xlsx`);
}