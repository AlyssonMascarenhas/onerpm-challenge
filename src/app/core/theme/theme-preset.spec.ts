import { ACCENT_PALETTE, SURFACE_PALETTE } from './theme.constants';
import { OnerpmPreset } from './theme-preset';
import { contrastRatio } from './testing/contrast';

/** WCAG AA for body text. */
const AA = 4.5;

interface SchemeTokens {
  primary: Record<string, string>;
  surface: Record<string, string>;
}

const semantic = OnerpmPreset.semantic as {
  primary: Record<string, string>;
  colorScheme: { light: SchemeTokens; dark: SchemeTokens };
};

/** Resolves `{primary.700}` / `{surface.950}` / `#ffffff` to a hex color. */
function resolve(token: string): string {
  const reference = /^\{(primary|surface)\.(\d+)\}$/.exec(token);
  if (!reference) {
    return token;
  }
  const palette = reference[1] === 'primary' ? ACCENT_PALETTE : SURFACE_PALETTE;
  return palette[Number(reference[2]) as keyof typeof palette];
}

describe('OnerpmPreset', () => {
  it('uses the accent scale as the primary palette', () => {
    expect(semantic.primary).toEqual(ACCENT_PALETTE);
  });

  it.each(['light', 'dark'] as const)('uses the ink scale for the %s surfaces', (scheme) => {
    expect(semantic.colorScheme[scheme].surface).toEqual(SURFACE_PALETTE);
  });

  describe('accessibility (WCAG AA, 4.5:1)', () => {
    it('light: the button label (white) is readable on the primary color and on its hover/active states', () => {
      const { primary } = semantic.colorScheme.light;

      for (const state of ['color', 'hoverColor', 'activeColor']) {
        expect(
          contrastRatio(resolve(primary['contrastColor']), resolve(primary[state])),
          state,
        ).toBeGreaterThanOrEqual(AA);
      }
    });

    it('dark: the button label is readable on the primary color and on its hover/active states', () => {
      const { primary } = semantic.colorScheme.dark;

      for (const state of ['color', 'hoverColor', 'activeColor']) {
        expect(
          contrastRatio(resolve(primary['contrastColor']), resolve(primary[state])),
          state,
        ).toBeGreaterThanOrEqual(AA);
      }
    });

    it('light: the primary color works as text on the page and card backgrounds', () => {
      const primary = resolve(semantic.colorScheme.light.primary['color']);

      expect(contrastRatio(primary, SURFACE_PALETTE[0])).toBeGreaterThanOrEqual(AA);
      expect(contrastRatio(primary, SURFACE_PALETTE[50])).toBeGreaterThanOrEqual(AA);
    });

    it('dark: the primary color works as text on the page and card backgrounds', () => {
      const primary = resolve(semantic.colorScheme.dark.primary['color']);

      expect(contrastRatio(primary, SURFACE_PALETTE[950])).toBeGreaterThanOrEqual(AA);
      expect(contrastRatio(primary, SURFACE_PALETTE[900])).toBeGreaterThanOrEqual(AA);
    });

    it('light: muted text (surface 500) is readable on white and on the page background', () => {
      expect(contrastRatio(SURFACE_PALETTE[500], SURFACE_PALETTE[0])).toBeGreaterThanOrEqual(AA);
      expect(contrastRatio(SURFACE_PALETTE[500], SURFACE_PALETTE[50])).toBeGreaterThanOrEqual(AA);
    });

    it('dark: muted text (surface 400) is readable on the page and card backgrounds', () => {
      expect(contrastRatio(SURFACE_PALETTE[400], SURFACE_PALETTE[950])).toBeGreaterThanOrEqual(AA);
      expect(contrastRatio(SURFACE_PALETTE[400], SURFACE_PALETTE[900])).toBeGreaterThanOrEqual(AA);
    });
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for identical colors', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 5);
  });

  it('does not depend on the argument order', () => {
    expect(contrastRatio('#ff7a38', '#0c0c11')).toBeCloseTo(
      contrastRatio('#0c0c11', '#ff7a38'),
      10,
    );
  });
});
