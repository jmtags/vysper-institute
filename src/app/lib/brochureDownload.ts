import { BRAND_EMAIL, BRAND_NAME, BRAND_TAGLINE } from '../branding';
import { TrainingDetails } from './trainingData';

function cleanText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[\\()]/g, '\\$&');
}

function wrapText(text: string, maxLength = 86) {
  const words = cleanText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length > maxLength) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines;
}

function buildPdf(lines: Array<{ text: string; size?: number; gap?: number }>) {
  const pages: string[][] = [];
  let currentPage: string[] = [];
  let y = 780;

  lines.forEach((line) => {
    const size = line.size ?? 11;
    const gap = line.gap ?? 16;
    const wrapped = wrapText(line.text, size >= 18 ? 48 : 86);

    wrapped.forEach((text, index) => {
      if (y < 56) {
        pages.push(currentPage);
        currentPage = [];
        y = 780;
      }

      currentPage.push(`BT /F1 ${size} Tf 50 ${y} Td (${text}) Tj ET`);
      y -= index === wrapped.length - 1 ? gap : size + 4;
    });
  });

  if (currentPage.length) pages.push(currentPage);

  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];

  const pageRefs: string[] = [];
  pages.forEach((pageLines) => {
    const pageObjectNumber = objects.length + 1;
    const contentObjectNumber = objects.length + 2;
    pageRefs.push(`${pageObjectNumber} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`);
    const stream = pageLines.join('\n');
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pageRefs.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

export function downloadTrainingBrochure(training: TrainingDetails) {
  const lines: Array<{ text: string; size?: number; gap?: number }> = [
    { text: BRAND_NAME, size: 22, gap: 24 },
    { text: BRAND_TAGLINE, size: 12, gap: 26 },
    { text: training.title, size: 18, gap: 24 },
    { text: training.description, size: 12, gap: 20 },
    { text: 'Program Overview', size: 15, gap: 20 },
    { text: training.overview, gap: 20 },
    { text: 'Training Details', size: 15, gap: 20 },
    { text: `Duration: ${training.duration}` },
    { text: `Delivery Mode: ${training.mode}` },
    { text: `Group Size: ${training.min_participants}-${training.max_participants} participants` },
    { text: `Base Package: PHP ${training.base_price.toLocaleString()}`, gap: 22 },
    { text: 'Learning Objectives', size: 15, gap: 20 },
    ...training.objectives.map((objective) => ({ text: `- ${objective}` })),
    { text: 'Training Outline', size: 15, gap: 20 },
    ...training.outline.map((item, index) => ({ text: `${index + 1}. ${item}` })),
    { text: 'Keynote Speaker/s', size: 15, gap: 20 },
    ...(training.speakers.length
      ? training.speakers.map((speaker) => ({
          text: `${speaker.full_name}${speaker.specialty ? ` - ${speaker.specialty}` : ''}${speaker.bio_notes ? `: ${speaker.bio_notes}` : ''}`
        }))
      : [{ text: 'Speaker details will be confirmed with the final quotation.' }]),
    { text: 'Contact', size: 15, gap: 20 },
    { text: `For quotation requests and partnerships, email ${BRAND_EMAIL}.` }
  ];

  const pdf = buildPdf(lines);
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${training.slug || 'vysper-training'}-brochure.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
