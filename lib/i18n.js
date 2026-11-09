// English / Hindi UI strings. Car content (model names, about text) is translated in the database;
// variant names and feature lists are shared brand terms and stay in English (assumption in the TDD).
import { cookies } from 'next/headers';

const dict = {
  en: {
    brand: 'Brand X Lucknow', nav_new: 'New cars', nav_used: 'Certified used', nav_drive: 'Test drive', nav_emi: 'EMI',
    hero_title: 'Find the car. Book the drive. Skip the phone call.',
    hero_sub: 'Real on-road prices for your city, certified used cars, and a test drive at a time that suits you.',
    cta_drive: 'Book a test drive', cta_browse: 'Explore new cars', cta_used: 'See certified used cars', cta_call: 'Request a call back',
    from: 'from', on_road: 'on-road', ex_showroom: 'Ex-showroom', new_cars: 'New cars', used_cars: 'Certified used cars',
    used_sub: 'Every car is inspected, with the report published before you visit.', view: 'View', see_all: 'See all',
    why_title: 'Why buy from us', why1_t: 'The real price', why1_d: 'Ex-showroom to on-road, line by line, for your city.',
    why2_t: 'Inspected, not just cleaned', why2_d: 'Every used car has a published 8-point inspection.',
    why3_t: 'Answered in 5 minutes', why3_d: 'Every enquiry reaches a named consultant, fast.',
    variant: 'Variant', city: 'City', colour: 'Colour', price_breakup: 'On-road price breakup', total_on_road: 'On-road price',
    roadTax: 'Road tax', insurance: 'Insurance', registration: 'Registration & handling', tcs: 'TCS', accessories: 'Accessories package', exShowroom: 'Ex-showroom price',
    valid_until: 'Valid until', price_disclaimer: 'Prices may change without notice. Final on-road price is confirmed at booking.',
    price_expired: 'Price for this city is being updated.', price_expired_d: 'Ask us for today’s on-road price.', price_missing: 'Price on request',
    specs: 'Specifications', engine: 'Engine', power: 'Power', mileage: 'Mileage', transmission: 'Transmission', fuel: 'Fuel', seats: 'Seats',
    features: 'Key features', emi_title: 'EMI calculator', down_payment: 'Down payment', tenure: 'Tenure', months: 'months', interest: 'Interest rate (p.a.)',
    emi_per_month: 'per month', emi_note: 'Indicative. Actual rate depends on your lender and profile.', loan_amount: 'Loan amount',
    name: 'Your name', phone: 'Mobile number', email: 'Email (optional)', message: 'Anything we should know? (optional)', send: 'Send enquiry',
    sending: 'Sending…', consent: 'I agree to be contacted by Brand X about this enquiry, and to my details being stored for that purpose. I can opt out any time.',
    privacy: 'Privacy notice', thanks_title: 'Thank you, {name}', thanks_body: '{who} will contact you within 5 minutes.', thanks_body2: 'We’ve also sent a confirmation on WhatsApp.',
    thanks_repeat: 'We already have your enquiry. {who} has been notified.', a_consultant: 'A consultant',
    tradein: 'I have a car to exchange', tradein_make: 'Make & model', tradein_year: 'Year', tradein_km: 'Kilometres',
    book_title: 'Book a test drive', book_sub: 'Pick a car, a time and you’re done. No calls needed.',
    step_car: 'Choose a car', step_time: 'Choose a time', step_you: 'Your details', confirm_booking: 'Confirm test drive',
    no_slots: 'No free slots this day. Try another day.', slot_taken: 'Taken', booked_title: 'You’re booked in', booked_sub: 'Show this page at the showroom.',
    cancel_drive: 'Cancel test drive', cancelled: 'This test drive has been cancelled.', add_cal: 'Bring a valid driving licence.', directions: 'Showroom',
    filter: 'Filter', model: 'Model', any: 'Any', max_price: 'Max price', max_km: 'Max km', clear: 'Clear', results: '{n} cars', no_results: 'No cars match these filters.',
    year: 'Year', km: 'Driven', owners: 'Owners', owner_1: '1st owner', owner_n: '{n}th owner', owner_2: '2nd owner', owner_3: '3rd owner',
    reg: 'Registration', inspection: 'Inspection report', inspection_score: 'Inspection score', accident_free: 'No accident history', service: 'Service history',
    pass: 'Pass', attention: 'Needs attention', reserved: 'Reserved', available: 'Available', sold: 'Sold', waitlist: 'Join waitlist',
    reserved_note: 'This car is reserved. Join the waitlist and we’ll call you if it becomes available.',
    interested_used: 'I’m interested in this car', footer_note: 'Prices are indicative and may change. Brand X is a fictional brand used for demonstration.',
    staff_login: 'Staff sign-in', opt_out: 'Opt out of messages', optout_title: 'You’ve been unsubscribed', optout_body: 'We won’t send you any more messages. We may still call about an open test drive.',
    optout_confirm: 'Stop messages to this number?', optout_btn: 'Yes, stop messages', language: 'हिन्दी', pick_one: 'Select', book_this: 'Book this car',
    emi_from: 'EMI from', loading: 'Loading…', error_title: 'Something went wrong', error_body: 'Please try again in a moment.', retry: 'Try again',
    not_found: 'We couldn’t find that page.', go_home: 'Back to home', back: 'Back', day_today: 'Today', showroom: 'Showroom', hours: 'Open 10:00–18:00',
    when: 'When', your_consultant: 'Your consultant',
    prefilled_for: 'For', all_models: 'All models', from_price_note: 'on-road, Lucknow',
  },
  hi: {
    brand: 'ब्रांड X लखनऊ', nav_new: 'नई कारें', nav_used: 'सर्टिफाइड यूज़्ड', nav_drive: 'टेस्ट ड्राइव', nav_emi: 'EMI',
    hero_title: 'कार चुनिए। टेस्ट ड्राइव बुक कीजिए। फ़ोन की ज़रूरत नहीं।',
    hero_sub: 'आपके शहर की असली ऑन-रोड कीमत, सर्टिफाइड यूज़्ड कारें, और आपकी सुविधा के समय पर टेस्ट ड्राइव।',
    cta_drive: 'टेस्ट ड्राइव बुक करें', cta_browse: 'नई कारें देखें', cta_used: 'सर्टिफाइड यूज़्ड कारें देखें', cta_call: 'कॉल बैक पाएँ',
    from: 'शुरू', on_road: 'ऑन-रोड', ex_showroom: 'एक्स-शोरूम', new_cars: 'नई कारें', used_cars: 'सर्टिफाइड यूज़्ड कारें',
    used_sub: 'हर कार की जाँच होती है और रिपोर्ट आपके आने से पहले उपलब्ध रहती है।', view: 'देखें', see_all: 'सभी देखें',
    why_title: 'हमसे क्यों खरीदें', why1_t: 'असली कीमत', why1_d: 'एक्स-शोरूम से ऑन-रोड तक, आपके शहर के हिसाब से, हर मद अलग।',
    why2_t: 'सिर्फ़ सफ़ाई नहीं, जाँच भी', why2_d: 'हर यूज़्ड कार की 8-पॉइंट जाँच रिपोर्ट उपलब्ध है।',
    why3_t: '5 मिनट में जवाब', why3_d: 'हर पूछताछ सीधे एक नामित कंसल्टेंट तक पहुँचती है।',
    variant: 'वेरिएंट', city: 'शहर', colour: 'रंग', price_breakup: 'ऑन-रोड कीमत का विवरण', total_on_road: 'ऑन-रोड कीमत',
    roadTax: 'रोड टैक्स', insurance: 'बीमा', registration: 'रजिस्ट्रेशन व हैंडलिंग', tcs: 'TCS', accessories: 'एक्सेसरीज़ पैकेज', exShowroom: 'एक्स-शोरूम कीमत',
    valid_until: 'मान्य तिथि', price_disclaimer: 'कीमतें बिना सूचना बदल सकती हैं। अंतिम ऑन-रोड कीमत बुकिंग पर तय होगी।',
    price_expired: 'इस शहर की कीमत अपडेट हो रही है।', price_expired_d: 'आज की ऑन-रोड कीमत हमसे पूछें।', price_missing: 'कीमत पूछने पर',
    specs: 'विशेषताएँ', engine: 'इंजन', power: 'पावर', mileage: 'माइलेज', transmission: 'ट्रांसमिशन', fuel: 'ईंधन', seats: 'सीटें',
    features: 'मुख्य फ़ीचर', emi_title: 'EMI कैलकुलेटर', down_payment: 'डाउन पेमेंट', tenure: 'अवधि', months: 'महीने', interest: 'ब्याज दर (वार्षिक)',
    emi_per_month: 'प्रति माह', emi_note: 'अनुमानित। वास्तविक दर आपके ऋणदाता और प्रोफ़ाइल पर निर्भर है।', loan_amount: 'ऋण राशि',
    name: 'आपका नाम', phone: 'मोबाइल नंबर', email: 'ईमेल (वैकल्पिक)', message: 'कुछ और बताना चाहें? (वैकल्पिक)', send: 'पूछताछ भेजें',
    sending: 'भेज रहे हैं…', consent: 'मैं सहमत हूँ कि Brand X इस पूछताछ के लिए मुझसे संपर्क करे और मेरी जानकारी इसी उद्देश्य से सुरक्षित रखे। मैं कभी भी ऑप्ट-आउट कर सकता/सकती हूँ।',
    privacy: 'गोपनीयता सूचना', thanks_title: 'धन्यवाद, {name}', thanks_body: '{who} 5 मिनट के भीतर आपसे संपर्क करेंगे।', thanks_body2: 'हमने WhatsApp पर पुष्टि भी भेज दी है।',
    thanks_repeat: 'आपकी पूछताछ हमारे पास पहले से है। {who} को सूचित कर दिया गया है।', a_consultant: 'हमारे कंसल्टेंट',
    tradein: 'मेरे पास एक्सचेंज के लिए कार है', tradein_make: 'मेक व मॉडल', tradein_year: 'वर्ष', tradein_km: 'किलोमीटर',
    book_title: 'टेस्ट ड्राइव बुक करें', book_sub: 'कार और समय चुनिए, बस। कॉल की ज़रूरत नहीं।',
    step_car: 'कार चुनें', step_time: 'समय चुनें', step_you: 'आपकी जानकारी', confirm_booking: 'टेस्ट ड्राइव पक्की करें',
    no_slots: 'इस दिन कोई स्लॉट खाली नहीं। कोई और दिन चुनें।', slot_taken: 'बुक', booked_title: 'आपकी बुकिंग पक्की है', booked_sub: 'शोरूम में यह पेज दिखाइए।',
    cancel_drive: 'टेस्ट ड्राइव रद्द करें', cancelled: 'यह टेस्ट ड्राइव रद्द कर दी गई है।', add_cal: 'कृपया वैध ड्राइविंग लाइसेंस साथ लाएँ।', directions: 'शोरूम',
    filter: 'फ़िल्टर', model: 'मॉडल', any: 'कोई भी', max_price: 'अधिकतम कीमत', max_km: 'अधिकतम किमी', clear: 'साफ़ करें', results: '{n} कारें', no_results: 'इन फ़िल्टरों से कोई कार नहीं मिली।',
    year: 'वर्ष', km: 'चली', owners: 'मालिक', owner_1: 'पहला मालिक', owner_n: '{n}वाँ मालिक', owner_2: 'दूसरा मालिक', owner_3: 'तीसरा मालिक',
    reg: 'रजिस्ट्रेशन', inspection: 'जाँच रिपोर्ट', inspection_score: 'जाँच स्कोर', accident_free: 'दुर्घटना का कोई इतिहास नहीं', service: 'सर्विस हिस्ट्री',
    pass: 'ठीक', attention: 'ध्यान देने योग्य', reserved: 'आरक्षित', available: 'उपलब्ध', sold: 'बिक गई', waitlist: 'वेटलिस्ट में जुड़ें',
    reserved_note: 'यह कार आरक्षित है। वेटलिस्ट में जुड़ें, उपलब्ध होने पर हम कॉल करेंगे।',
    interested_used: 'मुझे यह कार पसंद है', footer_note: 'कीमतें अनुमानित हैं और बदल सकती हैं। Brand X एक काल्पनिक ब्रांड है, केवल प्रदर्शन के लिए।',
    staff_login: 'स्टाफ़ साइन-इन', opt_out: 'संदेश बंद करें', optout_title: 'आपके संदेश बंद कर दिए गए हैं', optout_body: 'अब हम आपको संदेश नहीं भेजेंगे। खुली टेस्ट ड्राइव के बारे में हम कॉल कर सकते हैं।',
    optout_confirm: 'इस नंबर पर संदेश बंद करें?', optout_btn: 'हाँ, संदेश बंद करें', language: 'English', pick_one: 'चुनें', book_this: 'यह कार बुक करें',
    emi_from: 'EMI शुरू', loading: 'लोड हो रहा है…', error_title: 'कुछ गड़बड़ हो गई', error_body: 'कृपया थोड़ी देर में फिर कोशिश करें।', retry: 'फिर कोशिश करें',
    not_found: 'यह पेज नहीं मिला।', go_home: 'होम पर लौटें', back: 'वापस', day_today: 'आज', showroom: 'शोरूम', hours: 'सुबह 10 से शाम 6 बजे तक',
    when: 'कब', your_consultant: 'आपके कंसल्टेंट',
    prefilled_for: 'के लिए', all_models: 'सभी मॉडल', from_price_note: 'ऑन-रोड, लखनऊ',
  },
};

export async function getLang() {
  const v = (await cookies()).get('bx_lang')?.value;
  return v === 'hi' ? 'hi' : 'en';
}

/** Translator for a language. t('key', {n: 3}) replaces {n}. Falls back to English, then the key. */
export function makeT(lang) {
  return (key, vars) => {
    let s = dict[lang]?.[key] ?? dict.en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
    return s;
  };
}

/** Subset of strings for client components (keeps the client bundle small). */
export function pick(lang, keys) {
  const t = makeT(lang);
  return Object.fromEntries(keys.map((k) => [k, t(k)]));
}

export const maskReg = (reg) => `${String(reg).replace(/\s+/g, ' ').slice(0, 4)} ••••••`;
