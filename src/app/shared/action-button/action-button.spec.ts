import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionButton } from './action-button';
import { ACTION_ICON_PATHS } from './action-button.constants';
import { ActionIcon } from './action-button.enums';

interface Inputs {
  label?: string;
  icon?: ActionIcon;
  href?: string;
  newTabLabel?: string;
}

async function render(inputs: Inputs = {}): Promise<ComponentFixture<ActionButton>> {
  TestBed.configureTestingModule({ imports: [ActionButton] });
  const fixture = TestBed.createComponent(ActionButton);
  fixture.componentRef.setInput('label', inputs.label ?? 'Listen');
  fixture.componentRef.setInput('icon', inputs.icon ?? ActionIcon.Play);
  if (inputs.href !== undefined) fixture.componentRef.setInput('href', inputs.href);
  if (inputs.newTabLabel !== undefined) {
    fixture.componentRef.setInput('newTabLabel', inputs.newTabLabel);
  }
  await fixture.whenStable();
  return fixture;
}

const root = (fixture: ComponentFixture<ActionButton>) => fixture.nativeElement as HTMLElement;
const text = (element: Element | null | undefined) =>
  element?.textContent?.replace(/\s+/g, ' ').trim();

describe('ActionButton', () => {
  describe('without href', () => {
    it('is a button showing the label', async () => {
      const fixture = await render({ label: 'Listen to a preview' });

      const button = root(fixture).querySelector('button') as HTMLButtonElement;

      expect(button.type).toBe('button');
      expect(text(button)).toBe('Listen to a preview');
      expect(root(fixture).querySelector('a')).toBeNull();
    });

    it('emits `pressed` once per click', async () => {
      const fixture = await render();
      const pressed = vi.fn();
      fixture.componentInstance.pressed.subscribe(pressed);

      (root(fixture).querySelector('button') as HTMLButtonElement).click();

      expect(pressed).toHaveBeenCalledTimes(1);
    });
  });

  describe('with href', () => {
    it('is a link that opens in a new tab, safely', async () => {
      const fixture = await render({ href: 'https://open.spotify.com/track/abc' });

      const link = root(fixture).querySelector('a') as HTMLAnchorElement;

      expect(link.href).toBe('https://open.spotify.com/track/abc');
      expect(link.target).toBe('_blank');
      expect(link.rel).toBe('noopener noreferrer');
      expect(root(fixture).querySelector('button')).toBeNull();
    });

    it('tells screen readers that it opens a new tab, when given the text', async () => {
      const fixture = await render({
        href: 'https://example.test',
        newTabLabel: 'opens in a new tab',
      });

      expect(text(root(fixture).querySelector('a .visually-hidden'))).toBe('(opens in a new tab)');
    });

    it('adds no hint when it is not given one', async () => {
      const fixture = await render({ href: 'https://example.test' });

      expect(root(fixture).querySelector('.visually-hidden')).toBeNull();
    });

    it('does not emit `pressed`, because following the link is the action', async () => {
      const fixture = await render({ href: 'https://example.test' });
      const pressed = vi.fn();
      fixture.componentInstance.pressed.subscribe(pressed);

      expect(root(fixture).querySelector('button')).toBeNull();
      expect(pressed).not.toHaveBeenCalled();
    });
  });

  describe('mark', () => {
    it.each(Object.values(ActionIcon))(
      'draws the %s mark, hidden from assistive technology',
      async (icon) => {
        const fixture = await render({ icon });

        const mark = root(fixture).querySelector('svg') as SVGElement;

        expect(mark.getAttribute('aria-hidden')).toBe('true');
        expect(mark.classList.contains(`action__mark--${icon}`)).toBe(true);
        expect(mark.querySelector('path')?.getAttribute('d')).toBe(ACTION_ICON_PATHS[icon]);
      },
    );

    it('has a distinct drawing for each icon', () => {
      const paths = Object.values(ACTION_ICON_PATHS);

      expect(new Set(paths).size).toBe(paths.length);
    });
  });
});
