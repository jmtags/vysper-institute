import type { jsPDF as JsPDF } from 'jspdf';
import { BRAND_EMAIL, BRAND_LOGO, BRAND_NAME, BRAND_TAGLINE, BRAND_TRAINING_CENTER } from '../branding';

const colors = {
  navy: '#08294a',
  teal: '#147c73',
  green: '#5fb765',
  pale: '#eef8f5',
  softBlue: '#eaf3f8',
  text: '#1d2939',
  muted: '#667085',
  border: '#d9e7e4',
  white: '#ffffff'
};

export interface ProposalDownloadData {
  proposalNumber: string;
  status?: string;
  trainingTitle: string;
  organizationName?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  participants: string | number;
  duration: string;
  deliveryMode: string;
  venue: string;
  preferredDate?: string;
  basePrice: number;
  totalPrice: number;
  trainingImageUrl?: string | null;
  addOns: Array<{ name: string; quantity: number; totalPrice: number }>;
  adminNotes?: string;
  declineReason?: string;
}

async function imageToDataUrl(src: string) {
  const response = await fetch(src);
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function imageFormat(dataUrl: string) {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'JPEG';
}

function filename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'training-quotation';
}

function money(value: number) {
  return `PHP ${Number(value || 0).toLocaleString()}`;
}

function displayStatus(status?: string) {
  if (status === 'accepted') return 'Approved';
  if (status === 'submitted') return 'Pending Review';
  if (status === 'declined') return 'Declined';
  if (status === 'archived') return 'Archived';
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Quotation Request';
}

function addWrappedText(
  pdf: JsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options: { size?: number; color?: string; lineHeight?: number; fontStyle?: 'normal' | 'bold' } = {}
) {
  pdf.setFont('helvetica', options.fontStyle ?? 'normal');
  pdf.setFontSize(options.size ?? 10);
  pdf.setTextColor(options.color ?? colors.text);

  const lines = pdf.splitTextToSize(String(text || ''), maxWidth);
  pdf.text(lines, x, y);
  return y + lines.length * (options.lineHeight ?? 5);
}

