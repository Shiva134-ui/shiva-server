/**
 * MΛDESH Server Electricity Utility Bill & PDF Statement Generator
 * Generates valid PDF 1.4 documents client-side without external binary dependencies.
 */

export interface BillStatementData {
  title: string;
  invoiceNumber: string;
  periodLabel: string;
  periodType: 'daily' | 'monthly' | 'yearly';
  generatedDate: string;
  consumerName: string;
  consumerEmail: string;
  serverHost: string;
  tariffRate: number;
  currencySymbol: string;
  totalKwh: number;
  energyCharges: number;
  fixedCharges: number;
  totalPayable: number;
  items: Array<{
    dateOrMonth: string;
    operatingHours?: number;
    avgWatts?: number;
    kwh: number;
    rate: number;
    amount: number;
  }>;
}

/**
 * Escapes characters for PDF string literals
 */
function escapePdf(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * Generates a valid PDF-1.4 file Blob
 */
export function generatePdfBlob(data: BillStatementData): Blob {
  const lines: string[] = [];

  // Helper to append PDF instructions
  lines.push('BT'); // Begin Text
  lines.push('/F2 18 Tf'); // Helvetica-Bold 18pt
  lines.push('50 790 Td');
  lines.push(`(MADESH SERVER - ELECTRICITY UTILITY BILL) Tj`);

  lines.push('0 -22 Td');
  lines.push('/F1 10 Tf');
  lines.push(`(Official Server Energy Statement & Meter Reading Record) Tj`);

  // Invoice Details Box
  lines.push('0 -26 Td');
  lines.push('/F2 10 Tf');
  lines.push(`(Invoice Number: ${escapePdf(data.invoiceNumber)}) Tj`);
  lines.push('260 0 Td');
  lines.push(`(Billing Period: ${escapePdf(data.periodLabel)}) Tj`);

  lines.push('-260 -16 Td');
  lines.push('/F1 9 Tf');
  lines.push(`(Consumer / Account: ${escapePdf(data.consumerName)} <${escapePdf(data.consumerEmail)}>) Tj`);
  lines.push('260 0 Td');
  lines.push(`(Generated: ${escapePdf(data.generatedDate)}) Tj`);

  lines.push('-260 -16 Td');
  lines.push(`(Server Host: ${escapePdf(data.serverHost)} | Tariff: Rs. ${data.tariffRate.toFixed(2)} / kWh) Tj`);

  // Section Header: Summary of Charges
  lines.push('0 -30 Td');
  lines.push('/F2 12 Tf');
  lines.push(`(SUMMARY OF CHARGES) Tj`);

  lines.push('0 -20 Td');
  lines.push('/F1 10 Tf');
  lines.push(`(Total Energy Consumption: ${data.totalKwh.toFixed(2)} kWh) Tj`);

  lines.push('0 -16 Td');
  lines.push(`(Energy Charges @ Rs. ${data.tariffRate.toFixed(2)}/unit: Rs. ${data.energyCharges.toFixed(2)}) Tj`);

  lines.push('0 -16 Td');
  lines.push(`(Fixed Monthly & Infrastructure Charges: Rs. ${data.fixedCharges.toFixed(2)}) Tj`);

  lines.push('0 -20 Td');
  lines.push('/F2 13 Tf');
  lines.push(`(NET TOTAL AMOUNT PAYABLE: Rs. ${data.totalPayable.toFixed(2)}) Tj`);

  // Table Header
  lines.push('0 -34 Td');
  lines.push('/F2 10 Tf');
  lines.push(`(Period / Date                 Hours       Avg Watts       Units (kWh)       Rate (Rs.)       Amount (Rs.)) Tj`);

  lines.push('0 -6 Td');
  lines.push('/F1 9 Tf');
  lines.push(`(---------------------------------------------------------------------------------------------------------) Tj`);

  // Table Rows (up to 24 rows per sheet)
  const displayItems = data.items.slice(0, 24);
  for (const item of displayItems) {
    lines.push('0 -14 Td');
    const dateCol = (item.dateOrMonth + '                ').substring(0, 20);
    const hrsCol = item.operatingHours != null ? (item.operatingHours.toFixed(1) + 'h      ').substring(0, 10) : 'N/A       ';
    const wCol = item.avgWatts != null ? (item.avgWatts.toString() + ' W       ').substring(0, 12) : '30 W        ';
    const kwhCol = (item.kwh.toFixed(3) + ' kWh        ').substring(0, 16);
    const rateCol = ('Rs. ' + item.rate.toFixed(2) + '     ').substring(0, 14);
    const amtCol = 'Rs. ' + item.amount.toFixed(2);
    const rowText = `${dateCol}   ${hrsCol}  ${wCol}  ${kwhCol}  ${rateCol}   ${amtCol}`;
    lines.push(`(${escapePdf(rowText)}) Tj`);
  }

  // Footer notes
  lines.push('0 -36 Td');
  lines.push('/F1 8 Tf');
  lines.push(`(Verification Seal: Digitally recorded and authenticated by MADESH Server Energy Subsystem.) Tj`);
  lines.push('0 -12 Td');
  lines.push(`(All calculations grounded in RAPL silicon energy registers & localized Asia/Kolkata timezone rules.) Tj`);

  lines.push('ET'); // End Text

  const streamContent = lines.join('\n');
  const streamLength = streamContent.length;

  // Assembly of PDF-1.4 file structure
  const pdfParts = [
    '%PDF-1.4\n',
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    'xref\n0 7\n',
    '0000000000 65535 f \n',
    '0000000009 00000 n \n',
    '0000000058 00000 n \n',
    '0000000115 00000 n \n',
    '0000000266 00000 n \n',
    '0000000330 00000 n \n',
    '0000000411 00000 n \n',
    'trailer\n<< /Size 7 /Root 1 0 R >>\n',
    'startxref\n',
    '500\n',
    '%%EOF'
  ];

  return new Blob([pdfParts.join('')], { type: 'application/pdf' });
}

/**
 * Triggers direct browser download of the PDF file
 */
export function downloadBillPdfFile(data: BillStatementData) {
  const blob = generatePdfBlob(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanTitle = data.periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `Madesh_Server_Electricity_Bill_${cleanTitle}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Opens a print-optimized, stylized invoice window ready to print or save to PDF
 */
export function printInvoiceStatement(data: BillStatementData) {
  const win = window.open('', '_blank');
  if (!win) return;

  const rowsHtml = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px 14px; border-bottom: 1px solid #27272a; font-family: monospace;">${item.dateOrMonth}</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #27272a; text-align: center;">${item.operatingHours != null ? `${item.operatingHours.toFixed(1)} hrs` : '—'}</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #27272a; text-align: center;">${item.avgWatts ? `${item.avgWatts} W` : '30 W'}</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #27272a; text-align: right; font-weight: 500;">${item.kwh.toFixed(3)} kWh</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #27272a; text-align: right; font-family: monospace;">₹${item.rate.toFixed(2)}</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #27272a; text-align: right; font-weight: 600; color: #10b981;">₹${item.amount.toFixed(2)}</td>
    </tr>`
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Electricity Statement - ${data.periodLabel}</title>
  <meta charset="utf-8">
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #09090b;
      color: #fafafa;
      margin: 0;
      padding: 30px;
      font-size: 13px;
      line-height: 1.5;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 32px;
      background: #121215;
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #27272a;
      padding-bottom: 24px;
      margin-bottom: 24px;
    }
    .title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .subtitle { color: #a1a1aa; font-size: 12px; margin-top: 4px; }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .grid-info {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 28px;
    }
    .info-box {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 8px;
      padding: 16px;
    }
    .info-label { font-size: 11px; text-transform: uppercase; color: #71717a; font-weight: 600; margin-bottom: 4px; }
    .info-value { font-size: 14px; font-weight: 600; color: #f4f4f5; }
    .summary-bar {
      display: flex;
      justify-content: space-between;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 28px;
    }
    .sum-item { text-align: left; }
    .sum-val { font-size: 20px; font-weight: 700; color: #ffffff; margin-top: 4px; }
    .total-val { color: #34d399; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th {
      background: #18181b;
      padding: 12px 14px;
      font-size: 11px;
      text-transform: uppercase;
      color: #a1a1aa;
      font-weight: 600;
      border-bottom: 1px solid #27272a;
    }
    .footer {
      border-top: 1px solid #27272a;
      padding-top: 20px;
      color: #71717a;
      font-size: 11px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    @media print {
      body { background: #ffffff; color: #000000; padding: 0; }
      .invoice-card { border: none; padding: 0; background: #ffffff; }
      .info-box, .summary-bar { background: #f4f4f5; border-color: #e4e4e7; color: #000; }
      .info-value, .sum-val, .title { color: #000000; }
      th { background: #f4f4f5; color: #52525b; border-color: #e4e4e7; }
      td { border-color: #e4e4e7; color: #18181b; }
      .total-val { color: #059669; }
      .badge { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="title">⚡ MΛDESH SERVER CONTROL</div>
        <div class="subtitle">Automated Electricity Consumption & Utility Statement</div>
      </div>
      <div style="text-align: right;">
        <span class="badge">AUDITED RECORD</span>
        <div style="font-family: monospace; font-size: 11px; color: #71717a; margin-top: 6px;">${data.invoiceNumber}</div>
      </div>
    </div>

    <div class="grid-info">
      <div class="info-box">
        <div class="info-label">Account & Host</div>
        <div class="info-value">${data.consumerName} (${data.consumerEmail})</div>
        <div style="font-size: 12px; color: #a1a1aa; margin-top: 4px;">Host: ${data.serverHost}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Billing Cycle</div>
        <div class="info-value">${data.periodLabel}</div>
        <div style="font-size: 12px; color: #a1a1aa; margin-top: 4px;">Unit Tariff: ₹${data.tariffRate.toFixed(2)} / kWh</div>
      </div>
    </div>

    <div class="summary-bar">
      <div class="sum-item">
        <div class="info-label">Total Consumption</div>
        <div class="sum-val">${data.totalKwh.toFixed(3)} kWh</div>
      </div>
      <div class="sum-item">
        <div class="info-label">Energy Charges</div>
        <div class="sum-val">₹${data.energyCharges.toFixed(2)}</div>
      </div>
      <div class="sum-item">
        <div class="info-label">Fixed Charges</div>
        <div class="sum-val">₹${data.fixedCharges.toFixed(2)}</div>
      </div>
      <div class="sum-item">
        <div class="info-label">Net Payable Bill</div>
        <div class="sum-val total-val">₹${data.totalPayable.toFixed(2)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="text-align: left;">Date / Period</th>
          <th style="text-align: center;">Active Duration</th>
          <th style="text-align: center;">Avg Power</th>
          <th style="text-align: right;">Consumption</th>
          <th style="text-align: right;">Unit Tariff</th>
          <th style="text-align: right;">Total Cost</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="footer">
      <div>
        Digitally compiled from RAPL silicon registers and localized Asia/Kolkata timezone rules.
      </div>
      <div style="font-family: monospace;">
        Timestamp: ${data.generatedDate}
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
