/**
 * Xuất hóa đơn FE (window.print → Save as PDF).
 * Layout kiểu Stripe receipt: card trắng, căn giữa, tối giản.
 */

export interface PrintPaymentInvoiceLabels {
  brand: string;
  paidTitle: string;
  invoiceId: string;
  paymentDate: string;
  paymentMethod: string;
  plan: string;
  poweredBy: string;
  footnote: string;
}

export interface PrintPaymentInvoiceInput {
  invoiceId: string;
  planName: string;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethodValue?: string;
  locale: string;
  labels: PrintPaymentInvoiceLabels;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(amount: number, currency: string, locale: string): string {
  const intlLocale = locale.toLowerCase().startsWith("vi") ? "vi-VN" : "en-US";
  try {
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: currency || "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency || "VND"}`;
  }
}

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const intlLocale = locale.toLowerCase().startsWith("vi") ? "vi-VN" : "en-US";
  return d.toLocaleDateString(intlLocale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Icon hóa đơn + badge check xanh — giống receipt Stripe. */
const RECEIPT_ICON_SVG = `
<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="12" y="8" width="28" height="36" rx="4" fill="#F3F4F6" stroke="#D1D5DB" stroke-width="1.5"/>
  <path d="M18 18h16M18 24h16M18 30h10" stroke="#9CA3AF" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="38" cy="38" r="11" fill="#22C55E"/>
  <path d="M33.5 38.2l2.8 2.8 6.2-6.2" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function buildInvoiceHtml(input: PrintPaymentInvoiceInput): string {
  const { labels } = input;
  const amount = formatMoney(input.amount, input.currency, input.locale);
  const date = formatDate(input.paymentDate, input.locale);
  const lang = input.locale.toLowerCase().startsWith("vi") ? "vi" : "en";
  const method = input.paymentMethodValue?.trim() || "SePay";

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(labels.paidTitle)} — ${escapeHtml(input.invoiceId)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      padding: 40px 20px 48px;
      background: #F5F5F3;
      color: #1A1A1A;
      font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      max-width: 480px;
      margin: 0 auto;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 28px;
      font-size: 15px;
      font-weight: 600;
      color: #1A1A1A;
      letter-spacing: -0.01em;
    }
    .brand-mark {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: #7C3AED;
      color: #fff;
      display: grid;
      place-items: center;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .card {
      background: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06);
      padding: 40px 36px 36px;
      text-align: center;
    }
    .icon-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: 18px;
    }
    .paid-title {
      margin: 0 0 10px;
      font-size: 15px;
      font-weight: 500;
      color: #6B7280;
    }
    .amount {
      margin: 0 0 28px;
      font-size: 36px;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: #111827;
      line-height: 1.15;
    }
    .divider {
      height: 1px;
      background: #EFEFEF;
      margin: 0 0 8px;
    }
    .rows {
      text-align: left;
      padding-top: 8px;
    }
    .row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 0;
    }
    .row + .row {
      border-top: 1px solid #F3F4F6;
    }
    .row-k {
      flex-shrink: 0;
      font-size: 14px;
      font-weight: 400;
      color: #6B7280;
    }
    .row-v {
      text-align: right;
      font-size: 14px;
      font-weight: 500;
      color: #1F2937;
      word-break: break-word;
    }
    .foot {
      margin-top: 28px;
      text-align: center;
      font-size: 12px;
      line-height: 1.6;
      color: #9CA3AF;
    }
    .foot .powered {
      margin: 0 0 4px;
    }
    .foot .note {
      margin: 0;
      max-width: 360px;
      margin-left: auto;
      margin-right: auto;
    }
    @media print {
      body {
        background: #fff;
        padding: 16px;
      }
      .card {
        box-shadow: none;
        border: 1px solid #E5E7EB;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="brand">
      <span class="brand-mark">IQ</span>
      <span>${escapeHtml(labels.brand)}</span>
    </div>
    <div class="card">
      <div class="icon-wrap">${RECEIPT_ICON_SVG}</div>
      <p class="paid-title">${escapeHtml(labels.paidTitle)}</p>
      <p class="amount">${escapeHtml(amount)}</p>
      <div class="divider"></div>
      <div class="rows">
        <div class="row">
          <span class="row-k">${escapeHtml(labels.invoiceId)}</span>
          <span class="row-v">${escapeHtml(input.invoiceId)}</span>
        </div>
        <div class="row">
          <span class="row-k">${escapeHtml(labels.paymentDate)}</span>
          <span class="row-v">${escapeHtml(date)}</span>
        </div>
        <div class="row">
          <span class="row-k">${escapeHtml(labels.plan)}</span>
          <span class="row-v">${escapeHtml(input.planName)}</span>
        </div>
        <div class="row">
          <span class="row-k">${escapeHtml(labels.paymentMethod)}</span>
          <span class="row-v">${escapeHtml(method)}</span>
        </div>
      </div>
    </div>
    <div class="foot">
      <p class="powered">${escapeHtml(labels.poweredBy)}</p>
      <p class="note">${escapeHtml(labels.footnote)}</p>
    </div>
  </div>
  <script>
    window.onload = function () {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;
}

/** Mở cửa sổ in hóa đơn. Trả false nếu popup bị chặn. */
export function printPaymentInvoice(input: PrintPaymentInvoiceInput): boolean {
  if (typeof window === "undefined") return false;
  const w = window.open("", "_blank", "width=560,height=820");
  if (!w) return false;
  w.document.open();
  w.document.write(buildInvoiceHtml(input));
  w.document.close();
  return true;
}