function addSectionTitle(pdf: JsPDF, title: string, x: number, y: number) {
  pdf.setFillColor(colors.teal);
  pdf.roundedRect(x, y - 5, 2.5, 9, 1, 1, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(colors.navy);
  pdf.text(title, x + 6, y);
  return y + 8;
}

function addFooter(pdf: JsPDF, pageNumber: number) {
  pdf.setDrawColor(colors.border);
  pdf.line(18, 282, 192, 282);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(colors.muted);
  pdf.text(`${BRAND_NAME} | ${BRAND_EMAIL}`, 18, 288);
  pdf.text(String(pageNumber), 190, 288, { align: 'right' });
}

function addNewPage(pdf: JsPDF) {
  pdf.addPage();
  addFooter(pdf, pdf.getNumberOfPages());
  return 24;
}

function ensureSpace(pdf: JsPDF, y: number, needed = 32) {
  if (y + needed > 276) return addNewPage(pdf);
  return y;
}

function deliverPdf(pdf: JsPDF, outputFilename: string, targetWindow?: Window | null) {
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);

  if (targetWindow && !targetWindow.closed) {
    targetWindow.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }

  const link = document.createElement('a');
  link.href = url;
  link.download = outputFilename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function addInfoRow(pdf: JsPDF, label: string, value: string, x: number, y: number, width = 84) {
  pdf.setFillColor(colors.white);
  pdf.roundedRect(x, y, width, 15, 3, 3, 'F');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(colors.muted);
  pdf.text(label, x + 4, y + 5);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(colors.navy);
  pdf.text(pdf.splitTextToSize(value || 'Not provided', width - 8), x + 4, y + 11);
}

export async function downloadProposal(data: ProposalDownloadData, targetWindow?: Window | null) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const logoUrl = await imageToDataUrl(BRAND_LOGO).catch(() => '');
  const trainingImageUrl = data.trainingImageUrl ? await imageToDataUrl(data.trainingImageUrl).catch(() => '') : '';

  pdf.setFillColor(colors.pale);
  pdf.rect(0, 0, pageWidth, 297, 'F');
  pdf.setFillColor(colors.navy);
  pdf.rect(0, 0, pageWidth, 58, 'F');
  pdf.setFillColor(colors.teal);
  pdf.rect(0, 56, pageWidth, 4, 'F');
  pdf.setFillColor(colors.green);
  pdf.rect(0, 60, pageWidth, 3, 'F');

  if (logoUrl) {
    pdf.setFillColor(colors.white);
    pdf.roundedRect(18, 12, 20, 20, 4, 4, 'F');
    pdf.addImage(logoUrl, imageFormat(logoUrl), 20.5, 14.5, 15, 15, undefined, 'FAST');
  }

  if (trainingImageUrl) {
    pdf.addImage(trainingImageUrl, imageFormat(trainingImageUrl), 148, 12, 44, 34, undefined, 'FAST');
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(colors.white);
  pdf.text(BRAND_NAME, 44, 19);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(BRAND_TAGLINE, 44, 25);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text('Training Quotation', 18, 45);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor('#d9f0ef');
  pdf.text(`Quotation ID: ${data.proposalNumber}`, 118, 20);
  pdf.text(`Status: ${displayStatus(data.status)}`, 118, 27);
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 118, 34);

  pdf.setFillColor(colors.white);
  pdf.roundedRect(18, 76, 174, 34, 5, 5, 'F');
  const stats = [
    ['Program', data.trainingTitle],
    ['Participants', String(data.participants)],
    ['Delivery', data.deliveryMode],
    ['Investment', money(data.totalPrice)]
  ];
  stats.forEach(([label, value], index) => {
    const x = 26 + index * 42;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(colors.muted);
    pdf.text(label, x, 89);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(index === 0 ? 8.5 : 10);
    pdf.setTextColor(colors.navy);
    pdf.text(pdf.splitTextToSize(value, 36), x, 97);
  });

  let y = 128;
  y = addSectionTitle(pdf, 'Client Information', 18, y);
  addInfoRow(pdf, 'Organization', data.organizationName || 'Not provided', 18, y, 84);
  addInfoRow(pdf, 'Contact Person', data.contactPerson || 'Not provided', 108, y, 84);
  y += 19;
  addInfoRow(pdf, 'Email', data.contactEmail || 'Not provided', 18, y, 84);
  addInfoRow(pdf, 'Phone', data.contactPhone || 'Not provided', 108, y, 84);

  y += 32;
  y = addSectionTitle(pdf, 'Training Details', 18, y);
  addInfoRow(pdf, 'Program', data.trainingTitle, 18, y, 174);
  y += 19;
  addInfoRow(pdf, 'Duration', data.duration, 18, y, 54);
  addInfoRow(pdf, 'Delivery Mode', data.deliveryMode, 78, y, 54);
  addInfoRow(pdf, 'Venue', data.venue === 'client-site' ? 'Client Site' : BRAND_TRAINING_CENTER, 138, y, 54);
  y += 19;
  addInfoRow(pdf, 'Preferred Date', data.preferredDate || 'To be confirmed', 18, y, 84);
  addInfoRow(pdf, 'Participants', String(data.participants), 108, y, 84);

  y += 32;
  y = ensureSpace(pdf, y, 64);
  y = addSectionTitle(pdf, 'Cost Breakdown', 18, y);
  pdf.setFillColor(colors.white);
  pdf.roundedRect(18, y - 3, 174, 10, 3, 3, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(colors.navy);
  pdf.text('Item', 24, y + 3);
  pdf.text('Amount', 184, y + 3, { align: 'right' });
  y += 12;

  const costRows = [
    { name: 'Base Training Fee', quantity: 1, amount: data.basePrice },
    ...data.addOns.map((addOn) => ({ name: addOn.name, quantity: addOn.quantity, amount: addOn.totalPrice }))
  ];

  if (data.addOns.length === 0) {
    costRows.push({ name: 'Paid Add-ons', quantity: 0, amount: 0 });
  }

  costRows.forEach((row) => {
    y = ensureSpace(pdf, y, 14);
    pdf.setFillColor(colors.white);
    pdf.roundedRect(18, y - 5, 174, 10, 2, 2, 'F');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(colors.text);
    pdf.text(`${row.name}${row.quantity > 1 ? ` (${row.quantity}x)` : ''}`, 24, y + 1);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.navy);
    pdf.text(money(row.amount), 184, y + 1, { align: 'right' });
    y += 12;
  });

  y += 4;
  y = ensureSpace(pdf, y, 28);
  pdf.setFillColor(colors.navy);
  pdf.roundedRect(18, y, 174, 24, 5, 5, 'F');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor('#d9f0ef');
  pdf.text('Total Investment', 26, y + 9);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(colors.white);
  pdf.text(money(data.totalPrice), 184, y + 16, { align: 'right' });
  y += 34;

  y = ensureSpace(pdf, y, 58);
  y = addSectionTitle(pdf, 'Inclusions', 18, y);
  [
    'Professional facilitator/s for the confirmed training schedule',
    'Training design and session facilitation based on the selected program',
    'Standard participant materials and certificates of completion',
    'Coordination support before the training date'
  ].forEach((item) => {
    y = addWrappedText(pdf, `- ${item}`, 18, y, 174, { size: 9, lineHeight: 4.8 }) + 1;
  });

  y += 4;
  y = ensureSpace(pdf, y, 46);
  y = addSectionTitle(pdf, 'Terms and Conditions', 18, y);
  [
    'Quotation validity: 30 calendar days from the generated date.',
    'Payment terms: 50% down payment upon confirmation and remaining balance on or before the training date.',
    'Venue, meals, participant logistics, and third-party platform fees are excluded unless explicitly included in the quotation.',
    'Schedule changes are subject to facilitator availability and written confirmation.'
  ].forEach((item) => {
    y = addWrappedText(pdf, `- ${item}`, 18, y, 174, { size: 9, lineHeight: 4.8 }) + 1;
  });

  if (data.adminNotes || data.declineReason) {
    y = ensureSpace(pdf, y, 34);
    y = addSectionTitle(pdf, data.declineReason ? 'Quotation Notes' : 'Admin Notes', 18, y);
    if (data.declineReason) {
      y = addWrappedText(pdf, `Decline reason: ${data.declineReason}`, 18, y, 174, { size: 9.5, lineHeight: 5.2 });
      y += 4;
    }
    if (data.adminNotes) {
      y = addWrappedText(pdf, data.adminNotes, 18, y, 174, { size: 9.5, lineHeight: 5.2 });
    }
  }

  y = ensureSpace(pdf, y + 6, 28);
  y = addSectionTitle(pdf, 'Approval', 18, y);
  pdf.setFillColor(colors.white);
  pdf.roundedRect(18, y, 174, 32, 5, 5, 'F');
  pdf.setDrawColor(colors.border);
  pdf.line(28, y + 22, 86, y + 22);
  pdf.line(112, y + 22, 182, y + 22);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(colors.muted);
  pdf.text('Authorized Representative', 28, y + 27);
  pdf.text('Date', 112, y + 27);
  y += 42;

  y = ensureSpace(pdf, y, 28);
  pdf.setFillColor(colors.softBlue);
  pdf.roundedRect(18, y, 174, 24, 5, 5, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(colors.navy);
  pdf.text('Next Step', 26, y + 9);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.8);
  pdf.setTextColor(colors.text);
  pdf.text(`For confirmation or adjustments, contact ${BRAND_EMAIL}.`, 26, y + 17);

  addFooter(pdf, 1);
  deliverPdf(pdf, `${filename(data.proposalNumber)}.pdf`, targetWindow);
}
