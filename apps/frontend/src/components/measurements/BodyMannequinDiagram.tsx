import React, { useState, useMemo } from 'react';
import { layoutMeasurements } from './measurementAnnotationEngine';
import type { VisibleMeasurementInput } from './measurementAnnotationEngine';

// ============================================================
// MEASUREMENT TYPES & DEFINITIONS
// ============================================================

export interface MeasurementDefinition {
  code: string;
  letter: string;
  name: string;
  key: string;
  category: 'UPPER' | 'LOWER' | 'LENGTH' | 'CIRCUMFERENCE';
  description: string;
  hint: string;
}

export const MEASUREMENT_DEFINITIONS: MeasurementDefinition[] = [
  {
    code: '1',
    letter: 'A',
    name: 'Chest / Bust',
    key: 'chest',
    category: 'CIRCUMFERENCE',
    description: 'Circumference measured around fullest part of chest/bust.',
    hint: 'Keep tape snug under armpits across shoulder blades, parallel to floor.',
  },
  {
    code: '2',
    letter: 'B',
    name: 'Waist',
    key: 'waist',
    category: 'CIRCUMFERENCE',
    description: 'Natural waist circumference at narrowest point above navel.',
    hint: 'Breathe normally, do not suck in stomach.',
  },
  {
    code: '3',
    letter: 'C',
    name: 'Hips',
    key: 'hips',
    category: 'CIRCUMFERENCE',
    description: 'Full hip circumference around widest point of seat and buttocks.',
    hint: 'Feet together, tape strictly parallel to floor.',
  },
  {
    code: '4',
    letter: 'D',
    name: 'Neck',
    key: 'neck',
    category: 'CIRCUMFERENCE',
    description: 'Circumference measured around base of neck.',
    hint: 'Insert one finger under tape for collar breathing ease.',
  },
  {
    code: '5',
    letter: 'E',
    name: 'Shoulder Width',
    key: 'shoulder',
    category: 'UPPER',
    description: 'Across back from shoulder bone tip to shoulder bone tip.',
    hint: 'Critical foundation for tailored jackets, kurtas, and shirts.',
  },
  {
    code: '6',
    letter: 'F',
    name: 'Front Torso Length',
    key: 'length',
    category: 'LENGTH',
    description: 'From base of neck / shoulder slope straight down to waist line.',
    hint: 'Determines jacket, kurta, and shirt front body length.',
  },
  {
    code: '7',
    letter: 'G',
    name: 'Inseam',
    key: 'inseam',
    category: 'LENGTH',
    description: 'From inner crotch along inner leg seam down to floor.',
    hint: 'Essential for bespoke trousers, pants, and churidars.',
  },
  {
    code: '8',
    letter: 'H',
    name: 'Knee',
    key: 'knee',
    category: 'LOWER',
    description: 'Circumference around fullest part of thigh / knee level.',
    hint: 'Gives comfortable ease for sitting, walking, and movement.',
  },
  {
    code: '9',
    letter: 'I',
    name: 'Lower Leg',
    key: 'calf',
    category: 'LENGTH',
    description: 'Vertical drop from natural waist down outside of leg to ankle bone.',
    hint: 'Defines trouser bottom rise and break point.',
  },
  {
    code: '10',
    letter: 'J',
    name: 'Full Height',
    key: 'fullHeight',
    category: 'LENGTH',
    description: 'Crown of head straight down to floor without shoes.',
    hint: 'Establishes the anatomical proportions of the entire outfit.',
  },
  {
    code: '11',
    letter: 'K',
    name: 'Upper Chest',
    key: 'acrossFront',
    category: 'UPPER',
    description: 'Width across upper chest between front arm crease folds.',
    hint: 'Ensures arm movement without fabric pulling across chest.',
  },
  {
    code: '12',
    letter: 'L',
    name: 'Under Bust',
    key: 'shoulderToUnderChest',
    category: 'CIRCUMFERENCE',
    description: 'Circumference directly beneath chest/bust line.',
    hint: 'Defines under-chest suppression for fitted waistcoats and jackets.',
  },
  {
    code: '13',
    letter: 'M',
    name: 'Sleeve Length',
    key: 'sleeveLength',
    category: 'LENGTH',
    description: 'From shoulder bone tip along outstretched arm down to wrist.',
    hint: 'Measured over elbow bone down to the wrist joint.',
  },
  {
    code: '14',
    letter: 'N',
    name: 'Wrist',
    key: 'wrist',
    category: 'CIRCUMFERENCE',
    description: 'Circumference around wrist bone.',
    hint: 'Add 1.5 - 2 inches for tailored shirt cuff ease.',
  },
  {
    code: '15',
    letter: 'O',
    name: 'Waist to Floor',
    key: 'waistToFloor',
    category: 'LENGTH',
    description: 'Vertical drop from natural waist down straight to floor.',
    hint: 'Customer stands upright without shoes; adjust for shoe heel.',
  },
];

