// Rule-based lead analysis. Two jobs: (1) the fallback when no LLM key is set or the LLM fails/misbehaves,
// (2) the deterministic baseline the tests check. Output shape is identical to the LLM path.
import { checkDraft } from './guard.js';
import { fmtDay, fmtTime, inrShort } from './format.js';

const HOT = /\b(buy|book|booking|purchase|finali[sz]e|ready|urgent|today|tomorrow|this (week|weekend)|asap|immediately|delivery)\b|खरीद|बुक|जल्द/i;
const FINANCE = /\b(emi|loan|finance|down\s?payment|instalment|installment)\b|लोन|किस्त/i;
const BUDGET_RE = /(?:₹|rs\.?|inr|under|upto|up to|budget(?: of)?)\s*([\d.,]+)\s*(lakh|lakhs|l|cr|crore)?/i;

/** @returns {{summary:string,intent:'hot'|'warm'|'cold',needs:string[],questions:string[],draft:string,confidence:'high'|'medium'|'low',flags:string[]}} */
export function analyseWithRules(ctx) {
  const { lead, modelName, variantName, usedLabel, cityName, onRoad, consultantName, showroomName, testDrive, tradeIn } = ctx;
  const msg = (lead.message || '').trim();
  const needs = [];
  const questions = [];

  const budget = BUDGET_RE.exec(msg);
  if (budget) needs.push(`Budget mentioned: "${budget[0].trim()}"`);
  if (FINANCE.test(msg)) needs.push('Interested in finance / EMI');
  if (/\bautomatic\b|\bAT\b|ऑटोमैटिक/i.test(msg)) needs.push('Prefers automatic');
  if (/\bdiesel\b|डीज़ल/i.test(msg)) needs.push('Prefers diesel');
  if (/\bpetrol\b|पेट्रोल/i.test(msg)) needs.push('Prefers petrol');
  if (/\bfamily\b|\bseven|7[- ]?seat|परिवार/i.test(msg)) needs.push('Family use');
  if (tradeIn) needs.push(`Has a car to trade in: ${tradeIn}`);
  if (testDrive) needs.push(`Test drive booked: ${fmtDay(testDrive.slot_start)} ${fmtTime(testDrive.slot_start)} at ${testDrive.showroom}`);

  const interest = usedLabel ? `used ${usedLabel}` : modelName ? `${modelName}${variantName ? ' ' + variantName : ''}` : null;
  if (!interest) questions.push('Which model (new or used) are they considering?');
  if (!budget && !FINANCE.test(msg)) questions.push('What is their budget, and will they pay cash or finance?');
  if (!testDrive) questions.push('When can they visit for a test drive?');
  if (!tradeIn && !usedLabel) questions.push('Do they have a car to exchange?');

  let intent = 'cold';
  if (testDrive || HOT.test(msg)) intent = 'hot';
  else if (interest && (msg.length > 15 || FINANCE.test(msg))) intent = 'warm';
  else if (interest) intent = 'warm';

  const confidence = !interest ? 'low' : msg.length >= 20 || testDrive ? 'high' : 'medium';

  const summary = [
    `${lead.name} ${interest ? `is looking at ${interest}` : 'sent an enquiry without naming a car'}${cityName ? ` (${cityName})` : ''}.`,
    msg ? `In their words: "${msg.length > 160 ? msg.slice(0, 157) + '…' : msg}"` : 'They left no message.',
    needs.length ? `Signals: ${needs.join('; ')}.` : '',
    confidence === 'low' ? 'Not enough to qualify — treat as cold until a call confirms what they want.' : '',
  ].filter(Boolean).join(' ');

  const hi = lead.lang === 'hi';
  const lines = [];
  lines.push(hi ? `नमस्ते ${lead.name} जी,` : `Hi ${lead.name},`);
  lines.push(hi
    ? `${showroomName || 'Brand X'} से ${consultantName || 'हमारी टीम'} बोल रहा/रही हूँ। ${interest ? interest + ' में' : 'हमारी कारों में'} रुचि दिखाने के लिए धन्यवाद।`
    : `This is ${consultantName || 'the Brand X team'}${showroomName ? ' from ' + showroomName : ''}. Thanks for your interest in ${interest || 'our cars'}.`);
  if (onRoad && !usedLabel) {
    lines.push(hi
      ? `${modelName} ${variantName || ''} की ऑन-रोड कीमत ${cityName} में ${inrShort(onRoad.total)} है (${onRoad.validUntil} तक मान्य, बदल सकती है)।`
      : `For reference, the ${modelName} ${variantName || ''} is ${inrShort(onRoad.total)} on-road in ${cityName} (valid till ${onRoad.validUntil}; prices may change).`);
  }
  if (testDrive) {
    lines.push(hi ? `आपकी टेस्ट ड्राइव ${fmtDay(testDrive.slot_start)} को ${fmtTime(testDrive.slot_start)} बजे तय है। हम आपका इंतज़ार करेंगे।`
      : `Your test drive is confirmed for ${fmtDay(testDrive.slot_start)} at ${fmtTime(testDrive.slot_start)}. We'll have the car ready for you.`);
  } else {
    lines.push(hi ? 'क्या आप इस हफ़्ते टेस्ट ड्राइव के लिए आ सकते हैं? कोई समय बताइए।' : 'Would you like to come in for a test drive this week? Tell me a time that suits you.');
  }
  if (questions[0] && !testDrive) lines.push(hi ? 'आपकी ज़रूरत समझने के लिए: आपका बजट और पसंदीदा ईंधन क्या है?' : 'So I can suggest the right variant: what budget and fuel type do you have in mind?');

  const allowed = onRoad?.total ? [onRoad.total, ...(onRoad.lines || []).map((l) => l.amount)] : [];
  const checked = checkDraft(lines.join('\n\n'), allowed);
  return { summary, intent, needs, questions: questions.slice(0, 3), draft: checked.text, confidence, flags: checked.flags };
}
