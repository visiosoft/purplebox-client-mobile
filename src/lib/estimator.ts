/** Rough floor space (sq ft) each item takes once stored, with stacking. Good enough to pick a size; not a survey. */
export type EstimateItem = { key: string; label: string; sqft: number; group: 'Boxes' | 'Bedroom' | 'Living' | 'Kitchen & other' };

export const ITEMS: EstimateItem[] = [
  { key: 'box', label: 'Boxes (per 10)', sqft: 2, group: 'Boxes' },
  { key: 'bag', label: 'Large bags / suitcases', sqft: 1.5, group: 'Boxes' },
  { key: 'single', label: 'Single bed', sqft: 8, group: 'Bedroom' },
  { key: 'double', label: 'Double / queen bed', sqft: 12, group: 'Bedroom' },
  { key: 'king', label: 'King bed', sqft: 15, group: 'Bedroom' },
  { key: 'wardrobe', label: 'Wardrobe', sqft: 6, group: 'Bedroom' },
  { key: 'drawers', label: 'Chest of drawers', sqft: 4, group: 'Bedroom' },
  { key: 'sofa2', label: '2-seater sofa', sqft: 8, group: 'Living' },
  { key: 'sofa3', label: '3-seater sofa', sqft: 12, group: 'Living' },
  { key: 'armchair', label: 'Armchair', sqft: 4, group: 'Living' },
  { key: 'tv', label: 'TV & unit', sqft: 4, group: 'Living' },
  { key: 'shelf', label: 'Bookcase / shelf', sqft: 4, group: 'Living' },
  { key: 'dining', label: 'Dining table & chairs', sqft: 12, group: 'Kitchen & other' },
  { key: 'fridge', label: 'Fridge', sqft: 5, group: 'Kitchen & other' },
  { key: 'washer', label: 'Washing machine', sqft: 4, group: 'Kitchen & other' },
  { key: 'desk', label: 'Desk', sqft: 6, group: 'Kitchen & other' },
  { key: 'bike', label: 'Bicycle', sqft: 3, group: 'Kitchen & other' },
];

/** Leave a little room to walk in and reach things. */
export const WALK_SPACE = 1.15;

export const estimateSqft = (counts: Record<string, number>) =>
  Math.ceil(ITEMS.reduce((sum, i) => sum + (counts[i.key] ?? 0) * i.sqft, 0) * WALK_SPACE);

/** The smallest available size that holds `need`, or null when even the biggest is too small. */
export const pickSize = <T extends { sizeSqf: number }>(sizes: T[], need: number): T | null =>
  [...sizes].sort((a, b) => a.sizeSqf - b.sizeSqf).find((s) => s.sizeSqf >= need) ?? null;
