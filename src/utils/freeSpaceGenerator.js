/**
 * freeSpaceGenerator.js
 *
 * Converts segmentation masks + YOLO bounding boxes into
 * an array of placeable 3D zones on the floor.
 *
 * Coordinate system:  X = left-right, Z = depth, Y = 0 (floor)
 * Image origin = top-left.  Camera at Z≈0 looking toward +Z.
 */

const FLOOR_LABELS = ['floor', 'rug', 'mat', 'carpet', 'ground'];
const WALL_LABELS  = ['wall', 'ceiling', 'window', 'door'];

/** Pixel → 3D (simple perspective projection)
 *  imgW/H = source image size
 *  depth  = normalized 0..1 (0=near, 1=far)  → mapped to 1..8 m
 */
function pixelTo3D(px, py, imgW, imgH, depthNorm = 0.5) {
  const z = 1 + depthNorm * 7;             // 1 – 8 m
  const hFov = Math.tan((60 * Math.PI) / 360); // 60° FOV
  const x = ((px / imgW) - 0.5) * 2 * z * hFov;
  return { x, z };
}

/** Build a simple floor mask from SegFormer output */
function buildFloorMask(masks, imgW, imgH) {
  const floorMask = new Uint8Array(imgW * imgH);

  if (!masks || masks.length === 0) {
    // Fallback: mark bottom 40% of image as floor
    const startY = Math.floor(imgH * 0.6);
    for (let y = startY; y < imgH; y++) {
      for (let x = 0; x < imgW; x++) {
        floorMask[y * imgW + x] = 1;
      }
    }
    return floorMask;
  }

  for (const m of masks) {
    const lbl = (m.label || '').toLowerCase();
    if (FLOOR_LABELS.some(f => lbl.includes(f))) {
      if (m.mask?.data) {
        const scaleX = imgW / m.mask.width;
        const scaleY = imgH / m.mask.height;
        for (let my = 0; my < m.mask.height; my++) {
          for (let mx = 0; mx < m.mask.width; mx++) {
            if (m.mask.data[my * m.mask.width + mx] > 0) {
              const fy = Math.min(imgH - 1, Math.floor(my * scaleY));
              const fx = Math.min(imgW - 1, Math.floor(mx * scaleX));
              floorMask[fy * imgW + fx] = 1;
            }
          }
        }
      }
    }
  }
  return floorMask;
}

/** Mark pixels under YOLO boxes as occupied */
function applyOccupancy(floorMask, detections, imgW, imgH) {
  const occupied = new Uint8Array(floorMask);
  for (const det of (detections || [])) {
    const box = det.box;
    if (!box) continue;
    // Expand box slightly downward (contact zone on floor)
    const x0 = Math.max(0, Math.floor(box.xmin));
    const x1 = Math.min(imgW - 1, Math.ceil(box.xmax));
    const yBottom = Math.min(imgH - 1, Math.ceil(box.ymax));
    const yTop    = Math.max(0, Math.floor(box.ymax - (box.ymax - box.ymin) * 0.25));
    for (let y = yTop; y <= yBottom; y++) {
      for (let x = x0; x <= x1; x++) {
        occupied[y * imgW + x] = 0;
      }
    }
  }
  return occupied;
}

/** Extract depth for a pixel region (average) */
function sampleDepth(depthData, px, py, imgW, imgH, radius = 8) {
  if (!depthData?.data) return 0.5;
  const dW = depthData.width  || imgW;
  const dH = depthData.height || imgH;
  const scaleX = dW / imgW;
  const scaleY = dH / imgH;
  let sum = 0, count = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const sx = Math.min(dW - 1, Math.max(0, Math.round(px * scaleX + dx)));
      const sy = Math.min(dH - 1, Math.max(0, Math.round(py * scaleY + dy)));
      sum += depthData.data[sy * dW + sx] || 0;
      count++;
    }
  }
  return count > 0 ? sum / count : 0.5;
}

/** Cluster free pixels into grid zones */
function clusterZones(freeMask, imgW, imgH, depthData, GRID = 6) {
  const cellW = imgW / GRID;
  const cellH = imgH / GRID;
  const zones = [];

  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const x0 = Math.floor(gx * cellW);
      const x1 = Math.floor((gx + 1) * cellW);
      const y0 = Math.floor(gy * cellH);
      const y1 = Math.floor((gy + 1) * cellH);

      let freeCount = 0, total = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          total++;
          if (freeMask[y * imgW + x]) freeCount++;
        }
      }

      const coverage = freeCount / total;
      if (coverage < 0.35) continue; // skip mostly-occupied cells

      const cx = Math.floor((x0 + x1) / 2);
      const cy = Math.floor((y0 + y1) / 2);
      const depthNorm = sampleDepth(depthData, cx, cy, imgW, imgH);
      const { x, z } = pixelTo3D(cx, cy, imgW, imgH, depthNorm);

      zones.push({
        x,
        y: 0,
        z,
        score: coverage,
        // physical half-extents for clearance check
        halfW: Math.abs(pixelTo3D(x1, cy, imgW, imgH, depthNorm).x - pixelTo3D(x0, cy, imgW, imgH, depthNorm).x) / 2,
        halfD: 0.5,
      });
    }
  }

  // Sort by coverage score descending
  return zones.sort((a, b) => b.score - a.score);
}

/**
 * Main export
 * @param {object} opts
 * @param {any}    opts.depthResult  – raw depthWorker RESULT
 * @param {Array}  opts.masks        – SegFormer masks array
 * @param {Array}  opts.detections   – YOLO/DETR boxes array
 * @param {number} opts.imgW
 * @param {number} opts.imgH
 * @returns {Array} zones []
 */
export function generateFreeZones({ depthResult, masks, detections, imgW, imgH }) {
  const depthData =
    depthResult && depthResult !== 'fallback-simulation'
      ? depthResult?.depth
      : null;

  const floorMask  = buildFloorMask(masks, imgW, imgH);
  const freeMask   = applyOccupancy(floorMask, detections, imgW, imgH);
  const zones      = clusterZones(freeMask, imgW, imgH, depthData);

  return zones;
}
