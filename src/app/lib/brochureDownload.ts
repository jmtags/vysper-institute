import type { jsPDF as JsPDF } from 'jspdf';
import { BRAND_EMAIL, BRAND_LOGO, BRAND_NAME, BRAND_TAGLINE } from '../branding';
import { TrainingDetails } from './trainingData';

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

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'vysper-training';
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

async function imageToDataUrlWithTimeout(src: string, timeoutMs = 2500) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(src, { signal: controller.signal });
    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

function imageFormat(dataUrl: string) {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'JPEG';
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

  const lines = pdf.splitTextToSize(text || '', maxWidth);
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

function addPageFooter(pdf: JsPDF, pageNumber: number) {
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
  addPageFooter(pdf, pdf.getNumberOfPages());
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

export async function downloadTrainingBrochure(training: TrainingDetails, targetWindow?: Window | null) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();

  const logoUrl = await imageToDataUrl(BRAND_LOGO).catch(() => '');

  pdf.setFillColor(colors.pale);
  pdf.rect(0, 0, pageWidth, 297, 'F');
  pdf.setFillColor(colors.navy);
  pdf.rect(0, 0, pageWidth, 55, 'F');
  pdf.setFillColor(colors.teal);
  pdf.rect(0, 53, pageWidth, 4, 'F');
  pdf.setFillColor(colors.green);
  pdf.rect(0, 57, pageWidth, 3, 'F');

  if (logoUrl) {
    pdf.setFillColor(colors.white);
    pdf.roundedRect(18, 10, 20, 20, 4, 4, 'F');
    pdf.addImage(logoUrl, imageFormat(logoUrl), 20.5, 12.5, 15, 15, undefined, 'FAST');
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(colors.white);
  pdf.text(BRAND_NAME, 44, 17);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(BRAND_TAGLINE, 44, 23);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text(pdf.splitTextToSize(training.title, 144), 18, 39);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor('#d9f0ef');
  pdf.text(pdf.splitTextToSize(training.description, 148), 18, 49);

  pdf.setFillColor(colors.white);
  pdf.roundedRect(18, 74, 174, 32, 5, 5, 'F');
  const statItems = [
    ['Duration', training.duration],
    ['Delivery Mode', training.mode],
    ['Group Size', `${training.min_participants}-${training.max_participants}`],
    ['Base Package', `PHP ${training.base_price.toLocaleString()}`]
  ];

  statItems.forEach(([label, value], index) => {
    const x = 26 + index * 42;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(colors.muted);
    pdf.text(label, x, 87);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(colors.navy);
    pdf.text(pdf.splitTextToSize(value, 36), x, 95);
  });

  let y = 122;
  y = addSectionTitle(pdf, 'Program Overview', 18, y);
  y = addWrappedText(pdf, training.overview, 18, y, 174, { size: 10.5, lineHeight: 5.4 });

  y += 10;
  y = ensureSpace(pdf, y, 56);
  y = addSectionTitle(pdf, 'Learning Objectives', 18, y);
  training.objectives.forEach((objective) => {
    y = ensureSpace(pdf, y, 12);
    pdf.setFillColor(colors.green);
    pdf.circle(21, y - 1.5, 1.6, 'F');
    y = addWrappedText(pdf, objective, 27, y, 164, { size: 9.5, lineHeight: 5 }) + 1.5;
  });

  y += 6;
  y = ensureSpace(pdf, y, 64);
  y = addSectionTitle(pdf, 'Training Outline', 18, y);
  training.outline.forEach((item, index) => {
    y = ensureSpace(pdf, y, 14);
    pdf.setFillColor(colors.softBlue);
    pdf.roundedRect(18, y - 6, 8, 8, 2, 2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(colors.navy);
    pdf.text(String(index + 1), 22, y - 0.5, { align: 'center' });
    y = addWrappedText(pdf, item, 31, y, 160, { size: 9.5, lineHeight: 5 }) + 1.5;
  });

  y += 6;
  y = ensureSpace(pdf, y, 48);
  y = addSectionTitle(pdf, 'Target Participants', 18, y);
  y = addWrappedText(pdf, training.target_participants || 'Participants will be aligned based on the final quotation request.', 18, y, 174, {
    size: 10,
    lineHeight: 5.2
  });

  y += 8;
  if (training.speakers.length > 0) {
    y = ensureSpace(pdf, y, 54);
    y = addSectionTitle(pdf, training.speakers.length > 1 ? 'Keynote Speakers' : 'Keynote Speaker', 18, y);

    for (const speaker of training.speakers) {
      y = ensureSpace(pdf, y, 38);
      pdf.setFillColor(colors.white);
      pdf.roundedRect(18, y - 6, 174, 34, 5, 5, 'F');

      const speakerImage = speaker.profile_image_url
        ? await imageToDataUrlWithTimeout(speaker.profile_image_url).catch(() => '')
        : '';

      if (speakerImage) {
        pdf.addImage(speakerImage, imageFormat(speakerImage), 24, y - 1, 22, 22, undefined, 'FAST');
      } else {
        pdf.setFillColor(colors.softBlue);
        pdf.roundedRect(24, y - 1, 22, 22, 4, 4, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(colors.navy);
        pdf.text(
          speaker.full_name.split(' ').map((part) => part[0]).join('').slice(0, 2),
          35,
          y + 12,
          { align: 'center' }
        );
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(colors.navy);
      pdf.text(speaker.full_name, 54, y + 2);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(colors.teal);
      pdf.text([speaker.title, speaker.specialty].filter(Boolean).join(' / '), 54, y + 8);
      addWrappedText(pdf, speaker.bio_notes || 'Bionotes will be available soon.', 54, y + 15, 132, {
        size: 8.5,
        color: colors.text,
        lineHeight: 4.3
      });
      y += 40;
    }
  }

  y = ensureSpace(pdf, y + 4, 36);
  pdf.setFillColor(colors.navy);
  pdf.roundedRect(18, y, 174, 30, 5, 5, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(colors.white);
  pdf.text('Ready to request a quotation?', 26, y + 11);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor('#d9f0ef');
  pdf.text(`Contact ${BRAND_EMAIL} or use the website quotation form.`, 26, y + 20);

  addPageFooter(pdf, 1);

  deliverPdf(pdf, `${slugify(training.slug || training.title)}-brochure.pdf`, targetWindow);
}
