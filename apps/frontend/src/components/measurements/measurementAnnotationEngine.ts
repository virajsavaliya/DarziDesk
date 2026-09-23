/**
 * Measurement Annotation Engine
 *
 * Professional garment technical drawing annotation layout engine.
 * Mathematical 3-zone layout system:
 * - LEFT ANNOTATION ZONE: Outer whitespace for E, A, M, N, O, I
 * - CENTER ZONE: Mannequin + B (Waist) and C (Hips) centered below lines
 * - RIGHT ANNOTATION ZONE: Outer whitespace for D, K, L, F, G, H, J
 *
 * All labels use the full available canvas whitespace and connect via clean
 * technical drafting leader lines.
 */

// ============================================================
// TYPES
// ============================================================

export type AnnotationSide = 'left' | 'right' | 'center' | 'top' | 'bottom';
export type MeasurementOrientation = 'horizontal' | 'vertical' | 'slanted';

export interface MeasurementGeometry {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  orientation: MeasurementOrientation;
  dashed?: boolean;
  stopLength?: number;
  farSide?: boolean;
  arc?: boolean;
  ring?: boolean;
}

export interface AnnotationPreference {
  preferredSide: AnnotationSide;
  secondarySide?: AnnotationSide;
  priority: number;
  anchorY?: number;
}

export interface AnnotationLabel {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LeaderLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX?: number;
  midY?: number;
  stepped?: boolean;
  isCurved?: boolean;
}

export interface PositionedAnnotation {
  letter: string;
  geometry: MeasurementGeometry;
  label: AnnotationLabel;
  leader: LeaderLine | null;
  side: AnnotationSide;
}

export interface LayoutConfig {
  bodyClearance: number;
  stackGap: number;
  pillHeight: number;
  svgBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export interface VisibleMeasurementInput {
  letter: string;
  value: string | number | null | undefined;
  unit: string;
}

// ============================================================
// ANNOTATION ZONES (Symmetric 286-unit canvas: -40 to 246, center = 103.16)
// ============================================================

export interface ZoneConfig {
  minX: number;
  maxX: number;
  targetX: number;
  align: 'start' | 'end' | 'center';
}

export const ANNOTATION_ZONES: Record<'left' | 'center' | 'right', ZoneConfig> = {
  left: {
    minX: -46,
    maxX: 48,
    targetX: 22, // Right edge of left labels aligns at x=22
    align: 'end',
  },
  center: {
    minX: 84,
    maxX: 122,
    targetX: 103.16, // Center axis of mannequin
    align: 'center',
  },
  right: {
    minX: 154,
    maxX: 252,
    targetX: 160, // Left edge of right labels starts at x=160
    align: 'start',
  },
};

// ============================================================
// DEFAULT CONFIGURATION
// ============================================================

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  bodyClearance: 10,
  stackGap: 6,
  pillHeight: 12.0,
  svgBounds: {
    minX: -46,
    maxX: 252,
    minY: -15,
    maxY: 223,
  },
};

// ============================================================
// BODY PROFILE — Anatomical Silhouette Edges (Head to Feet)
// Models the complete visible human mannequin for strict collision detection
// ============================================================

export const BODY_PROFILE: ReadonlyArray<{ y: number; left: number; right: number }> = [
  { y: -2,  left: 95,  right: 111 },  // Crown / Top of head
  { y: 5,   left: 92,  right: 114 },  // Upper head / Cranium
  { y: 13,  left: 92,  right: 114 },  // Lower head / Jawline
  { y: 22,  left: 95,  right: 111 },  // Neck cylinder top
  { y: 26,  left: 95,  right: 111 },  // Neck cylinder center
  { y: 28,  left: 94,  right: 112 },  // Base of neck / Clavicle
  { y: 32,  left: 77,  right: 129 },  // Shoulders / Acromion tips
  { y: 50,  left: 72,  right: 134 },  // Upper arms / Chest girth
  { y: 60,  left: 69,  right: 137 },  // Mid arms / Elbow rise
  { y: 69,  left: 67,  right: 139 },  // Forearms / Natural Waist level
  { y: 84,  left: 66,  right: 140 },  // Lower forearms
  { y: 96,  left: 66,  right: 140 },  // Above wrists / Hips widest
  { y: 101, left: 64,  right: 142 },  // Wrist joints
  { y: 112, left: 59,  right: 147 },  // Hand fingertips
  { y: 118, left: 86,  right: 120 },  // Hands end, Crotch apex
  { y: 130, left: 88,  right: 118 },  // Mid thighs
  { y: 144, left: 89,  right: 117 },  // Lower thighs
  { y: 158, left: 88,  right: 118 },  // Knees / Patella
  { y: 172, left: 87,  right: 119 },  // Upper calves
  { y: 190, left: 85,  right: 121 },  // Lower calves
  { y: 207, left: 81,  right: 125 },  // Ankles / Feet standing line
];

