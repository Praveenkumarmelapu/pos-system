/**
 * Bill image generator: draws a clean thermal-style receipt onto a canvas
 * and exports it as a PNG blob, for sharing on WhatsApp as an image
 * (bill format) instead of a plain text message.
 *
 * No external dependencies - plain Canvas 2D.
 */
import { formatCurrency, formatDate } from './formatters';

const WIDTH = 384; // logical receipt width (px)
const SCALE = 3; // render scale for a sharp image
const PAD = 20;
const INNER = WIDTH - PAD * 2;

function money(paise) {
  return formatCurrency(paise || 0);
}

function createCtx(height) {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * SCALE;
  canvas.height = Math.max(1, Math.ceil(height * SCALE));
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.fillStyle = '#111827';
  ctx.textBaseline = 'top';
  return { canvas, ctx };
}

function font(size, weight = 400, mono = false) {
  const family = mono
    ? '"Courier New", ui-monospace, monospace'
    : 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  return `${weight} ${size}px ${family}`;
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function drawDashedLine(ctx, y) {
  ctx.save();
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(PAD, y + 0.5);
  ctx.lineTo(WIDTH - PAD, y + 0.5);
  ctx.stroke();
  ctx.restore();
}

/**
 * Measure the full receipt height first, then draw. Two passes over the same
 * layout so the canvas is exactly as tall as the bill.
 */
function layoutReceipt({ sale, shop }, ctx, draw) {
  let y = draw ? 0 : 0;
  const advance = (h) => { y += h; };

  const center = (text, size, weight, color = '#111827', gapAfter = 4) => {
    ctx.font = font(size, weight);
    ctx.fillStyle = color;
    if (draw) {
      const w = ctx.measureText(text).width;
      ctx.fillText(text, (WIDTH - w) / 2, y);
    }
    advance(size + gapAfter);
  };

  const row = (left, right, size = 11, weight = 400, color = '#111827', gapAfter = 3) => {
    ctx.font = font(size, weight);
    ctx.fillStyle = color;
    if (draw) {
      ctx.fillText(left, PAD, y);
      const rw = ctx.measureText(right).width;
      ctx.fillText(right, WIDTH - PAD - rw, y);
    }
    advance(size + gapAfter);
  };

  const dashed = (gapBefore = 6, gapAfter = 6) => {
    advance(gapBefore);
    if (draw) drawDashedLine(ctx, y);
    advance(gapAfter);
  };

  // ---- Shop header ----
  advance(14);
  center((shop?.name || 'Retail Store').toUpperCase(), 16, 700);
  const address = [shop?.address?.street, [shop?.address?.city, shop?.address?.state].filter(Boolean).join(', ')]
    .filter(Boolean);
  address.forEach((line) => center(line, 10, 400, '#374151', 3));
  if (shop?.contactPhone) center(`Ph: ${shop.contactPhone}`, 10, 400, '#374151', 3);
  if (shop?.gstin) center(`GSTIN: ${shop.gstin}`, 10, 700, '#111827', 3);

  dashed(8, 8);

  // ---- Bill meta ----
  row(`Invoice: ${sale.invoiceNumber}`, (sale.paymentMethod || 'cash').toUpperCase(), 11, 600);
  row(`Date: ${formatDate(sale.saleDate)}`, '', 10, 400, '#374151');
  if (sale.customerName && sale.customerName !== 'Walk-in Customer') {
    row(`Customer: ${sale.customerName}`, '', 10, 400, '#374151');
  }
  if (sale.cashierName) row(`Cashier: ${sale.cashierName}`, '', 10, 400, '#374151');

  dashed(8, 8);

  // ---- Items header ----
  {
    const cols = itemColumns(ctx);
    ctx.font = font(10, 700);
    if (draw) drawItemRow(ctx, cols, { name: 'Item', qty: 'Qty', rate: 'Rate', total: 'Amount' }, y, true);
    advance(14);
    advance(2);
    if (draw) {
      ctx.save();
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, y + 0.5);
      ctx.lineTo(WIDTH - PAD, y + 0.5);
      ctx.stroke();
      ctx.restore();
    }
    advance(4);
  }

  // ---- Item rows ----
  (sale.items || []).forEach((item) => {
    const cols = itemColumns(ctx);
    ctx.font = font(10.5, 400);
    const nameLines = wrapText(ctx, item.name, cols.nameW);
    if (draw) {
      nameLines.forEach((ln, i) => {
        ctx.font = font(10.5, 400);
        ctx.fillStyle = '#111827';
        ctx.fillText(ln, PAD, y + i * 13);
      });
      ctx.font = font(10.5, 400);
      ctx.fillStyle = '#111827';
      const firstY = y;
      const drawRight = (text, x, width, alignRight = true) => {
        const w = ctx.measureText(text).width;
        ctx.fillText(text, alignRight ? x + width - w : x, firstY);
      };
      drawRight(String(item.quantity), cols.qtyX, cols.qtyW);
      drawRight(money(item.unitPrice), cols.rateX, cols.rateW);
      ctx.font = font(10.5, 600);
      drawRight(money(item.lineTotal), cols.totalX, cols.totalW);
    }
    advance(nameLines.length * 13 + 4);
  });

  dashed(6, 8);

  // ---- Totals ----
  row('Subtotal:', money(sale.subtotal), 11);
  if (sale.totalDiscount > 0) row('Discount:', `-${money(sale.totalDiscount)}`, 11, 400, '#047857');
  if (sale.totalTax > 0) row('GST Total:', `+${money(sale.totalTax)}`, 11, 400, '#374151');
  advance(2);
  row('GRAND TOTAL:', money(sale.grandTotal), 14, 800);
  advance(2);

  // ---- Payment breakdown ----
  if (sale.isKhata || (sale.creditAmount && sale.creditAmount > 0)) {
    row('Amount Paid:', money(sale.paidAmount || 0), 10, 400, '#374151');
    row('Khata / Udhaar:', `+${money(sale.creditAmount || sale.grandTotal)}`, 10, 700, '#9f1239');
  } else if (sale.paymentMethod === 'cash' && sale.paymentDetails?.receivedAmount > 0) {
    row('Cash Tendered:', money(sale.paymentDetails.receivedAmount), 10, 400, '#374151');
    row('Change Returned:', money(sale.paymentDetails.changeReturned), 10, 600);
  }

  dashed(8, 8);

  // ---- Footer ----
  center(shop?.settings?.receiptFooter || 'Thank you! Visit again.', 11, 600, '#111827', 5);
  center(`Powered by ${shop?.name || 'Retail POS'}`, 9, 400, '#6b7280', 0);
  advance(16);

  return y;
}

