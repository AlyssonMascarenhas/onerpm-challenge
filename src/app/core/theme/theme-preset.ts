import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { ACCENT_PALETTE, ACTION_COLORS, SURFACE_PALETTE } from './theme.constants';

/**
 * Aura with our accent and ink surfaces; light and dark keep AA contrast (see `ACCENT_PALETTE`).
 *
 * Aura's light message and outlined-button texts use the 500/600 steps of red, yellow and green on
 * very pale backgrounds, which measure 2.5:1 to 3.7:1 (axe flagged them). The light scheme moves
 * them to darker steps; the dark scheme already passes.
 */
export const OnerpmPreset = definePreset(Aura, {
  semantic: {
    primary: ACCENT_PALETTE,
    colorScheme: {
      light: {
        surface: SURFACE_PALETTE,
        action: ACTION_COLORS.light,
        primary: {
          color: '{primary.700}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.800}',
          activeColor: '{primary.900}',
        },
        highlight: {
          background: '{primary.50}',
          focusBackground: '{primary.100}',
          color: '{primary.800}',
          focusColor: '{primary.900}',
        },
      },
      dark: {
        surface: SURFACE_PALETTE,
        action: ACTION_COLORS.dark,
        primary: {
          color: '{primary.400}',
          contrastColor: '{surface.950}',
          hoverColor: '{primary.300}',
          activeColor: '{primary.200}',
        },
        highlight: {
          background: 'color-mix(in srgb, {primary.400}, transparent 84%)',
          focusBackground: 'color-mix(in srgb, {primary.400}, transparent 76%)',
          color: 'rgba(255,255,255,.87)',
          focusColor: 'rgba(255,255,255,.87)',
        },
      },
    },
  },
  components: {
    message: {
      colorScheme: {
        light: {
          error: { color: '{red.700}' },
          warn: { color: '{yellow.800}' },
          success: { color: '{green.700}' },
        },
        // Aura's dark red (500) on its 16% red tint over the card measures 4.47:1, just under AA.
        dark: {
          error: { color: '{red.400}' },
        },
      },
    },
    button: {
      colorScheme: {
        light: {
          outlined: { danger: { color: '{red.700}' } },
        },
      },
    },
  },
});
