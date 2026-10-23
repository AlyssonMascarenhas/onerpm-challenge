import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { ACCENT_PALETTE, SURFACE_PALETTE } from './theme.constants';

/** Aura with our accent and ink surfaces; light and dark keep AA contrast (see `ACCENT_PALETTE`). */
export const OnerpmPreset = definePreset(Aura, {
  semantic: {
    primary: ACCENT_PALETTE,
    colorScheme: {
      light: {
        surface: SURFACE_PALETTE,
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
});
