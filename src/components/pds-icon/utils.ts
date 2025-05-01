import { getAssetPath } from './assetPath';

import { PdsIcon } from './pds-icon';

let CACHED_MAP: Map<string, string>;

export const addIcons = (icons: { [name: string]: string; }) => {
  const map = getIconMap();
  Object.keys(icons).forEach(name => map.set(name, icons[name]));
}

export const getIconMap = (): Map<string, string> => {
  if (typeof window === 'undefined') {
    return new Map();
  }  else {
    if (!CACHED_MAP) {
      const win = window as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      win.PdsIcons = win.PdsIcons || {};
      CACHED_MAP = win.PdsIcons.map = win.PdsIcons.map || new Map();
    }

    return CACHED_MAP;
  }
}

export const getName = (
  iconName: string | undefined,
  icon: string | undefined
  ) => {

  if(!iconName && icon && !isSrc(icon)) {
    iconName = icon;
  }

  if (isStr(iconName)) {
    iconName = toLower(iconName);
  }

  if (!isStr(iconName) || iconName.trim() === '') {
    return null;
  }

  const invalidChars = iconName.replace(/[a-z]|-|\d/gi,'');
  if (invalidChars != '') { return null; }

  return iconName;
}

const getNamedUrl = (iconName: string) => {
  const url = getIconMap().get(iconName);
  if (url) {
    return url;
  }

  return getAssetPath(`svg/${iconName}.svg`);
};

export const getSrc = (src: string | undefined) => {
  if (isStr(src)) {
    src = src.trim();

    if (isSrc(src)) {
      return src;
    }
  }

  return null;
}

export const getUrl = (pdsIcon: PdsIcon) => {
  let url = getSrc(pdsIcon.src);
  if (url) {
    return url;
  }

  url = getName(pdsIcon.name, pdsIcon.icon);
  if (url) {
    return getNamedUrl(url);
  }

  if (pdsIcon.icon) {
    url = getSrc(pdsIcon.icon);

    if(url) {
      return url;
    }
  }

  return null;
};


/**
 * Returns `true` if the document or host element
 * has a `dir` set to `rtl`. The host value will always
 * take priority over the root document value.
 */
export const isRTL = (hostEl?: Pick<HTMLElement, 'dir'>) => {
  if (hostEl) {
    if (hostEl.dir !== '') {
      return hostEl.dir.toLowerCase() === 'rtl';
    }
  }
  return document?.dir.toLowerCase() === 'rtl';
};

export const isSrc = (str: string) => str.length > 0 && /(\/|\.)/.test(str);
export const isStr = (val: any): val is string => typeof val === 'string'; // eslint-disable-line @typescript-eslint/no-explicit-any
export const toLower = (val: string) => val.toLowerCase();

/**
 * Elements inside of web components sometimes need to inherit global attributes
 * set on the host. For example, the inner input in `pds-input` should inherit
 * the `title` attribute that developers set directly on `pds-input`. This
 * helper function should be called in componentWillLoad and assigned to a variable
 * that is later used in the render function.
 *
 * This does not need to be reactive as changing attributes on the host element
 * does not trigger a re-render.
 */
 export const inheritAttributes = (el: HTMLElement, attributes: string[] = []) => {
  const attributeObject: { [k: string]: any } = {}; // eslint-disable-line @typescript-eslint/no-explicit-any

  attributes.forEach(attr => {
    if (el.hasAttribute(attr)) {
      const value = el.getAttribute(attr);
      if (value !== null) {
        attributeObject[attr] = el.getAttribute(attr);
      }
      el.removeAttribute(attr);
    }
  });

  return attributeObject;
}

/**
 * Determines if an icon should be flipped when RTL is enabled
 * @param iconName - The name of the icon to check
 * @param hostEl - Optional host element to check for RTL direction
 * @returns {boolean} - True if the icon should be flipped in RTL mode, false otherwise
 */
export const shouldRtlFlipIcon = (iconName: string, hostEl?: Pick<HTMLElement, 'dir'>): boolean => {
  // First check if we're in RTL mode
  const rtlEnabled = isRTL(hostEl);

  // Only flip if we're in RTL mode and the icon is in the flip list
  return rtlEnabled && ICONS_TO_FLIP.includes(iconName);
}

/**
 * Array of available icon names
 */
export const ICONS_TO_FLIP = [
  'align-horizontal-bottom',
  'align-horizontal-center',
  'align-horizontal-top',
  'align-left',
  'align-right',
  'align-vertical-left',
  'align-vertical-right',
  'arrow-corner',
  'arrow-left',
  'arrow-right',
  'calendar-schedule',
  'caret-left',
  'caret-right',
  'cart',
  'cart-add',
  'comment',
  'comment-no',
  'conversation',
  'copy',
  'copy-07',
  'delete-key',
  'delete-x',
  'downsell',
  'drawer-collapse',
  'drawer-expand',
  'duplicate',
  'feedback',
  'file-lock',
  'file-search',
  'form-field',
  'form-filled',
  'left-small',
  'launch',
  'list-bullet',
  'list-numbers',
  'margin-left',
  'margin-right',
  'move-left',
  'move-right',
  'newsletter-2',
  'one-off-session',
  'quote',
  'redo',
  'reset-password',
  'right-small',
  'send-message',
  'share',
  'super-admin',
  'tablet-landscape',
  'undo',
  'user-star',
  'user-star-filled',
  'users',
  'users-filled',
  'users-tone'
];

