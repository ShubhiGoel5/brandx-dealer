// Demo data. ALL of it is fictional (Brand X, invented prices, invented people, test email domain).
// The three stock rows from the brief (NEW-H-02, UC-1182, UC-1190) are reproduced exactly.
import bcrypt from 'bcryptjs';
import { createLead, logEvent } from './leads.js';
import { buildContext } from './ai.js';
import { analyseWithRules } from './ai-rules.js';
import { addDays, istDate } from './slots.js';
import { slugify } from './format.js';

const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'Demo@1234';

const COLOURS = {
  white: { name: 'Pearl White', hex: '#e9e7e1' }, silver: { name: 'Lunar Silver', hex: '#b9bdc2' },
  grey: { name: 'Graphite Grey', hex: '#4b4f55' }, black: { name: 'Obsidian Black', hex: '#17181a' },
  red: { name: 'Ember Red', hex: '#9b2226' }, blue: { name: 'Deep Ocean', hex: '#243b6b' },
  green: { name: 'Forest Green', hex: '#2f5d50' },
};
const C = (...k) => JSON.stringify(k.map((x) => COLOURS[x]));

// Small deterministic PRNG so seeded past sales are the same on every machine.
function prng(seed) { let s = seed; return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296); }

export function seed(d, now = new Date()) {
  const iso = (x) => x.toISOString();
  const tx = d.transaction(() => {
    // ---- places ----------------------------------------------------------------------------
    const city = d.prepare('INSERT INTO cities (id, name, slug) VALUES (?,?,?)');
    [[1, 'Lucknow'], [2, 'Kanpur'], [3, 'Varanasi']].forEach(([id, n]) => city.run(id, n, slugify(n)));
    const sr = d.prepare('INSERT INTO showrooms (id, name, city_id, kind, address, phone) VALUES (?,?,?,?,?,?)');
    sr.run(1, 'Brand X Gomti Nagar', 1, 'showroom', 'Vibhuti Khand, Gomti Nagar, Lucknow', '0522-4000101');
    sr.run(2, 'Brand X Kanpur Road', 1, 'showroom', 'Kanpur Road, Alambagh, Lucknow', '0522-4000102');
    sr.run(3, 'Brand X Swaroop Nagar', 2, 'showroom', 'Swaroop Nagar, Kanpur', '0512-4000103');
    sr.run(4, 'Brand X Certified Used Cars', 1, 'yard', 'Sarojini Nagar, Lucknow', '0522-4000104');

    // ---- models & variants -----------------------------------------------------------------
    const mi = d.prepare('INSERT INTO models (id, slug, name, tagline_en, tagline_hi, body, seats, about_en, about_hi, colours, sort) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    mi.run(1, 'model-h', 'Model H', 'Quietly composed.', 'शांत, सधी हुई।', 'sedan', 5,
      'A refined sedan for the daily commute and the long weekend drive. Calm cabin, effortless automatic, and boot space that takes a family’s luggage.',
      'रोज़ के सफ़र और लंबे वीकेंड ड्राइव के लिए एक परिष्कृत सेडान। शांत केबिन, आसान ऑटोमैटिक और परिवार के सामान के लिए बड़ा बूट।', C('white', 'silver', 'grey', 'blue'), 1);
    mi.run(2, 'model-c', 'Model C', 'Sharp in the city. Sure on the highway.', 'शहर में तेज़, हाईवे पर भरोसेमंद।', 'suv', 5,
      'A compact SUV with a high seating position, strong diesel torque and the ground clearance Uttar Pradesh roads ask for.',
      'ऊँची सीटिंग, दमदार डीज़ल टॉर्क और उत्तर प्रदेश की सड़कों के लिए ज़रूरी ग्राउंड क्लीयरेंस वाली कॉम्पैक्ट एसयूवी।', C('white', 'red', 'black', 'green'), 2);
    mi.run(3, 'model-s', 'Model S', 'Easy to own. Easy to love.', 'रखना आसान, चलाना आसान।', 'hatch', 5,
      'A light, frugal hatchback made for tight lanes and tighter budgets, without feeling basic.',
      'तंग गलियों और सीमित बजट के लिए हल्की, किफ़ायती हैचबैक, फिर भी बेसिक नहीं।', C('red', 'white', 'silver', 'blue'), 3);
    mi.run(4, 'model-e', 'Model E', 'Room for everyone. Presence for you.', 'सबके लिए जगह। आपके लिए रुतबा।', 'suv', 7,
      'A seven-seat SUV that keeps the third row usable and the second row comfortable on long trips.',
      'सात सीटों वाली एसयूवी जिसमें तीसरी पंक्ति भी आरामदायक है और लंबे सफ़र में दूसरी पंक्ति भी।', C('black', 'white', 'grey'), 4);

    // Demo photography (third-party press images, demonstration only: see TDD). Model S is a cut-out on white.
    const setPhoto = d.prepare('UPDATE models SET photo = ?, photo_fit = ? WHERE id = ?');
    setPhoto.run('/cars/model-h.webp', 'cover', 1); setPhoto.run('/cars/model-c.webp', 'cover', 2);
    setPhoto.run('/cars/model-s.png', 'contain', 3); setPhoto.run('/cars/model-e.webp', 'cover', 4);

    const vi = d.prepare('INSERT INTO variants (id, model_id, name, fuel, transmission, engine, power, mileage, features, sort) VALUES (?,?,?,?,?,?,?,?,?,?)');
    const F = (...a) => JSON.stringify(a);
    const variants = [
      [1, 1, 'LX', 'Petrol', 'Manual', '1.5 L petrol', '121 PS', '17.8 kmpl', F('6 airbags', '8" touchscreen', 'Rear parking sensors', 'Cruise control'), 1],
      [2, 1, 'VX', 'Petrol', 'Manual', '1.5 L petrol', '121 PS', '17.8 kmpl', F('6 airbags', '10" touchscreen', 'Sunroof', 'Rear camera', 'Wireless charging'), 2],
      [3, 1, 'ZX automatic', 'Petrol', 'Automatic', '1.5 L petrol', '121 PS', '18.4 kmpl', F('6 airbags', '10" touchscreen', 'Sunroof', '360° camera', 'Ventilated seats', 'Adaptive cruise'), 3],
      [4, 2, 'LX', 'Petrol', 'Manual', '1.2 L turbo petrol', '110 PS', '18.2 kmpl', F('6 airbags', '8" touchscreen', 'Rear parking sensors'), 1],
      [5, 2, 'VX', 'Diesel', 'Manual', '1.5 L diesel', '116 PS', '21.0 kmpl', F('6 airbags', '10" touchscreen', 'Sunroof', 'Rear camera', 'Hill-hold'), 2],
      [6, 2, 'ZX automatic', 'Diesel', 'Automatic', '1.5 L diesel', '116 PS', '19.6 kmpl', F('6 airbags', '10" touchscreen', 'Panoramic sunroof', '360° camera', 'Ventilated seats'), 3],
      [7, 3, 'LX', 'Petrol', 'Manual', '1.0 L petrol', '67 PS', '22.4 kmpl', F('2 airbags', '7" touchscreen', 'Rear parking sensors'), 1],
      [8, 3, 'VX automatic', 'Petrol', 'Automatic', '1.0 L petrol', '67 PS', '21.7 kmpl', F('6 airbags', '8" touchscreen', 'Rear camera', 'Cruise control'), 2],
      [9, 4, 'VX', 'Petrol', 'Manual', '1.5 L petrol', '138 PS', '15.6 kmpl', F('6 airbags', '10" touchscreen', 'Third-row AC vents', 'Rear camera'), 1],
      [10, 4, 'ZX automatic', 'Diesel', 'Automatic', '2.0 L diesel', '170 PS', '16.3 kmpl', F('7 airbags', '12" touchscreen', 'Panoramic sunroof', '360° camera', 'Captain seats'), 2],
    ];
    variants.forEach((v) => vi.run(...v));

    // ---- price table (the single source of truth for on-road prices) -----------------------
    // New-car ex-showroom values are invented, except Model H ZX automatic = ₹12,45,000 from the brief.
    const exShowroom = { 1: 1085000, 2: 1165000, 3: 1245000, 4: 899000, 5: 1049000, 6: 1349000, 7: 659000, 8: 779000, 9: 1449000, 10: 1849000 };
    const cityFactor = { 1: { ins: 1, reg: 6500 }, 2: { ins: 0.985, reg: 6500 }, 3: { ins: 0.96, reg: 7000 } };
    const validUntil = addDays(istDate(now), 30);
    const yesterday = addDays(istDate(now), -1);
    const pr = d.prepare(`INSERT INTO price_rules (variant_id, city_id, ex_showroom, road_tax_pct, insurance, registration, tcs_pct, accessories, valid_until, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`);
    for (const v of variants) {
      for (const c of [1, 2, 3]) {
        const ex = exShowroom[v[0]];
        const insurance = Math.round((ex * 0.031 * cityFactor[c].ins) / 100) * 100;
        // Illustrative rule used here: 8% road tax up to ₹10 lakh, 10% above; TCS 1% above ₹10 lakh.
        // Demo data: Model E ZX in Varanasi is deliberately EXPIRED to show the "ask for today's price" state.
        const expired = v[0] === 10 && c === 3;
        pr.run(v[0], c, ex, ex > 1000000 ? 10 : 8, insurance, cityFactor[c].reg, ex > 1000000 ? 1 : 0, 12000 + (v[0] % 4) * 4000,
          expired ? yesterday : validUntil, iso(now));
      }
    }

    // ---- people ----------------------------------------------------------------------------
    const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
    const ui = d.prepare('INSERT INTO users (id, name, email, password_hash, role, showroom_id) VALUES (?,?,?,?,?,?)');
    ui.run(1, 'Priya Nair', 'admin@brandx-demo.test', hash, 'admin', null);
    ui.run(2, 'Rakesh Tandon', 'used@brandx-demo.test', hash, 'used_manager', 4);
    const consultants = [
      [3, 'Aarav Mishra', 'aarav@brandx-demo.test', 1, [1, 2]],
      [4, 'Neha Verma', 'neha@brandx-demo.test', 1, [3, 4]],
      [5, 'Imran Khan', 'imran@brandx-demo.test', 2, [2, 4]],
      [6, 'Kavita Singh', 'kavita@brandx-demo.test', 2, [1, 3]],
      [7, 'Rohit Yadav', 'rohit@brandx-demo.test', 3, [1, 2, 3, 4]],
      [8, 'Sanjay Gupta', 'sanjay@brandx-demo.test', 4, [1, 2, 3, 4]],
    ];
    const cm = d.prepare('INSERT INTO consultant_models (user_id, model_id) VALUES (?,?)');
    for (const [id, name, email, sid, ms] of consultants) { ui.run(id, name, email, hash, 'consultant', sid); ms.forEach((m) => cm.run(id, m)); }

    // ---- demo cars -------------------------------------------------------------------------
    const dc = d.prepare('INSERT INTO demo_cars (showroom_id, variant_id, colour, label) VALUES (?,?,?,?)');
    [[1, 3, 'Pearl White'], [1, 5, 'Ember Red'], [1, 8, 'Lunar Silver'], [2, 6, 'Obsidian Black'], [2, 10, 'Graphite Grey'], [2, 2, 'Deep Ocean'],
      [3, 1, 'Lunar Silver'], [3, 5, 'Forest Green'], [3, 7, 'Ember Red'], [3, 9, 'Obsidian Black']]
      .forEach(([s, v, col]) => {
        const row = variants.find((x) => x[0] === v);
        const model = ['', 'Model H', 'Model C', 'Model S', 'Model E'][row[1]];
        dc.run(s, v, col, `${model} ${row[2]} · ${row[3]}`);
      });

    // ---- used cars (+ past sales for the manager-only price band) --------------------------
    const insp = (score, attention = {}) => JSON.stringify({
      score, accidentFree: !attention.accident, serviceHistory: attention.noService ? 'Partial' : 'Full, at authorised workshop',
      inspectedOn: addDays(istDate(now), -3),
      areas: ['Engine', 'Transmission', 'Brakes', 'Suspension', 'Tyres', 'Electricals', 'Interior', 'Body & paint'].map((a) =>
        attention[a] ? { area: a, ok: false, note: attention[a] } : { area: a, ok: true, note: 'Pass' }),
    });
    const ui2 = d.prepare(`INSERT INTO used_cars (stock_id, slug, model_id, variant, fuel, transmission, year, km, owners, price, colour, reg_no, location_id, status, inspection, notes, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const used = [
      ['UC-1163', 'Model H', 1, 'ZX automatic', 'Petrol', 'Automatic', 2022, 33800, 1, 1075000, 'Pearl White', 'UP32 KN 4417', 'available', insp(9.1), ''],
      ['UC-1171', 'Model C', 2, 'ZX automatic', 'Diesel', 'Automatic', 2021, 62100, 2, 985000, 'Obsidian Black', 'UP32 JK 8820', 'available', insp(8.4, { Tyres: 'Front tyres at 40% — replacement advised', 'Body & paint': 'Minor scratch, rear bumper' }), ''],
      ['UC-1175', 'Model E', 4, 'VX', 'Petrol', 'Manual', 2023, 14200, 1, 1325000, 'Graphite Grey', 'UP78 AB 1203', 'available', insp(9.4), ''],
      ['UC-1182', 'Model C', 2, 'VX', 'Diesel', 'Manual', 2022, 41200, 1, 845000, 'Ember Red', 'UP32 LM 5531', 'available', insp(8.9, { Tyres: 'Tyres at 60% life' }), ''],
      ['UC-1190', 'Model S', 3, 'LX', 'Petrol', 'Manual', 2021, 58600, 2, 512000, 'Lunar Silver', 'UP32 HR 2096', 'booked', insp(8.2, { Brakes: 'Rear pads due within 5,000 km', 'Body & paint': 'Repainted rear door (disclosed)' }), ''],
      ['UC-1194', 'Model S', 3, 'VX automatic', 'Petrol', 'Automatic', 2022, 27500, 1, 598000, 'Ember Red', 'UP32 NP 7745', 'available', insp(9.0), ''],
      ['UC-1198', 'Model C', 2, 'LX', 'Petrol', 'Manual', 2020, 71400, 2, 585000, 'Pearl White', 'UP78 CD 9012', 'available', insp(7.9, { Suspension: 'Front bushes worn — replaced before sale', Interior: 'Seat fabric wear, driver side' }), ''],
      ['UC-1201', 'Model H', 1, 'LX', 'Petrol', 'Manual', 2020, 66200, 3, 655000, 'Lunar Silver', 'UP32 GT 3380', 'available', insp(7.8, { noService: true, Interior: 'Dashboard scuffs' }), ''],
      ['UC-1205', 'Model C', 2, 'VX', 'Diesel', 'Manual', 2021, 52800, 1, 812000, 'Forest Green', 'UP32 KV 6614', 'available', insp(8.6), ''],
    ];
    for (const u of used) {
      ui2.run(u[0], slugify(`${u[6]} ${u[1]} ${u[3]} ${u[4]} ${u[0]}`), u[2], u[3], u[4], u[5], u[6], u[7], u[8], u[9], u[10], u[11], 4, u[12], u[13], u[14], iso(now));
    }

    // Past sales around each listing. Few comparables for some models on purpose (shows the "can't suggest" state).
    const rnd = prng(42);
    const ps = d.prepare('INSERT INTO past_sales (model_id, variant, fuel, year, km, sold_price, sold_on) VALUES (?,?,?,?,?,?,?)');
    const groups = [[2, 'VX', 'Diesel', 2022, 41000, 845000, 8], [3, 'LX', 'Petrol', 2021, 58000, 512000, 4], [1, 'ZX automatic', 'Petrol', 2022, 34000, 1075000, 3],
      [1, 'LX', 'Petrol', 2020, 66000, 655000, 3], [2, 'ZX automatic', 'Diesel', 2021, 62000, 985000, 2], [2, 'LX', 'Petrol', 2020, 71000, 585000, 3],
      [3, 'VX automatic', 'Petrol', 2022, 27000, 598000, 3]];
    for (const [m, variant, fuel, yr, kmBase, price, n] of groups) {
      for (let i = 0; i < n; i++) {
        const year = yr + [0, 1, -1][i % 3];
        const km = Math.max(5000, Math.round((kmBase + (rnd() - 0.5) * 24000) / 100) * 100);
        const sold = price - (km - kmBase) * 4 + (year - yr) * 0.06 * price + (rnd() - 0.5) * 0.03 * price;
        ps.run(m, variant, fuel, year, km, Math.round(sold / 1000) * 1000, addDays(istDate(now), -20 - i * 17));
      }
    }

    // ---- leads (created relative to "now" so the response timers are live) ------------------
    const mins = (n) => new Date(now.getTime() - n * 60000);
    const seedLeads = [
      // [name, phone, source, model, variant, city, used, message, lang, ageMin, status, respondedAfterMin]
      ['Anil Srivastava', '9839012345', 'web', 1, 3, 1, null, 'Looking at the ZX automatic for my wife. Budget around 15 lakh on road. Can we see it this weekend?', 'en', 2, 'new', null],
      ['Meera Joshi', '9415098765', 'cardekho', 2, null, 1, null, 'Need a diesel SUV, mostly highway. Please call.', 'en', 9, 'new', null],
      ['Farhan Qureshi', '9935544332', 'web', 4, 10, 1, null, 'Seven-seater for family of 6. Want to book urgently, exchange my old Model C 2017 also.', 'en', 14, 'new', null],
      ['सुनीता वर्मा', '9450011223', 'web', 3, null, 2, null, 'मुझे हैचबैक चाहिए, बजट 7 लाख तक। EMI कितनी होगी?', 'hi', 4, 'new', null],
      ['Deepak Pandey', '9918877665', 'carwale', null, null, 1, null, '', 'en', 31, 'new', null],
      ['Ritu Agarwal', '9889900112', 'web', 2, 5, 1, 4, 'Is this one still available? Can I see the inspection report?', 'en', 55, 'contacted', 3],
      ['Karan Malhotra', '9795566778', 'web', 1, 2, 1, null, 'Comparing with other sedans. Send details.', 'en', 180, 'contacted', 4],
      ['Vikas Tiwari', '9936677889', 'facebook', 3, 8, 2, null, 'Interested in the automatic Model S. Finance options?', 'en', 300, 'test_drive', 2],
      ['Shalini Dubey', '9453322110', 'web', 2, 6, 1, null, 'Ready to buy this month. Want final on-road price.', 'en', 1500, 'negotiation', 11],
      ['Mohit Saxena', '9838844556', 'walk-in', 1, 1, 1, null, 'Walked in, wants LX for his father.', 'en', 2900, 'won', 1],
      ['Pooja Rastogi', '9415566770', 'web', 3, 7, 3, null, 'Just checking prices.', 'en', 3100, 'lost', 26],
      ['Zoya Ansari', '9838123456', 'instagram', 4, 9, 1, null, 'Want to see Model E in black. Kids seats compatible?', 'en', 20, 'new', null],
    ];
    for (const [name, phone, source, model, variant, cityId, usedId, message, lang, age, status, respAfter] of seedLeads) {
      const created = mins(age);
      const out = createLead(d, { name, phone, email: null, message, model_id: model, variant_id: variant, used_car_id: usedId, city_id: cityId, lang, consent: 'on' }, { source, now: created });
      if (status !== 'new') {
        const responded = new Date(created.getTime() + (respAfter ?? 3) * 60000);
        d.prepare('UPDATE leads SET status = ?, first_response_at = ? WHERE id = ?').run(status, iso(responded), out.id);
        logEvent(d, out.id, 'status', `new → ${status}`, d.prepare('SELECT assigned_to FROM leads WHERE id = ?').pluck().get(out.id), responded);
      }
    }
    // One of them has a trade-in and one is an exchange enquiry
    d.prepare("UPDATE leads SET trade_in = ? WHERE name = 'Farhan Qureshi'").run(JSON.stringify({ make: 'Model C', year: 2017, km: 88000 }));

    // pre-computed AI analysis (rule-based; the live app regenerates with Claude when a key is set)
    for (const { id } of d.prepare('SELECT id FROM leads').all()) {
      const ctx = buildContext(d, id, now);
      d.prepare('UPDATE leads SET ai = ? WHERE id = ?').run(JSON.stringify({ ...analyseWithRules(ctx), source: 'rules', generated_at: iso(now) }), id);
    }
  });
  tx();
}
