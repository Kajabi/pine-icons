import { newSpecPage } from '@stencil/core/testing';
import { PdsIcon } from '../pds-icon';

describe('pds-icon', () => {
  it('renders', async () => {
    const { root } = await newSpecPage({
      components: [PdsIcon],
      html: '<pds-icon></pds-icon>',
    });
    expect(root).toEqualHtml(`
      <pds-icon alt="" aria-hidden="true" size="regular" style="--dimension-icon-height: 16px; --dimension-icon-width: 16px; --color-icon-fill: currentColor;">
        <mock:shadow-root>
          <div class="icon-inner"></div>
        </mock:shadow-root>
      </pds-icon>
    `);
  });

  it('renders the correct size when passed', async () => {
    const { root } = await newSpecPage({
      components: [PdsIcon],
      html: '<pds-icon size="small"></pds-icon>',
    });
    expect(root).toEqualHtml(`
      <pds-icon alt="" aria-hidden="true" size="small" style="--dimension-icon-height: 12px; --dimension-icon-width: 12px; --color-icon-fill: currentColor;">
        <mock:shadow-root>
          <div class="icon-inner"></div>
        </mock:shadow-root>
      </pds-icon>
    `);
  });

  it('allows custom size', async () => {
    const { root } = await newSpecPage({
      components: [PdsIcon],
      html: '<pds-icon size="32px"></pds-icon>',
    });
    expect(root).toEqualHtml(`
      <pds-icon alt="" aria-hidden="true" size="32px" style="--dimension-icon-height: 32px; --dimension-icon-width: 32px; --color-icon-fill: currentColor;">
        <mock:shadow-root>
          <div class="icon-inner"></div>
        </mock:shadow-root>
      </pds-icon>
    `);
  });

  it('renders icon when found', async () => {
    const { root } = await newSpecPage({
      components: [PdsIcon],
      html: '<pds-icon name="archive"></pds-icon>',
    });
    expect(root).toEqualHtml(`
      <pds-icon alt="" aria-hidden="true" name="archive" size="regular" style="--dimension-icon-height: 16px; --dimension-icon-width: 16px; --color-icon-fill: currentColor;">
        <mock:shadow-root>
          <div class="icon-inner"></div>
        </mock:shadow-root>
      </pds-icon>
    `);
  });

  it('add correct styles when color specified', async () => {
    const { root } = await newSpecPage({
      components: [PdsIcon],
      html: '<pds-icon name="archive" color="red"></pds-icon>',
    });
    expect(root).toEqualHtml(`
      <pds-icon alt="" aria-hidden="true" class="pds-color pds-color-red" color="red" name="archive" size="regular" style="--dimension-icon-height: 16px; --dimension-icon-width: 16px; --color-icon-fill: red">
        <mock:shadow-root>
          <div class="icon-inner"></div>
        </mock:shadow-root>
      </pds-icon>
    `);
  });

  it('normalizes color when a raw design token is provided', async () => {
    const { root } = await newSpecPage({
      components: [PdsIcon],
      html: '<pds-icon name="archive" color="--pine-color-purple-500"></pds-icon>',
    });

    const el = root.shadowRoot.host as HTMLElement;
    expect(el.style.getPropertyValue('--color-icon-fill')).toBe('var(--pine-color-purple-500)');
  });

  it('passes through var(...) for color', async () => {
    const { root } = await newSpecPage({
      components: [PdsIcon],
      html: '<pds-icon name="archive" color="var(--pine-color-purple-500)"></pds-icon>',
    });

    const el = root.shadowRoot.host as HTMLElement;
    expect(el.style.getPropertyValue('--color-icon-fill')).toBe('var(--pine-color-purple-500)');
  });

  it('renders custom aria-label', async () => {
    const { root } = await newSpecPage({
      components: [PdsIcon],
      html: `<pds-icon name="star" aria-label="custom label"></pds-icon>`,
    });

    expect(root).toEqualHtml(`
      <pds-icon alt="" name="star" role="img" aria-label="custom label" size="regular" style="--dimension-icon-height: 16px; --dimension-icon-width: 16px; --color-icon-fill: currentColor;">
        <mock:shadow-root>
          <div class="icon-inner"></div>
        </mock:shadow-root>
      </pds-icon>
    `);
  });

  it('renders custom label after changing source', async () => {
    const page = await newSpecPage({
      components: [PdsIcon],
      html: `<pds-icon name="youtube" aria-label="custom label"></pds-icon>`,
    });

    const icon = page.root;

    expect(icon).toEqualHtml(`
      <pds-icon alt="" name="youtube" role="img" aria-label="custom label" size="regular" style="--dimension-icon-height: 16px; --dimension-icon-width: 16px; --color-icon-fill: currentColor;">
        <mock:shadow-root>
          <div class="icon-inner"></div>
        </mock:shadow-root>
      </pds-icon>
    `);

    if (icon) {
      icon.name = 'trash';
    }
    await page.waitForChanges();

    expect(icon).toEqualHtml(`
      <pds-icon alt="" name="trash" role="img" aria-label="custom label" size="regular" style="--dimension-icon-height: 16px; --dimension-icon-width: 16px; --color-icon-fill: currentColor;">
        <mock:shadow-root>
          <div class="icon-inner"></div>
        </mock:shadow-root>
      </pds-icon>
    `);
  });


  // An icon's `name` is an asset id, not human copy. Exposing it would put
  // "rocket tone" into the accessible name of whatever button or link the icon
  // sits inside, where nothing can distinguish it from the real label.
  it('hides a decorative icon from assistive technology', async () => {
    const { root } = await newSpecPage({
      components: [PdsIcon],
      html: '<pds-icon name="rocket-tone"></pds-icon>',
    });

    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.getAttribute('aria-label')).toBeNull();
    expect(root.getAttribute('role')).toBeNull();
  });

  it('exposes an icon the author named, and does not hide it', async () => {
    const { root } = await newSpecPage({
      components: [PdsIcon],
      html: '<pds-icon name="rocket-tone" aria-label="Launch"></pds-icon>',
    });

    expect(root.getAttribute('aria-label')).toBe('Launch');
    expect(root.getAttribute('role')).toBe('img');
    expect(root.getAttribute('aria-hidden')).toBeNull();
  });

  it('never derives a label from the name, however the name changes', async () => {
    const page = await newSpecPage({
      components: [PdsIcon],
      html: '<pds-icon name="archive"></pds-icon>',
    });

    page.root.name = 'inbox-tone';
    await page.waitForChanges();

    expect(page.root.getAttribute('aria-label')).toBeNull();
    expect(page.root.getAttribute('aria-hidden')).toBe('true');
  });

  it('leaves an author-supplied aria-hidden in place', async () => {
    const { root } = await newSpecPage({
      components: [PdsIcon],
      html: '<pds-icon name="archive" aria-hidden="true"></pds-icon>',
    });

    expect(root.getAttribute('aria-hidden')).toBe('true');
  });

  it('flips an icon that should be flipped in RTL mode', async () => {
    // Use an icon from the ICONS_TO_FLIP list (e.g., 'arrow-left')
    const page = await newSpecPage({
      components: [PdsIcon],
      direction: 'rtl',
      html: '<pds-icon icon="arrow-left"></pds-icon>',
    });

    const icon = page.body.querySelector('pds-icon');
    expect(icon).toHaveClass('flip-rtl');
    expect(icon).toHaveClass('icon-rtl');
  });

  it('does not flip an icon that should not be flipped in RTL mode', async () => {
    // Use an icon not in the ICONS_TO_FLIP list (e.g., 'home')
    const page = await newSpecPage({
      components: [PdsIcon],
      direction: 'rtl',
      html: '<pds-icon icon="home"></pds-icon>',
    });

    const icon = page.body.querySelector('pds-icon');
    expect(icon).not.toHaveClass('flip-rtl');
    expect(icon).not.toHaveClass('icon-rtl');
  });

  it('respects the flipRTL prop when set to true', async () => {
    // Force flip an icon that would not normally be flipped
    const page = await newSpecPage({
      components: [PdsIcon],
      direction: 'rtl',
      html: '<pds-icon name="home" flip-rtl></pds-icon>',
    });

    const icon = page.body.querySelector('pds-icon');

    expect(icon).toHaveClass('flip-rtl');
    expect(icon).toHaveClass('icon-rtl');
  });

  it('respects the flipRTL prop when set to false', async () => {
    // Prevent flipping an icon that would normally be flipped
    const page = await newSpecPage({
      components: [PdsIcon],
      direction: 'rtl',
      html: '<pds-icon icon="arrow-left" flip-rtl="false"></pds-icon>',
    });

    const icon = page.body.querySelector('pds-icon');

    expect(icon.className.includes('flip-rtl')).toBe(false);
    expect(icon.className.includes('icon-rtl')).toBe(false);
  });

  it('does not flip icons when not in RTL mode', async () => {
    // Even an icon in the ICONS_TO_FLIP list should not flip in LTR mode
    const page = await newSpecPage({
      components: [PdsIcon],
      direction: 'ltr',
      html: '<pds-icon icon="arrow-left"></pds-icon>',
    });

    const icon = page.body.querySelector('pds-icon');

    expect(icon.className.includes('flip-rtl')).toBe(false);
    expect(icon.className.includes('icon-rtl')).toBe(false);
  });
});