export const BODY_TOP_Y = -2;
export const BODY_BOTTOM_Y = 207;

/**
 * Interpolates the body silhouette left and right boundaries at any vertical Y level.
 */
export function getBodyEdges(y: number): { left: number; right: number } {
  if (y <= BODY_PROFILE[0].y) {
    return { left: BODY_PROFILE[0].left, right: BODY_PROFILE[0].right };
  }
  const last = BODY_PROFILE[BODY_PROFILE.length - 1];
  if (y >= last.y) {
    return { left: last.left, right: last.right };
  }
  for (let i = 0; i < BODY_PROFILE.length - 1; i++) {
    const a = BODY_PROFILE[i];
    const b = BODY_PROFILE[i + 1];
    if (y >= a.y && y <= b.y) {
      const t = (y - a.y) / (b.y - a.y);
      return {
        left: a.left + t * (b.left - a.left),
        right: a.right + t * (b.right - a.right),
      };
    }
  }
  return { left: 80, right: 126 };
}

// ============================================================
// SACRED ANATOMICAL MEASUREMENT GEOMETRIES & PREFERENCES (A–O)
// The actual physical positions of measurements on the human body
// ============================================================

export interface LandmarkDefinition {
  letter: string;
  name: string;
  geometry: MeasurementGeometry;
  preference: AnnotationPreference;
  dogleg?: { midX: number; midY: number };
  isCurvedLeader?: boolean;
  arc?: boolean;
  ring?: boolean;
}