function itemColumns(ctx) {
  const qtyW = 34;
  const rateW = 62;
  const totalW = 66;
  const nameW = INNER - qtyW - rateW - totalW;
  return {
    nameW,
    qtyX: PAD + nameW, qtyW,
    rateX: PAD + nameW + qtyW, rateW,
    totalX: PAD + nameW + qtyW + rateW, totalW
  };
}

function drawItemRow(ctx, cols, item, y, header = false) {
  const weight = header ? 700 : 400;
  ctx.font = font(10, weight);
  ctx.fillStyle = '#111827';
  ctx.fillText(item.name, PAD, y);
  const cell = (text, x, w) => {
    const tw = ctx.measureText(text).width;
    ctx.fillText(text, x + w - tw, y);
  };
  cell(item.qty, cols.qtyX, cols.qtyW);
  cell(item.rate, cols.rateX, cols.rateW);
  cell(item.total, cols.totalX, cols.totalW);
}

/**
 * Generate the receipt PNG blob for a sale.
 */
export async function generateBillImageBlob({ sale, shop }) {
  // Pass 1: measure height with a scratch context
  const scratch = createCtx(10).ctx;
  const height = layoutReceipt({ sale, shop }, scratch, false);

  // Pass 2: draw for real
  const { canvas, ctx } = createCtx(height);
  layoutReceipt({ sale, shop }, ctx, true);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not create bill image'));
    }, 'image/png');
  });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Share the bill as an image.
 * - Android Chrome: Web Share API hands the PNG to WhatsApp as a photo.
 * - Fallback: downloads the PNG and opens a WhatsApp chat with a short caption
 *   so the shopkeeper can attach the downloaded image.
 *
 * Returns { method: 'share' | 'download', cancelled?: boolean }.
 */
export async function shareBillAsImage({ sale, shop, phone, openWhatsAppShare }) {
  const blob = await generateBillImageBlob({ sale, shop });
  const fileName = `Bill-${sale.invoiceNumber || 'receipt'}.png`;
  const caption = `Bill #${sale.invoiceNumber} - ${shop?.name || 'Retail Store'} - Total ${money(sale.grandTotal)}. Thank you!`;
  const file = new File([blob], fileName, { type: 'image/png' });

  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `Bill #${sale.invoiceNumber}`, text: caption });
      return { method: 'share' };
    } catch (err) {
      if (err && err.name === 'AbortError') return { method: 'share', cancelled: true };
      // fall through to download fallback
    }
  }

  downloadBlob(blob, fileName);
  if (openWhatsAppShare) {
    openWhatsAppShare(phone, `${caption}\n\n(Bill image downloaded - please attach it here)`);
  }
  return { method: 'download' };
}
