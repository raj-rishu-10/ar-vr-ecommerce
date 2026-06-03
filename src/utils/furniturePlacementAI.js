/**
 * furniturePlacementAI.js
 *
 * Rule-based + heuristic AI that maps free floor zones to product
 * recommendations. Zones closer to walls get large/tall items;
 * center zones get accent pieces.
 */

// COCO/ADE20K label → furniture category
const LABEL_CATEGORY = {
  couch: 'sofa', sofa: 'sofa',
  chair: 'chair', bench: 'chair',
  bed: 'bed',
  'dining table': 'table', table: 'table', desk: 'table',
  tv: 'media', laptop: 'media',
  'potted plant': 'accent', vase: 'accent', clock: 'accent',
  bookshelf: 'storage', cabinet: 'storage', shelf: 'storage',
};

// Priority: how much we want each category in a typical room
const CATEGORY_PRIORITY = {
  sofa: 10, table: 8, chair: 7, bed: 9, storage: 5, media: 4, accent: 3,
};

// Physical footprint estimates (w × d in metres) per category
const CATEGORY_SIZE = {
  sofa: [2.2, 0.95], table: [1.4, 0.9], chair: [0.65, 0.65],
  bed: [1.8, 2.1], storage: [1.0, 0.45], media: [1.2, 0.4], accent: [0.4, 0.4],
};

/** Detect which categories are already detected in the room */
function detectedCategories(detections) {
  const cats = new Set();
  for (const d of (detections || [])) {
    const c = LABEL_CATEGORY[(d.label || '').toLowerCase()];
    if (c) cats.add(c);
  }
  return cats;
}

/** Map a product to its likely furniture category */
function productCategory(product) {
  const name = (product.name || product.category || '').toLowerCase();
  for (const [kw, cat] of Object.entries(LABEL_CATEGORY)) {
    if (name.includes(kw)) return cat;
  }
  if (name.includes('sofa') || name.includes('couch')) return 'sofa';
  if (name.includes('chair') || name.includes('stool')) return 'chair';
  if (name.includes('table') || name.includes('desk')) return 'table';
  if (name.includes('bed') || name.includes('mattress')) return 'bed';
  if (name.includes('shelf') || name.includes('cabinet') || name.includes('drawer')) return 'storage';
  if (name.includes('lamp') || name.includes('light') || name.includes('plant')) return 'accent';
  return 'accent'; // default
}

/** Rotation heuristic: large items face center (0), accent pieces face inward */
function suggestRotation(zone, category) {
  // Items against far wall face the viewer
  if (zone.z > 3) return Math.PI;
  // Left-side items
  if (zone.x < -1.5) return Math.PI / 2;
  // Right-side items
  if (zone.x > 1.5) return -Math.PI / 2;
  return 0;
}

/**
 * Main export
 *
 * @param {Array}  products   – full product catalog (with .glbModel)
 * @param {Array}  zones      – from generateFreeZones()
 * @param {Array}  detections – YOLO detections (to avoid duplicating existing furniture)
 * @returns {Array} suggestions [{product, position:[x,y,z], rotationY, zone}]
 */
export function suggestPlacements(products, zones, detections = []) {
  const arProducts = products.filter(p => p.glbModel);
  if (arProducts.length === 0 || zones.length === 0) return [];

  const existingCats = detectedCategories(detections);

  // Score products by priority + absence from room
  const scored = arProducts.map(p => {
    const cat = productCategory(p);
    const alreadyPresent = existingCats.has(cat) ? 0.4 : 1.0;
    const priority = CATEGORY_PRIORITY[cat] || 2;
    return { product: p, cat, score: priority * alreadyPresent };
  });
  scored.sort((a, b) => b.score - a.score);

  const suggestions = [];
  const usedZones  = new Set();
  const usedCats   = new Set();

  for (const { product, cat } of scored) {
    if (suggestions.length >= Math.min(5, zones.length)) break;
    if (usedCats.has(cat) && usedCats.size < 4) continue; // spread categories first

    // Find best unused zone with enough clearance
    const [needW, needD] = CATEGORY_SIZE[cat] || [0.8, 0.8];
    const zone = zones.find((z, i) => {
      if (usedZones.has(i)) return false;
      // simple clearance check
      return z.halfW * 2 >= needW * 0.6 || z.halfD * 2 >= needD * 0.6;
    });
    if (!zone) continue;

    const zoneIdx = zones.indexOf(zone);
    usedZones.add(zoneIdx);
    usedCats.add(cat);

    suggestions.push({
      product,
      position: [zone.x, 0, zone.z],
      rotationY: suggestRotation(zone, cat),
      zone,
      instanceId: `ai-${crypto.randomUUID()}`,
      isAISuggestion: true,
    });
  }

  return suggestions;
}
