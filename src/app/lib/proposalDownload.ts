import { BRAND_NAME, BRAND_TAGLINE, BRAND_TRAINING_CENTER } from '../branding';

function escapeHtml(value: any) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function downloadProposal(data: {
  proposalNumber: string;
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
  addOns: Array<{ name: string; quantity: number; totalPrice: number }>;
}) {
  const addOnsHtml = data.addOns.length
    ? data.addOns.map((addOn) => `
      <tr>
        <td>${escapeHtml(addOn.name)} (${escapeHtml(addOn.quantity)}x)</td>
        <td>PHP ${Number(addOn.totalPrice).toLocaleString()}</td>
      </tr>
    `).join('')
    : '<tr><td>No paid add-ons selected</td><td>PHP 0</td></tr>';

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(data.proposalNumber)} - Training Quotation</title>
    <style>
      body { font-family: Arial, sans-serif; color: #10233f; margin: 40px; line-height: 1.5; }
      header { border-bottom: 3px solid #0d9488; padding-bottom: 18px; margin-bottom: 28px; }
      h1, h2 { color: #0b2a4a; margin: 0 0 8px; }
      .muted { color: #5f6b7a; }
      table { width: 100%; border-collapse: collapse; margin: 14px 0 28px; }
      td, th { border: 1px solid #d8dee8; padding: 10px; text-align: left; }
      th { background: #eef7f6; }
      .total { font-size: 22px; font-weight: 700; color: #0b2a4a; }
      .section { margin-bottom: 28px; }
    </style>
  </head>
  <body>
    <header>
      <h1>${BRAND_NAME}</h1>
      <p class="muted">${BRAND_TAGLINE}</p>
      <p><strong>Quotation ID:</strong> ${escapeHtml(data.proposalNumber)}</p>
    </header>

    <section class="section">
      <h2>Client Information</h2>
      <table>
        <tr><th>Organization</th><td>${escapeHtml(data.organizationName || 'Not provided')}</td></tr>
        <tr><th>Contact Person</th><td>${escapeHtml(data.contactPerson || 'Not provided')}</td></tr>
        <tr><th>Email</th><td>${escapeHtml(data.contactEmail || 'Not provided')}</td></tr>
        <tr><th>Phone</th><td>${escapeHtml(data.contactPhone || 'Not provided')}</td></tr>
      </table>
    </section>

    <section class="section">
      <h2>Training Details</h2>
      <table>
        <tr><th>Program</th><td>${escapeHtml(data.trainingTitle)}</td></tr>
        <tr><th>Participants</th><td>${escapeHtml(data.participants)}</td></tr>
        <tr><th>Duration</th><td>${escapeHtml(data.duration)}</td></tr>
        <tr><th>Delivery Mode</th><td>${escapeHtml(data.deliveryMode)}</td></tr>
        <tr><th>Venue</th><td>${escapeHtml(data.venue === 'client-site' ? 'Client Site' : BRAND_TRAINING_CENTER)}</td></tr>
        <tr><th>Preferred Date</th><td>${escapeHtml(data.preferredDate || 'To be confirmed')}</td></tr>
      </table>
    </section>

    <section class="section">
      <h2>Cost Breakdown</h2>
      <table>
        <tr><th>Item</th><th>Amount</th></tr>
        <tr><td>Base Training Fee</td><td>PHP ${Number(data.basePrice).toLocaleString()}</td></tr>
        ${addOnsHtml}
      </table>
      <p class="total">Total Investment: PHP ${Number(data.totalPrice).toLocaleString()}</p>
    </section>
  </body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.proposalNumber || 'training-quotation'}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
