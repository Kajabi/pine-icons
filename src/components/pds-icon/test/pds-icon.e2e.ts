import { newE2EPage } from '@stencil/core/testing';

describe('pds-icon', () => {
  it('renders', async () => {
    const page = await newE2EPage();

    await page.setContent('<pds-icon alt="" role="img" style="height: 16px; width: 16px;"></pds-icon>');
    const element = await page.find('pds-icon');
    expect(element).toHaveClass('hydrated');
  });

  // The real cost of labelling an icon from its `name`: the accessible-name
  // algorithm concatenates the icon's name into the control it sits inside, so a
  // button reads as "Save check" to a screen reader and to anything consuming the
  // accessibility tree. Asserted on the computed name rather than the attribute,
  // because the attribute alone cannot show the concatenation.
  it('contributes nothing to the accessible name of the control it sits in', async () => {
    const page = await newE2EPage();

    await page.setContent(`
      <button id="labelled">Save <pds-icon name="check"></pds-icon></button>
    `);
    await page.waitForChanges();

    const snapshot = await page.accessibility.snapshot();
    const button = findByRole(snapshot, 'button');

    expect(button).not.toBeNull();
    expect(button.name).not.toContain('check');
    expect(button.name.trim()).toBe('Save');
  });

  it('still contributes its own label to the control when the author names it', async () => {
    const page = await newE2EPage();

    await page.setContent(`
      <button id="icon-only"><pds-icon name="check" aria-label="Save"></pds-icon></button>
    `);
    await page.waitForChanges();

    const snapshot = await page.accessibility.snapshot();
    const button = findByRole(snapshot, 'button');

    expect(button).not.toBeNull();
    expect(button.name.trim()).toBe('Save');
  });

  // The hide/expose decision has to follow a label set after load, as a React
  // prop going from undefined to a string or a setAttribute call would.
  it('exposes the icon when a label is added after load', async () => {
    const page = await newE2EPage();

    await page.setContent(`
      <button><pds-icon name="check"></pds-icon></button>
    `);
    await page.waitForChanges();

    await page.$eval('pds-icon', (el) => el.setAttribute('aria-label', 'Save'));
    await page.waitForChanges();

    const icon = await page.find('pds-icon');
    expect(icon.getAttribute('aria-hidden')).toBeNull();
    expect(icon.getAttribute('role')).toBe('img');

    const snapshot = await page.accessibility.snapshot();
    expect(findByRole(snapshot, 'button').name.trim()).toBe('Save');
  });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findByRole(node: any, role: string): any {
  if (!node) return null;
  if (node.role === role) return node;
  for (const child of node.children || []) {
    const hit = findByRole(child, role);
    if (hit) return hit;
  }
  return null;
}