export const LANDMARK_DEFINITIONS: Record<string, LandmarkDefinition> = {
  // LEFT ANNOTATION ZONE (E, A, M, N, O, I)
  // E — Shoulder Width (upper-left whitespace, leader to left shoulder tip)
  E: {
    letter: 'E',
    name: 'Shoulder Width',
    geometry: { x1: 77, y1: 31, x2: 129, y2: 31, orientation: 'horizontal', stopLength: 2.5 },
    preference: { preferredSide: 'left', priority: 95, anchorY: 22 },
  },
  // A — Chest / Bust (left whitespace, leader to chest line)
  A: {
    letter: 'A',
    name: 'Chest / Bust',
    geometry: { x1: 86, y1: 50, x2: 120, y2: 50, orientation: 'horizontal', stopLength: 2.5 },
    preference: { preferredSide: 'left', priority: 90, anchorY: 46 },
  },
  // M — Sleeve Length (left whitespace, leader to arm sleeve line)
  M: {
    letter: 'M',
    name: 'Sleeve Length',
    geometry: { x1: 77, y1: 31, x2: 66.8, y2: 99.0, orientation: 'slanted', stopLength: 2.5 },
    preference: { preferredSide: 'left', priority: 85, anchorY: 68 },
  },
  // N — Wrist (left whitespace, leader to wrist ring)
  N: {
    letter: 'N',
    name: 'Wrist',
    geometry: { x1: 66.8, y1: 99.0, x2: 74.7, y2: 100.5, orientation: 'horizontal', ring: true, stopLength: 1.5 },
    preference: { preferredSide: 'left', priority: 80, anchorY: 96 },
    dogleg: { midX: 52, midY: 96 },
  },
  // O — Waist to Floor (far-left vertical datum line at x = -24)
  O: {
    letter: 'O',
    name: 'Waist to Floor',
    geometry: { x1: -24, y1: 69, x2: -24, y2: 207, orientation: 'vertical', farSide: true, stopLength: 3.0 },
    preference: { preferredSide: 'left', priority: 100, anchorY: 134 },
  },
  // I — Lower Leg (left whitespace below wrist, leader to calf vertical line)
  I: {
    letter: 'I',
    name: 'Lower Leg',
    geometry: { x1: 86, y1: 158, x2: 86, y2: 205, orientation: 'vertical', stopLength: 2.5 },
    preference: { preferredSide: 'left', priority: 70, anchorY: 174 },
  },

  // CENTER ZONE (B, C)
  // B — Waist (centered below waist measurement line with vertical stem)
  B: {
    letter: 'B',
    name: 'Waist',
    geometry: { x1: 88, y1: 69, x2: 118, y2: 69, orientation: 'horizontal', stopLength: 2.5 },
    preference: { preferredSide: 'center', priority: 88, anchorY: 69 },
  },
  // C — Hips (centered below hip measurement line with vertical stem)
  C: {
    letter: 'C',
    name: 'Hips',
    geometry: { x1: 87, y1: 96, x2: 119, y2: 96, orientation: 'horizontal', stopLength: 2.5 },
    preference: { preferredSide: 'center', priority: 84, anchorY: 96 },
  },

  // RIGHT ANNOTATION ZONE (D, K, L, F, G, H, J)
  // D — Neck (upper-right whitespace, leader to neck ring)
  D: {
    letter: 'D',
    name: 'Neck',
    geometry: { x1: 97, y1: 26, x2: 109, y2: 26, orientation: 'horizontal', ring: true, stopLength: 1.5 },
    preference: { preferredSide: 'right', priority: 95, anchorY: 14 },
  },
  // K — Upper Chest (right whitespace, leader to upper chest line)
  K: {
    letter: 'K',
    name: 'Upper Chest',
    geometry: { x1: 91, y1: 39, x2: 115, y2: 39, orientation: 'horizontal', dashed: true, stopLength: 2.0 },
    preference: { preferredSide: 'right', priority: 86, anchorY: 36 },
  },
  // L — Under Bust (right whitespace, leader to under bust line)
  L: {
    letter: 'L',
    name: 'Under Bust',
    geometry: { x1: 89, y1: 59, x2: 117, y2: 59, orientation: 'horizontal', dashed: true, stopLength: 2.0 },
    preference: { preferredSide: 'right', priority: 82, anchorY: 58 },
  },
  // F — Front Torso Length (right whitespace, leader to torso length dimension)
  F: {
    letter: 'F',
    name: 'Front Torso Length',
    geometry: { x1: 115, y1: 31, x2: 115, y2: 69, orientation: 'vertical', stopLength: 2.5 },
    preference: { preferredSide: 'right', priority: 78, anchorY: 80 },
  },
  // G — Inseam (right whitespace, leader to inner leg inseam line)
  G: {
    letter: 'G',
    name: 'Inseam',
    geometry: { x1: 103.5, y1: 118, x2: 103.5, y2: 202, orientation: 'vertical', stopLength: 2.5 },
    preference: { preferredSide: 'right', priority: 72, anchorY: 124 },
  },
  // H — Knee (right whitespace, leader to knee ring)
  H: {
    letter: 'H',
    name: 'Knee',
    geometry: { x1: 109.5, y1: 158, x2: 119.5, y2: 158, orientation: 'horizontal', ring: true, stopLength: 1.5 },
    preference: { preferredSide: 'right', priority: 65, anchorY: 162 },
  },
  // J — Full Height (far-right datum dimension at x = 222)
  J: {
    letter: 'J',
    name: 'Full Height',
    geometry: { x1: 222, y1: -6, x2: 222, y2: 207, orientation: 'vertical', farSide: true, stopLength: 3.0 },
    preference: { preferredSide: 'right', priority: 100, anchorY: 174 },
  },
};

// ============================================================
// COLLISION & GEOMETRY HELPERS
// ============================================================

/**
 * Checks whether two axis-aligned rectangles overlap with a safety margin.
 */
export function rectsOverlap(a: AnnotationLabel, b: AnnotationLabel, margin: number = 2.0): boolean {
  return !(
    a.x + a.width + margin <= b.x ||
    b.x + b.width + margin <= a.x ||
    a.y + a.height + margin <= b.y ||
    b.y + b.height + margin <= a.y
  );
}

/**
 * Checks whether a label bounding box intersects or encroaches within `clearance`
 * of ANY part of the human silhouette.
 */
