import { describe, it, expect } from 'vitest';
import {
  layoutMeasurements,
  intersectsBody,
  rectsOverlap,
  LANDMARK_DEFINITIONS,
  type VisibleMeasurementInput,
} from '../measurementAnnotationEngine';

describe('measurementAnnotationEngine (3-Zone Architecture)', () => {
  const all15Measurements: VisibleMeasurementInput[] = [
    { letter: 'A', value: '38', unit: 'in' },
    { letter: 'B', value: '32', unit: 'in' },
    { letter: 'C', value: '39', unit: 'in' },
    { letter: 'D', value: '15.5', unit: 'in' },
    { letter: 'E', value: '18', unit: 'in' },
    { letter: 'F', value: '17.5', unit: 'in' },
    { letter: 'G', value: '30.5', unit: 'in' },
    { letter: 'H', value: '22', unit: 'in' },
    { letter: 'I', value: '41', unit: 'in' },
    { letter: 'J', value: '68', unit: 'in' },
    { letter: 'K', value: '15.5', unit: 'in' },
    { letter: 'L', value: '14', unit: 'in' },
    { letter: 'M', value: '25', unit: 'in' },
    { letter: 'N', value: '7', unit: 'in' },
    { letter: 'O', value: '41.5', unit: 'in' },
  ];

  it('correctly allocates all 15 master landmarks into the 3 dedicated zones', () => {
    const layout = layoutMeasurements({ measurements: all15Measurements });
    expect(layout.size).toBe(15);

    // Left Zone: E, A, M, N, O, I
    const leftLetters = ['E', 'A', 'M', 'N', 'O', 'I'];
    leftLetters.forEach((letter) => {
      const anno = layout.get(letter);
      expect(anno, `Landmark ${letter} should exist`).toBeDefined();
      expect(anno!.side).toBe('left');
      expect(anno!.label.x + anno!.label.width).toBeLessThanOrEqual(25);
      expect(intersectsBody(anno!.label, 4)).toBe(false);
    });

    // Right Zone: D, K, L, F, G, H, J
    const rightLetters = ['D', 'K', 'L', 'F', 'G', 'H', 'J'];
    rightLetters.forEach((letter) => {
      const anno = layout.get(letter);
      expect(anno, `Landmark ${letter} should exist`).toBeDefined();
      expect(anno!.side).toBe('right');
      expect(anno!.label.x).toBeGreaterThanOrEqual(150);
      expect(intersectsBody(anno!.label, 4)).toBe(false);
    });

    // Center Zone: B, C centered below measurement lines
    const centerLetters = ['B', 'C'];
    centerLetters.forEach((letter) => {
      const anno = layout.get(letter);
      expect(anno, `Landmark ${letter} should exist`).toBeDefined();
      expect(anno!.side).toBe('center');
      const pillCenter = anno!.label.x + anno!.label.width / 2;
      expect(Math.abs(pillCenter - 103.16)).toBeLessThan(1.5);
      expect(anno!.leader).not.toBeNull();
      expect(anno!.leader!.x1).toBe(anno!.leader!.x2);
    });
  });

  it('guarantees that no two labels overlap each other', () => {
    const layout = layoutMeasurements({ measurements: all15Measurements });
    const annotations = Array.from(layout.values());

    for (let i = 0; i < annotations.length; i++) {
      for (let j = i + 1; j < annotations.length; j++) {
        const overlap = rectsOverlap(annotations[i].label, annotations[j].label, 1.0);
        expect(
          overlap,
          `Labels ${annotations[i].letter} and ${annotations[j].letter} should not overlap`,
        ).toBe(false);
      }
    }
  });

  it('creates leader lines originating from measurement geometry for all annotations', () => {
    const layout = layoutMeasurements({ measurements: all15Measurements });

    layout.forEach((annotation, letter) => {
      const def = LANDMARK_DEFINITIONS[letter];
      expect(annotation.leader, `Landmark ${letter} should have a leader line`).not.toBeNull();
      const geom = def.geometry;
      const minX = Math.min(geom.x1, geom.x2) - 2;
      const maxX = Math.max(geom.x1, geom.x2) + 2;
      expect(annotation.leader!.x1).toBeGreaterThanOrEqual(minX);
      expect(annotation.leader!.x1).toBeLessThanOrEqual(maxX);
    });
  });

  it('automatically adapts label bounds when unit changes to longer strings (e.g. cm)', () => {
    const cmMeasurements: VisibleMeasurementInput[] = all15Measurements.map((m) => ({
      ...m,
      value: (parseFloat(String(m.value)) * 2.54).toFixed(1),
      unit: 'cm',
    }));

    const layout = layoutMeasurements({ measurements: cmMeasurements });
    expect(layout.size).toBe(15);

    const annotations = Array.from(layout.values());
    for (let i = 0; i < annotations.length; i++) {
      for (let j = i + 1; j < annotations.length; j++) {
        const overlap = rectsOverlap(annotations[i].label, annotations[j].label, 0.5);
        expect(overlap, `Labels ${annotations[i].letter} and ${annotations[j].letter} (cm) should not overlap`).toBe(false);
      }
    }
  });

  it('handles filtered subsets without errors or gaps', () => {
    const girthOnly = all15Measurements.filter((m) => ['A', 'B', 'C', 'D', 'H', 'L', 'N'].includes(m.letter));
    const layout = layoutMeasurements({ measurements: girthOnly });
    expect(layout.size).toBe(7);

    layout.forEach((annotation) => {
      if (annotation.side !== 'center') {
        expect(intersectsBody(annotation.label, 4)).toBe(false);
      }
    });
  });
});
