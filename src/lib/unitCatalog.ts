/**
 * What each unit size looks like and what fits in it, as shown on purplebox.ae. Prices and availability are NOT here:
 * those come live from the server; `from` is only a fallback when the server can't be reached.
 */
export type CatalogUnit = { sizeSqf: number; img: string; home: string; fits: string; from: number; popular?: boolean };

const IMG = 'https://purplebox.ae/wp-content/uploads/2026/05';

export const UNIT_CATALOG: CatalogUnit[] = [
  { sizeSqf: 10, img: `${IMG}/10_sq_.jpg`, home: 'Boxes & suitcases', from: 350, fits: 'Around 15–20 boxes, suitcases and documents. No large furniture — think of it as a large closet.' },
  { sizeSqf: 25, img: `${IMG}/25_sq.jpg`, home: 'Studio / 1BHK', from: 650, fits: 'A 1-bedroom apartment: bed frame, mattress, small wardrobe, a few chairs and roughly 20 boxes.' },
  { sizeSqf: 35, img: `${IMG}/unit3.webp`, home: 'Full 1BHK apartment', from: 770, fits: 'Spacious enough for a full 1-bedroom apartment.' },
  { sizeSqf: 50, img: `${IMG}/50_sq.jpg`, home: '1BHK + spare room', from: 980, popular: true, fits: 'A full 1-bedroom apartment with walking space left over — the right pick if you visit often.' },
  { sizeSqf: 75, img: `${IMG}/75_sq_.jpg`, home: '2–3BHK apartment', from: 1400, popular: true, fits: 'A 2–3 bedroom apartment: sofas, beds, wardrobes, fridge, washing machine, dining set and 40+ boxes.' },
  { sizeSqf: 100, img: `${IMG}/100_sq.jpg`, home: '3BHK / small villa', from: 1700, fits: 'A small villa or 3-bed home: three bedrooms, full living and dining rooms, white goods, bicycles and boxes.' },
  { sizeSqf: 150, img: `${IMG}/150_sq.jpg`, home: '4BHK villa', from: 2600, fits: 'A four-bedroom villa, or office furniture and business stock with room to move around.' },
  { sizeSqf: 200, img: `${IMG}/200_sq.jpg`, home: '4–5BHK villa', from: 3300, fits: 'Everything from a large villa, comfortably, with space to walk around inside the unit.' },
];

export const catalogFor = (sizeSqf: number) => UNIT_CATALOG.find((u) => u.sizeSqf === sizeSqf);