// ============================================================
// COMPONENT PROPS
// ============================================================

interface BodyMannequinDiagramProps {
  activeCode: string | null;
  onSelectCode: (code: string) => void;
  values: Record<string, string | number>;
  unit?: string;
  highlightedCodes?: string[];
  hoveredCode?: string | null;
  onHoverCode?: (code: string | null) => void;
}

export const BodyMannequinDiagram: React.FC<BodyMannequinDiagramProps> = ({
  activeCode,
  onSelectCode,
  values,
  unit = 'in',
  highlightedCodes,
  hoveredCode: externalHoveredCode,
  onHoverCode,
}) => {
  const [internalHovered, setInternalHovered] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<
    'ALL' | 'CIRCUMFERENCE' | 'LENGTH' | 'UPPER'
  >('ALL');

  const activeHover = externalHoveredCode || internalHovered;
  const effectiveActive = activeHover || activeCode;

  // Code comparison (supports 'A', '1', or key)
  const isCodeActive = (def: MeasurementDefinition) => {
    if (!effectiveActive) return false;
    const q = effectiveActive.toLowerCase();
    return (
      def.code.toLowerCase() === q ||
      def.letter.toLowerCase() === q ||
      def.key.toLowerCase() === q
    );
  };

  const isRelevant = (def: MeasurementDefinition) => {
    if (categoryFilter !== 'ALL') {
      if (categoryFilter === 'CIRCUMFERENCE' && def.category !== 'CIRCUMFERENCE')
        return false;
      if (categoryFilter === 'LENGTH' && def.category !== 'LENGTH') return false;
      if (
        categoryFilter === 'UPPER' &&
        def.category !== 'UPPER' &&
        def.category !== 'LOWER'
      )
        return false;
    }
    if (!highlightedCodes || highlightedCodes.length === 0) return true;
    const q1 = def.code.toLowerCase();
    const q2 = def.letter.toLowerCase();
    return highlightedCodes.some(
      (c) => c.toLowerCase() === q1 || c.toLowerCase() === q2,
    );
  };

  const getVal = (def: MeasurementDefinition) => {
    const v =
      values[def.key] ??
      values[def.letter] ??
      values[def.code] ??
      (def.letter === 'F' ? values.length ?? values.shoulderToWaist : undefined) ??
      (def.letter === 'H' ? values.knee ?? values.thigh : undefined) ??
      (def.letter === 'I' ? values.calf ?? values.outseam : undefined) ??
      (def.letter === 'J' ? values.fullHeight ?? values.height : undefined) ??
      (def.letter === 'K' ? values.acrossFront ?? values.acrossChest : undefined);
    return v !== undefined && v !== '' ? `${v} ${unit}` : null;
  };

  const activeDef = MEASUREMENT_DEFINITIONS.find((d) => isCodeActive(d));

  // Authentic human mannequin silhouette
  const HUMAN_BODY_PATH =
    'M104.265,117.959c-0.304,3.58,2.126,22.529,3.38,29.959c0.597,3.52,2.234,9.255,1.645,12.3 c-0.841,4.244-1.084,9.736-0.621,12.934c0.292,1.942,1.211,10.899-0.104,14.175c-0.688,1.718-1.949,10.522-1.949,10.522 c-3.285,8.294-1.431,7.886-1.431,7.886c1.017,1.248,2.759,0.098,2.759,0.098c1.327,0.846,2.246-0.201,2.246-0.201 c1.139,0.943,2.467-0.116,2.467-0.116c1.431,0.743,2.758-0.627,2.758-0.627c0.822,0.414,1.023-0.109,1.023-0.109 c2.466-0.158-1.376-8.05-1.376-8.05c-0.92-7.088,0.913-11.033,0.913-11.033c6.004-17.805,6.309-22.53,3.909-29.24 c-0.676-1.937-0.847-2.704-0.536-3.545c0.719-1.941,0.195-9.748,1.072-12.848c1.692-5.979,3.361-21.142,4.231-28.217 c1.169-9.53-4.141-22.308-4.141-22.308c-1.163-5.2,0.542-23.727,0.542-23.727c2.381,3.705,2.29,10.245,2.29,10.245 c-0.378,6.859,5.541,17.342,5.541,17.342c2.844,4.332,3.921,8.442,3.921,8.747c0,1.248-0.273,4.269-0.273,4.269l0.109,2.631 c0.049,0.67,0.426,2.977,0.365,4.092c-0.444,6.862,0.646,5.571,0.646,5.571c0.92,0,1.931-5.522,1.931-5.522 c0,1.424-0.348,5.687,0.42,7.295c0.919,1.918,1.595-0.329,1.607-0.78c0.243-8.737,0.768-6.448,0.768-6.448 c0.511,7.088,1.139,8.689,2.265,8.135c0.853-0.407,0.073-8.506,0.073-8.506c1.461,4.811,2.569,5.577,2.569,5.577 c2.411,1.693,0.92-2.983,0.585-3.909c-1.784-4.92-1.839-6.625-1.839-6.625c2.229,4.421,3.909,4.257,3.909,4.257 c2.174-0.694-1.9-6.954-4.287-9.953c-1.218-1.528-2.789-3.574-3.245-4.789c-0.743-2.058-1.304-8.674-1.304-8.674 c-0.225-7.807-2.155-11.198-2.155-11.198c-3.3-5.282-3.921-15.135-3.921-15.135l-0.146-16.635 c-1.157-11.347-9.518-11.429-9.518-11.429c-8.451-1.258-9.627-3.988-9.627-3.988c-1.79-2.576-0.767-7.514-0.767-7.514 c1.485-1.208,2.058-4.415,2.058-4.415c2.466-1.891,2.345-4.658,1.206-4.628c-0.914,0.024-0.707-0.733-0.707-0.733 C115.068,0.636,104.01,0,104.01,0h-1.688c0,0-11.063,0.636-9.523,13.089c0,0,0.207,0.758-0.715,0.733 c-1.136-0.03-1.242,2.737,1.215,4.628c0,0,0.572,3.206,2.058,4.415c0,0,1.023,4.938-0.767,7.514c0,0-1.172,2.73-9.627,3.988 c0,0-8.375,0.082-9.514,11.429l-0.158,16.635c0,0-0.609,9.853-3.922,15.135c0,0-1.921,3.392-2.143,11.198 c0,0-0.563,6.616-1.303,8.674c-0.451,1.209-2.021,3.255-3.249,4.789c-2.408,2.993-6.455,9.24-4.29,9.953 c0,0,1.689,0.164,3.909-4.257c0,0-0.046,1.693-1.827,6.625c-0.35,0.914-1.839,5.59,0.573,3.909c0,0,1.117-0.767,2.569-5.577 c0,0-0.779,8.099,0.088,8.506c1.133,0.555,1.751-1.047,2.262-8.135c0,0,0.524-2.289,0.767,6.448 c0.012,0.451,0.673,2.698,1.596,0.78c0.779-1.608,0.429-5.864,0.429-7.295c0,0,0.999,5.522,1.933,5.522 c0,0,1.099,1.291,0.648-5.571c-0.073-1.121,0.32-3.422,0.369-4.092l0.106-2.631c0,0-0.274-3.014-0.274-4.269 c0-0.311,1.078-4.415,3.921-8.747c0,0,5.913-10.488,5.532-17.342c0,0-0.082-6.54,2.299-10.245c0,0,1.69,18.526,0.545,23.727 c0,0-5.319,12.778-4.146,22.308c0.864,7.094,2.53,22.237,4.226,28.217c0.886,3.094,0.362,10.899,1.072,12.848 c0.32,0.847,0.152,1.627-0.536,3.545c-2.387,6.71-2.083,11.436,3.921,29.24c0,0,1.848,3.945,0.914,11.033 c0,0-3.836,7.892-1.379,8.05c0,0,0.192,0.523,1.023,0.109c0,0,1.327,1.37,2.761,0.627c0,0,1.328,1.06,2.463,0.116 c0,0,0.91,1.047,2.237,0.201c0,0,1.742,1.175,2.777-0.098c0,0,1.839,0.408-1.435-7.886c0,0-1.254-8.793-1.945-10.522 c-1.318-3.275-0.387-12.251-0.106-14.175c0.453-3.216,0.21-8.695-0.618-12.934c-0.606-3.038,1.035-8.774,1.641-12.3 c1.245-7.423,3.685-26.373,3.38-29.959l1.008,0.354C103.809,118.312,104.265,117.959,104.265,117.959z';

  // ── Execute clean annotation layout engine on visible measurements ──
  const visibleMeasurements: VisibleMeasurementInput[] = useMemo(() => {
    return MEASUREMENT_DEFINITIONS.filter(isRelevant).map((def) => ({
      letter: def.letter,
      value:
        values[def.key] ??
        values[def.letter] ??
        values[def.code] ??
        (def.letter === 'F' ? values.length ?? values.shoulderToWaist : undefined) ??
        (def.letter === 'H' ? values.knee ?? values.thigh : undefined) ??
        (def.letter === 'I' ? values.calf ?? values.outseam : undefined) ??
        (def.letter === 'J' ? values.fullHeight ?? values.height : undefined) ??
        (def.letter === 'K' ? values.acrossFront ?? values.acrossChest : undefined),
      unit,
    }));
  }, [values, unit, categoryFilter, highlightedCodes]);

  const annotationsMap = useMemo(() => {
    return layoutMeasurements({ measurements: visibleMeasurements });
  }, [visibleMeasurements]);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchDistRef = React.useRef<number | null>(null);

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.75, +(z - 0.25).toFixed(2)));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistRef.current = Math.hypot(dx, dy);
    } else if (e.touches.length === 1 && zoom > 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panStartRef.current = { ...pan };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistRef.current !== null) {
      // Scoped pinch zoom: prevent browser document zooming
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const scale = currentDist / touchDistRef.current;
      setZoom((z) => Math.min(2.5, Math.max(0.75, +(z * scale).toFixed(2))));
      touchDistRef.current = currentDist;
    } else if (e.touches.length === 1 && isDragging && zoom > 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    }
  };

  const handleTouchEnd = () => {
    touchDistRef.current = null;
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      panStartRef.current = { ...pan };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div
      className="relative w-full flex flex-col items-center select-none font-sans bg-white border border-border rounded-2xl p-4 shadow-sm"
      id="mannequin-silhouette"
    >
      {/* Top Header: Category Filter Pills */}
      <div className="w-full flex items-center justify-between gap-2 mb-3 pb-3 border-b border-border">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
          <span className="w-2 h-2 rounded-full bg-pink-500 inline-block animate-pulse" />
          <span>Body Landmarks (A–O)</span>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 flex-wrap text-[11px] font-semibold text-text-secondary">
          {(['ALL', 'CIRCUMFERENCE', 'LENGTH', 'UPPER'] as const).map(
            (cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  categoryFilter === cat
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'hover:bg-surface-muted hover:text-text-primary'
                }`}
              >
                {cat === 'ALL'
                  ? 'All'
                  : cat === 'CIRCUMFERENCE'
                    ? 'Girth'
                    : cat === 'LENGTH'
                      ? 'Lengths'
                      : 'Upper'}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Active Landmark Guide Banner */}
      <div className="w-full mb-3 px-4 py-2.5 bg-slate-950 text-white rounded-xl shadow-md border border-slate-800 flex items-center justify-between min-h-[48px] transition-all duration-200">
        {activeDef ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5 truncate">
              <span className="w-7 h-7 rounded-full bg-pink-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                {activeDef.letter}
              </span>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">
                    {activeDef.name}
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-pink-300 bg-pink-950/60 px-1.5 py-0.5 rounded border border-pink-800/40">
                    {activeDef.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 truncate mt-0.5">
                  {activeDef.hint}
                </p>
              </div>
            </div>
            <div className="shrink-0 ml-3">
              {getVal(activeDef) ? (
                <span className="font-mono font-black text-xs text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-800/40">
                  {getVal(activeDef)}
                </span>
              ) : (
                <span className="text-slate-400 text-[11px] italic">
                  Not set
                </span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-slate-300 text-xs mx-auto flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
            Click any marker (A–O) on the body mannequin to inspect or edit
            live measurement
          </span>
        )}
      </div>

      {/* Interactive Mannequin SVG Canvas (3-Layer Architecture) */}
      <div
        className="relative w-full aspect-[298/238] max-h-[820px] min-h-[300px] sm:min-h-[420px] lg:min-h-[520px] flex justify-center items-center bg-[#FAFAFA] rounded-2xl border border-slate-200/80 p-2 overflow-hidden shadow-xs select-none"
        style={{ touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Scoped Zoom & Pan Controls Overlay */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-white/95 backdrop-blur-xs p-1 rounded-xl border border-slate-200 shadow-sm">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-7 h-7 min-h-[28px] min-w-[28px] rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-800 text-sm font-bold transition-colors cursor-pointer"
            aria-label="Zoom in mannequin"
            title="Zoom In"
          >
            +
          </button>
          <span className="text-[10px] font-mono px-1.5 text-slate-600 font-semibold min-w-[34px] text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-7 h-7 min-h-[28px] min-w-[28px] rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-800 text-sm font-bold transition-colors cursor-pointer"
            aria-label="Zoom out mannequin"
            title="Zoom Out"
          >
            -
          </button>
          {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="w-7 h-7 min-h-[28px] min-w-[28px] rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 text-xs font-bold transition-colors cursor-pointer"
              aria-label="Reset zoom and pan"
              title="Reset View"
            >
              ↺
            </button>
          )}
        </div>

        <svg
          viewBox="-46 -15 298 238"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Pink Arrow Markers */}
            <marker
              id="arrow-pink"
              viewBox="0 0 10 10"
              refX="5"
              refY="5"
              markerWidth="3.0"
              markerHeight="3.0"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 7.5 5 L 0 8.5 z" fill="#E11D48" />
            </marker>
            {/* Active Pink Marker */}
            <marker
              id="arrow-pink-active"
              viewBox="0 0 10 10"
              refX="5"
              refY="5"
              markerWidth="3.5"
              markerHeight="3.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#BE185D" />
            </marker>
            {/* Soft Shadow for Capsules and Badges */}
            <filter
              id="badge-shadow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feDropShadow
                dx="0"
                dy="0.8"
                stdDeviation="0.8"
                floodOpacity="0.12"
              />
            </filter>
          </defs>

          {/* Scaled and Panned Canvas Elements */}
          <g
            id="zoom-pan-group"
            transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
            style={{
              transformOrigin: '103px 100px',
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
          >

          {/* ============================================================
              LAYER 1: BODY SILHOUETTE & DRAFTING GUIDELINES
              ============================================================ */}
          <g id="layer-1-body">
            {/* Standing Ground Floorline */}
            <line
              x1="-30"
              y1="207"
              x2="232"
              y2="207"
              stroke="#CBD5E1"
              strokeWidth="0.9"
              strokeLinecap="round"
            />
            {/* Crown datum projection for Full Height (J) */}
            <line
              x1="103.16"
              y1="-6"
              x2="222"
              y2="-6"
              stroke="#E11D48"
              strokeWidth="0.6"
              strokeDasharray="2.0,1.5"
            />

            {/* Realistic Human Body Silhouette Mannequin */}
            <path
              d={HUMAN_BODY_PATH}
              fill="#FFFFFF"
              stroke="#0F172A"
              strokeWidth="0.85"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-xs transition-all duration-300"
            />

            {/* Anatomical Contours & Guidelines */}
            {/* Clavicle / Collarbones */}
            <path
              d="M 94 28 C 98 29 102 29 103 29 C 104 29 108 29 112 28"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="0.5"
              strokeLinecap="round"
            />
            {/* Center Midline Guide */}
            <line
              x1="103.16"
              y1="28"
              x2="103.16"
              y2="100"
              stroke="#E2E8F0"
              strokeWidth="0.5"
              strokeDasharray="1.5,1.5"
            />
          </g>

          {/* ============================================================
              LAYER 2: MEASUREMENT GEOMETRY (Lines, Caps, Arrows, Leaders)
              ============================================================ */}
          <g id="layer-2-measurements">
            {MEASUREMENT_DEFINITIONS.map((def) => {
              const annotation = annotationsMap.get(def.letter);
              if (!annotation) return null;

              const { geometry: geom, leader } = annotation;
              const isActive = isCodeActive(def);
              const relevant = isRelevant(def);
              const stopLen = geom.stopLength ?? 2.5;
              const isHoriz = geom.orientation === 'horizontal';
              const strokeColor = isActive ? '#BE185D' : '#E11D48';

              // End-cap coordinates
              let cap1, cap2;
              if (isHoriz) {
                cap1 = {
                  x1: geom.x1,
                  y1: geom.y1 - stopLen,
                  x2: geom.x1,
                  y2: geom.y1 + stopLen,
                };
                cap2 = {
                  x1: geom.x2,
                  y1: geom.y2 - stopLen,
                  x2: geom.x2,
                  y2: geom.y2 + stopLen,
                };
              } else {
                cap1 = {
                  x1: geom.x1 - stopLen,
                  y1: geom.y1,
                  x2: geom.x1 + stopLen,
                  y2: geom.y1,
                };
                cap2 = {
                  x1: geom.x2 - stopLen,
                  y1: geom.y2,
                  x2: geom.x2 + stopLen,
                  y2: geom.y2,
                };
              }

              return (
                <g
                  key={`geom-${def.letter}`}
                  id={`geom-${def.letter.toLowerCase()}`}
                  className="cursor-pointer transition-all duration-150"
                  onClick={() => onSelectCode(def.letter)}
                  onMouseEnter={() => {
                    setInternalHovered(def.letter);
                    onHoverCode?.(def.letter);
                  }}
                  onMouseLeave={() => {
                    setInternalHovered(null);
                    onHoverCode?.(null);
                  }}
                  opacity={relevant ? 1 : 0.25}
                >
                  {/* Specialized geometries */}
                  {def.letter === 'D' ? (
                    /* D: Collar ring/ellipse across neck with stop-caps */
                    <>
                      <ellipse
                        cx="103"
                        cy="26"
                        rx="6.0"
                        ry="1.8"
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={isActive ? '1.3' : '1.0'}
                      />
                      <line
                        x1="97"
                        y1="24.5"
                        x2="97"
                        y2="27.5"
                        stroke={strokeColor}
                        strokeWidth={isActive ? '1.3' : '0.9'}
                        strokeLinecap="round"
                      />
                      <line
                        x1="109"
                        y1="24.5"
                        x2="109"
                        y2="27.5"
                        stroke={strokeColor}
                        strokeWidth={isActive ? '1.3' : '0.9'}
                        strokeLinecap="round"
                      />
                    </>
                  ) : def.letter === 'H' ? (
                    /* H: Circumference ring/ellipse across knee with stop-caps */
                    <>
                      <ellipse
                        cx="114.5"
                        cy="158"
                        rx="5.0"
                        ry="1.6"
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={isActive ? '1.3' : '1.0'}
                      />
                      <line
                        x1="109.5"
                        y1="156.5"
                        x2="109.5"
                        y2="159.5"
                        stroke={strokeColor}
                        strokeWidth={isActive ? '1.3' : '0.9'}
                        strokeLinecap="round"
                      />
                      <line
                        x1="119.5"
                        y1="156.5"
                        x2="119.5"
                        y2="159.5"
                        stroke={strokeColor}
                        strokeWidth={isActive ? '1.3' : '0.9'}
                        strokeLinecap="round"
                      />
                    </>
                  ) : def.letter === 'N' ? (
                    /* N: Wrist ring accurately encircling left wrist joint with anatomical caps */
                    <>
                      <ellipse
                        cx="70.8"
                        cy="99.5"
                        rx="4.2"
                        ry="1.6"
                        transform="rotate(18 70.8 99.5)"
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={isActive ? '1.3' : '1.0'}
                      />
                      <line
                        x1="66.3"
                        y1="98.0"
                        x2="67.3"
                        y2="101.0"
                        stroke={strokeColor}
                        strokeWidth={isActive ? '1.3' : '0.9'}
                        strokeLinecap="round"
                      />
                      <line
                        x1="74.2"
                        y1="100.0"
                        x2="75.2"
                        y2="103.0"
                        stroke={strokeColor}
                        strokeWidth={isActive ? '1.3' : '0.9'}
                        strokeLinecap="round"
                      />
                    </>
                  ) : def.letter === 'M' ? (
                    /* M: Sleeve line from shoulder down to wrist stop tick */
                    <>
                      <line
                        x1={geom.x1}
                        y1={geom.y1}
                        x2={geom.x2}
                        y2={geom.y2}
                        stroke={strokeColor}
                        strokeWidth={isActive ? '1.4' : '1.0'}
                        markerEnd={isActive ? 'url(#arrow-pink-active)' : 'url(#arrow-pink)'}
                      />
                      <line
                        x1={geom.x2 - 2.5}
                        y1={geom.y2}
                        x2={geom.x2 + 2.5}
                        y2={geom.y2}
                        stroke={strokeColor}
                        strokeWidth={isActive ? '1.3' : '0.9'}
                        strokeLinecap="round"
                      />
                    </>
                  ) : def.letter === 'A' ? (
                    /* A: Solid horizontal line across chest + 3D circumference ellipse */
                    <>
                      <line
                        x1={cap1.x1}
                        y1={cap1.y1}
                        x2={cap1.x2}
                        y2={cap1.y2}
                        stroke={strokeColor}
                        strokeWidth={isActive ? '1.4' : '0.9'}
                        strokeLinecap="round"
                      />
                      <line
                        x1={geom.x1}
                        y1={geom.y1}
                        x2={geom.x2}
                        y2={geom.y2}
                        stroke={strokeColor}
                        strokeWidth={isActive ? '1.4' : '1.0'}
                        markerStart={isActive ? 'url(#arrow-pink-active)' : 'url(#arrow-pink)'}
                        markerEnd={isActive ? 'url(#arrow-pink-active)' : 'url(#arrow-pink)'}
                      />
                      <line
                        x1={cap2.x1}
                        y1={cap2.y1}
                        x2={cap2.x2}
                        y2={cap2.y2}
                        stroke={strokeColor}
                        strokeWidth={isActive ? '1.4' : '0.9'}
                        strokeLinecap="round"
                      />
                      <ellipse
                        cx="103"
                        cy="50"
                        rx="17"
                        ry="3.2"
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={isActive ? '0.9' : '0.6'}
                        opacity={0.85}
                      />
                    </>
                  ) : (
                    /* Standard linear measurements */
                    <>
                      <line
                        x1={cap1.x1}
                        y1={cap1.y1}
                        x2={cap1.x2}
                        y2={cap1.y2}
                        stroke={strokeColor}
                        strokeWidth={isActive ? '1.4' : '0.9'}
                        strokeLinecap="round"
                      />
                      <line
                        x1={geom.x1}
                        y1={geom.y1}
                        x2={geom.x2}
                        y2={geom.y2}
                        stroke={strokeColor}
                        strokeWidth={isActive ? '1.4' : '1.0'}
                        strokeDasharray={geom.dashed ? '2.5,2.0' : undefined}
                        markerStart={isActive ? 'url(#arrow-pink-active)' : 'url(#arrow-pink)'}
                        markerEnd={isActive ? 'url(#arrow-pink-active)' : 'url(#arrow-pink)'}
                      />
                      <line
                        x1={cap2.x1}
                        y1={cap2.y1}
                        x2={cap2.x2}
                        y2={cap2.y2}
                        stroke={strokeColor}
                        strokeWidth={isActive ? '1.4' : '0.9'}
                        strokeLinecap="round"
                      />
                    </>
                  )}

                  {/* Leader Lines */}
                  {leader && (
                    <>
                      {/* Terminal Anchor Dot */}
                      <circle
                        cx={leader.x1}
                        cy={leader.y1}
                        r={isActive ? 1.3 : 1.0}
                        fill={strokeColor}
                      />
                      {/* Stepped CAD Leader Line */}
                      {leader.stepped && leader.midX !== undefined ? (
                        <path
                          d={`M ${leader.x1} ${leader.y1} L ${leader.midX} ${leader.y1} L ${leader.midX} ${leader.y2} L ${leader.x2} ${leader.y2}`}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={isActive ? '1.0' : '0.75'}
                          strokeDasharray="2.0,1.5"
                        />
                      ) : leader.midX !== undefined && leader.midY !== undefined ? (
                        /* Dogleg Leader Line */
                        <path
                          d={`M ${leader.x1} ${leader.y1} L ${leader.midX} ${leader.midY} L ${leader.x2} ${leader.y2}`}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={isActive ? '1.0' : '0.75'}
                          strokeDasharray="2.0,1.5"
                        />
                      ) : leader.isCurved ? (
                        /* Curved Leader for Full Height (J) */
                        <path
                          d={`M ${leader.x1} 102 C ${leader.x1} 92 ${leader.x2 - 4} 92 ${leader.x2} 92`}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={isActive ? '1.0' : '0.75'}
                          strokeDasharray="2.0,1.5"
                        />
                      ) : (
                        /* Straight Leader (horizontal or vertical) */
                        <line
                          x1={leader.x1}
                          y1={leader.y1}
                          x2={leader.x2}
                          y2={leader.y2}
                          stroke={strokeColor}
                          strokeWidth={isActive ? '1.0' : '0.75'}
                          strokeLinecap="round"
                          strokeDasharray="2.0,1.5"
                        />
                      )}
                    </>
                  )}
                </g>
              );
            })}
          </g>

          {/* ============================================================
              LAYER 3: ANNOTATION LABELS & BADGES (Two-Line Pills)
              Matches reference mockup layout and styling
              ============================================================ */}
          <g id="layer-3-annotations">
            {MEASUREMENT_DEFINITIONS.map((def) => {
              const annotation = annotationsMap.get(def.letter);
              if (!annotation) return null;

              const { label: lb } = annotation;
              const isActive = isCodeActive(def);
              const relevant = isRelevant(def);
              const val = getVal(def);
              const pillCX = lb.x + lb.width / 2;
              const pillCY = lb.y + lb.height / 2;
              const pillWidth = lb.width;
              const pillHeight = lb.height;

              return (
                <g
                  key={`anno-${def.letter}`}
                  id={`anno-${def.letter.toLowerCase()}`}
                  className="cursor-pointer select-none transition-all duration-150"
                  onClick={() => onSelectCode(def.letter)}
                  onMouseEnter={() => {
                    setInternalHovered(def.letter);
                    onHoverCode?.(def.letter);
                  }}
                  onMouseLeave={() => {
                    setInternalHovered(null);
                    onHoverCode?.(null);
                  }}
                  opacity={relevant ? 1 : 0.25}
                  transform={`translate(${pillCX}, ${pillCY})`}
                >
                  {/* Invisible Touch Hitbox (>= 44px touch target) */}
                  <circle
                    cx="0"
                    cy="0"
                    r="20"
                    fill="transparent"
                    className="cursor-pointer"
                    role="button"
                    aria-label={`Select landmark ${def.letter}: ${def.name}`}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectCode(def.letter);
                      }
                    }}
                  />

                  {/* Pill Capsule Background */}
                  <rect
                    x={-pillWidth / 2}
                    y={-pillHeight / 2}
                    width={pillWidth}
                    height={pillHeight}
                    rx="3.8"
                    fill={isActive ? '#FFF1F2' : '#FFFFFF'}
                    stroke={isActive ? '#BE185D' : '#E11D48'}
                    strokeWidth={isActive ? '1.2' : '0.85'}
                    filter="url(#badge-shadow)"
                    className="transition-all duration-150"
                  />
                  {/* Left Avatar Pink Circle */}
                  <circle
                    cx={-pillWidth / 2 + 5.2}
                    cy="0"
                    r="3.6"
                    fill={isActive ? '#BE185D' : '#E11D48'}
                  />
                  {/* Letter Text inside Avatar */}
                  <text
                    x={-pillWidth / 2 + 5.2}
                    y="1.25"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="3.4"
                    fontWeight="bold"
                    fontFamily="Inter, system-ui, sans-serif"
                    className="select-none"
                  >
                    {def.letter}
                  </text>
                  {/* Line 1: Landmark Name */}
                  <text
                    x={-pillWidth / 2 + 10.2}
                    y="-1.2"
                    textAnchor="start"
                    fill="#0F172A"
                    fontSize="2.9"
                    fontWeight="600"
                    fontFamily="Inter, system-ui, sans-serif"
                    className="select-none"
                  >
                    {def.name}
                  </text>
                  {/* Line 2: Value + Unit */}
                  <text
                    x={-pillWidth / 2 + 10.2}
                    y="3.5"
                    textAnchor="start"
                    fill="#0F172A"
                    fontSize="3.6"
                    fontWeight="800"
                    fontFamily="Inter, system-ui, sans-serif"
                    className="select-none"
                  >
                    {val || '--'}
                  </text>
                </g>
              );
            })}
          </g>
          </g>
        </svg>
      </div>

      {/* Bottom helper summary */}
      <div className="w-full mt-3 pt-2.5 border-t border-border flex items-center justify-between text-[11px] text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block" />
          Live Digital Atelier Specification
        </span>
        <span className="font-mono text-[10px] text-text-tertiary">
          15 Master Landmarks (A–O)
        </span>
      </div>
    </div>
  );
};