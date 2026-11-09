// Guardrail for AI-drafted customer replies. Applies to LLM output AND the rule-based fallback,
// and runs again at send time, so a consultant can't send (or an AI can't slip in) a discount.
//
// Policy: drafts never quote discounts, and never contain a rupee figure other than ones
// that came from the admin price table (passed in as allowedAmounts).

const DISCOUNT_PATTERNS = [
  /\bdiscounts?\b/i, /\bcash\s?back\b/i, /\b\d+\s?%\s?off\b/i, /\boff\s+on\b/i, /\bwaiv(?:e|ed|er)\b/i,
  /\bfree\s+(?:insurance|accessor\w+|gift|service)\b/i, /\bbest\s+price\b/i, /\blowest\s+price\b/i,
  /\bspecial\s+(?:price|deal|rate)\b/i, /\bexchange\s+bonus\b/i, /\bprice\s+match\b/i, /\bnegotiat\w+\b/i,
  /छूट/, /डिस्काउंट/, /कैशबैक/, /मुफ़्त|मुफ्त/,
];

const AMOUNT_RE = /(?:₹|Rs\.?|INR)\s?([\d,]+(?:\.\d+)?)\s?(lakh|lakhs|crore|cr|l)?/gi;

function toRupees(num, unit) {
  const n = Number(String(num).replace(/,/g, ''));
  const u = (unit || '').toLowerCase();
  if (u.startsWith('lakh') || u === 'l') return n * 100000;
  if (u === 'crore' || u === 'cr') return n * 10000000;
  return n;
}

/** Does `text` contain a discount-style phrase? */
export function mentionsDiscount(text) {
  return DISCOUNT_PATTERNS.some((re) => re.test(text));
}

/**
 * @param {string} text
 * @param {number[]} allowedAmounts rupee values that may appear (from the admin price table)
 * @returns {{text:string, flags:string[], blocked:boolean}}
 *   `blocked` => contains a discount phrase and must not be sent as-is.
 */
export function checkDraft(text, allowedAmounts = []) {
  const flags = [];
  let out = String(text ?? '');
  const tolerance = (a) => Math.max(1000, a * 0.0005);

  out = out.replace(AMOUNT_RE, (match, num, unit) => {
    const v = toRupees(num, unit);
    const ok = allowedAmounts.some((a) => Math.abs(a - v) <= tolerance(a));
    if (ok) return match;
    flags.push(`Removed amount "${match.trim()}" — not in the admin price table`);
    return '[price: ask me]';
  });

  const blocked = mentionsDiscount(out);
  if (blocked) flags.push('Mentions a discount or deal — remove it before sending. Discounts are agreed in person.');
  return { text: out, flags, blocked };
}