export function intersectsBody(b: AnnotationLabel, clearance: number): boolean {
  if (b.y + b.height <= BODY_TOP_Y - clearance) return false;
  if (b.y >= BODY_BOTTOM_Y + clearance) return false;

  const yStart = Math.max(BODY_TOP_Y, b.y);
  const yEnd = Math.min(BODY_BOTTOM_Y, b.y + b.height);
  const step = 1.5;

  for (let y = yStart; y <= yEnd; y += step) {
    const edges = getBodyEdges(y);
    if (b.x + b.width > edges.left - clearance && b.x < edges.right + clearance) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether a label bounding box is inside SVG canvas boundaries.
 */
export function isInSvgBounds(b: AnnotationLabel, bounds: LayoutConfig['svgBounds']): boolean {
  return (
    b.x >= bounds.minX &&
    b.x + b.width <= bounds.maxX &&
    b.y >= bounds.minY &&
    b.y + b.height <= bounds.maxY
  );
}

/**
 * Dynamically computes label dimensions in SVG units based on content length.
 * Sized for a 2-line pill with left avatar circle:
 * Line 1: Landmark Name
 * Line 2: Value + Unit
 */
export function calculateLabelBounds(
  valueText: string | null,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG,
  nameText?: string,
): { width: number; height: number } {
  const nameLen = nameText ? nameText.length : 0;
  const valLen = valueText ? valueText.length : 0;
  const textWidth = Math.max(nameLen * 1.52, valLen * 1.65);
  const width = Math.max(26, Math.round(14.0 + textWidth));
  return { width, height: config.pillHeight };
}

// ============================================================
// ZONE-BASED EXTERNAL LABEL POSITION SEARCH
// ============================================================

/**
 * Places labels into their dedicated spatial zone (LEFT_ZONE, CENTER_ZONE, RIGHT_ZONE)
 * utilizing the full available empty whitespace.
 */
export function findExternalAnnotationPosition(
  geom: MeasurementGeometry,
  side: AnnotationSide,
  size: { width: number; height: number },
  placed: AnnotationLabel[],
  anchorY: number,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG,
): AnnotationLabel {
  const { svgBounds } = config;

  // 1. CENTER ZONE (B and C centered below their measurement line)
  if (side === 'center') {
    const centerX = ANNOTATION_ZONES.center.targetX;
    const x = Math.round(centerX - size.width / 2);
    let y = anchorY + 8; // Offset below the measurement line

    let bounds: AnnotationLabel = { x, y, width: size.width, height: size.height };
    let attempts = 0;
    while (placed.some((p) => rectsOverlap(bounds, p, 2.5)) && attempts < 20) {
      attempts++;
      bounds.y = y + attempts * 3;
    }
    return bounds;
  }

  // 2. RIGHT ANNOTATION ZONE (D, K, L, F, G, H, J)
  if (side === 'right') {
    let targetX = ANNOTATION_ZONES.right.targetX; // x = 160
    // J is placed adjacent to its far-right vertical line at x = 222
    if (geom.farSide) {
      targetX = 186;
    }
    let targetY = anchorY - size.height / 2;

    let bounds: AnnotationLabel = {
      x: targetX,
      y: targetY,
      width: size.width,
      height: size.height,
    };

    const step = 4;
    let attempts = 0;
    while (
      (placed.some((p) => rectsOverlap(bounds, p, 2.5)) ||
        !isInSvgBounds(bounds, svgBounds)) &&
      attempts < 30
    ) {
      attempts++;
      bounds.y = targetY + (attempts % 2 === 1 ? 1 : -1) * Math.ceil(attempts / 2) * step;
    }
    return bounds;
  }

  // 3. LEFT ANNOTATION ZONE (E, A, M, N, O, I)
  // Aligns right edge of all left labels at x = 22 (inside the left whitespace)
  let targetX = ANNOTATION_ZONES.left.targetX - size.width;
  let targetY = anchorY - size.height / 2;

  let bounds: AnnotationLabel = {
    x: targetX,
    y: targetY,
    width: size.width,
    height: size.height,
  };

  const step = 4;
  let attempts = 0;
  while (
    (placed.some((p) => rectsOverlap(bounds, p, 2.5)) ||
      !isInSvgBounds(bounds, svgBounds)) &&
    attempts < 30
  ) {
    attempts++;
    bounds.y = targetY + (attempts % 2 === 1 ? 1 : -1) * Math.ceil(attempts / 2) * step;
  }
  return bounds;
}

// ============================================================
// LEADER LINE CALCULATION
// ============================================================

export function calculateLeaderLine(
  landmarkOrGeom: LandmarkDefinition | MeasurementGeometry,
  label: AnnotationLabel,
  anchorY: number,
  side: AnnotationSide,
): LeaderLine | null {
  const geom: MeasurementGeometry =
    'geometry' in landmarkOrGeom ? landmarkOrGeom.geometry : (landmarkOrGeom as MeasurementGeometry);

  const labelCenterY = label.y + label.height / 2;

  // 1. CENTER ZONE: Clean vertical leader line from measurement line to label pill
  if (side === 'center') {
    const centerX = ANNOTATION_ZONES.center.targetX;
    return {
      x1: centerX,
      y1: geom.y1,
      x2: centerX,
      y2: label.y,
    };
  }

  // 2. RIGHT ANNOTATION ZONE: Leader extending from right landmark to right label
  if (side === 'right') {
    let sx: number, sy: number;
    let tx: number, ty: number;
    if (geom.farSide) {
      sx = Math.max(geom.x1, geom.x2); // 222
      sy = labelCenterY;
      tx = label.x + label.width; // connects into right edge of J pill
      ty = labelCenterY;
      return { x1: sx, y1: sy, x2: tx, y2: ty };
    } else if (geom.orientation === 'vertical') {
      sx = Math.max(geom.x1, geom.x2);
      sy = anchorY;
      tx = label.x;
      ty = labelCenterY;
    } else {
      sx = Math.max(geom.x1, geom.x2);
      sy = geom.y1;
      tx = label.x;
      ty = labelCenterY;
    }

    const dy = Math.abs(sy - ty);
    if (dy > 3.0) {
      return {
        x1: sx,
        y1: sy,
        x2: tx,
        y2: ty,
        midX: Math.round((sx + tx) / 2),
        stepped: true,
      };
    }
    return { x1: sx, y1: sy, x2: tx, y2: ty };
  }

  // 3. LEFT ANNOTATION ZONE: Leader extending from left landmark to left label
  let sx: number, sy: number;
  let tx: number, ty: number;
  if (geom.farSide) {
    sx = Math.min(geom.x1, geom.x2); // -24
    sy = labelCenterY;
    tx = label.x; // connects into left edge of O pill
    ty = labelCenterY;
    return { x1: sx, y1: sy, x2: tx, y2: ty };
  } else if (geom.orientation === 'slanted') {
    sx = (geom.x1 + geom.x2) / 2;
    sy = (geom.y1 + geom.y2) / 2;
    tx = label.x + label.width;
    ty = labelCenterY;
  } else if (geom.orientation === 'vertical') {
    sx = Math.min(geom.x1, geom.x2);
    sy = anchorY;
    tx = label.x + label.width;
    ty = labelCenterY;
  } else {
    sx = Math.min(geom.x1, geom.x2);
    sy = geom.y1;
    tx = label.x + label.width;
    ty = labelCenterY;
  }

  const dy = Math.abs(sy - ty);
  if (dy > 3.0) {
    const stepX =
      'dogleg' in landmarkOrGeom && landmarkOrGeom.dogleg?.midX !== undefined
        ? landmarkOrGeom.dogleg.midX
        : Math.round((sx + tx) / 2);
    return {
      x1: sx,
      y1: sy,
      x2: tx,
      y2: ty,
      midX: stepX,
      stepped: true,
    };
  }
  return { x1: sx, y1: sy, x2: tx, y2: ty };
}

// ============================================================
// MAIN ENGINE API: layoutMeasurements()
// ============================================================

export interface LayoutMeasurementsOptions {
  measurements: VisibleMeasurementInput[];
  config?: Partial<LayoutConfig>;
}

/**
 * Primary API of the annotation engine.
 * Computes external positions and leader lines for all currently visible measurements.
 */
export function layoutMeasurements({
  measurements,
  config: userConfig,
}: LayoutMeasurementsOptions): Map<string, PositionedAnnotation> {
  const config: LayoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...userConfig };
  const result = new Map<string, PositionedAnnotation>();
  const placedLabels: AnnotationLabel[] = [];

  // Sort visible measurements by priority (highest priority placed first)
  const items = measurements
    .map((m) => {
      const def = LANDMARK_DEFINITIONS[m.letter];
      return {
        input: m,
        landmark: def,
      };
    })
    .filter((item): item is { input: VisibleMeasurementInput; landmark: LandmarkDefinition } =>
      Boolean(item.landmark),
    );

  items.sort((a, b) => b.landmark.preference.priority - a.landmark.preference.priority);

  for (const { input, landmark } of items) {
    const { letter, geometry, preference } = landmark;
    const valueString =
      input.value !== undefined && input.value !== null && input.value !== ''
        ? `${input.value} ${input.unit}`
        : null;

    const size = calculateLabelBounds(valueString, config, landmark.name);

    // Compute anchor Y on the measurement line
    const midY = (geometry.y1 + geometry.y2) / 2;
    const anchorY = preference.anchorY !== undefined ? preference.anchorY : midY;
    const activeSide: AnnotationSide = preference.preferredSide;

    // Find zone-based external label position
    const label = findExternalAnnotationPosition(
      geometry,
      activeSide,
      size,
      placedLabels,
      anchorY,
      config,
    );

    placedLabels.push(label);

    const leader = calculateLeaderLine(landmark, label, anchorY, activeSide);

    result.set(letter, {
      letter,
      geometry,
      label,
      leader,
      side: activeSide,
    });
  }

  return result;
}

