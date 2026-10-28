import { Build, Component, Element, Host, Prop, State, Watch, h } from '@stencil/core';
import { getSvgContent, pdsIconContent } from './request';
import { getName, getUrl, inheritAttributes, isRTL, normalizeColorValue, shouldRtlFlipIcon } from './utils';

// The attributes that give an icon its own accessible name.
const NAMING_ATTRIBUTES = ['aria-label', 'aria-labelledby'];

@Component({
  tag: 'pds-icon',
  assetsDirs: ['svg'],
  styleUrl: 'pds-icon.scss',
  shadow: true,
})
export class PdsIcon {
  private didLoadIcon = false;
  private iconName: string | null = null;
  private io?: IntersectionObserver;
  private mo?: MutationObserver;
  private warnedUnnamedFocusable = false;

  @Element() el!: HTMLPdsIconElement;

  @State() private inheritedAttributes: { [k: string]: any } = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
  @State() private isFocusable = false;
  @State() private isVisible = false;
  @State() private svgContent?: string;

  /**
   * Sets the icon's fill color. Accepts a raw design token (--pine-color-foo),
   * a CSS variable (var(--pine-color-foo)), or a literal CSS color value.
   * Defaults to `currentColor`.
   */
  @Prop() color?: string;

  /**
   * Determines if the icon should be flipped when the `dir` is right-to-left (`"rtl"`).
   * This is automatically enabled for icons that are in the `ICONS_TO_FLIP` list and
   * when the `dir` is `"rtl"`. If `flipRtl` is set to `false`, the icon will not be flipped
   * even if the `dir` is `"rtl"`.
   */
  @Prop() flipRtl?: boolean;

  /**
   * This is a combination of both `name` and `src`. If a `src` URL is detected,
   * it will set the `src` property. Otherwise it assumes it's a built-in named
   * SVG and sets the `name` property.
   */
  @Prop() icon?: any;

  /**
   * The name of the icon to use from
   * the built-in set.
   */
  @Prop({ reflect: true }) name?: string;

  /**
   * The size of the icon. This can be
   * 'small', 'regular', 'medium', 'large', or a
   * custom value (40px, 1rem, etc)
   *
   */
  @Prop({ reflect: true }) size?:
    | 'small'   // 12px
    | 'regular'  // 16px
    | 'medium'  // 20px
    | 'large'   // 24px
    | 'auto'
    | string = 'regular'

  /**
   *
   * Specifies the exact `src` of an SVG file to use.
   */
  @Prop() src?: string;

  private iconSize() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sizes: { [key: string]: any } = {
      small: '12px',
      regular: '16px',
      medium: '20px',
      large: '24px',
    }

    if (sizes[this.size]) {
      return sizes[this.size];
    } else {
      return this.size;
    }
  }

  componentDidLoad() {
    this.setCSSVariables();

    if (!this.didLoadIcon) {
      this.loadIcon();
    }

    // Fallback: Ensure icon loads even if IntersectionObserver doesn't fire
    setTimeout(() => {
      if (!this.svgContent && !this.isVisible) {
        this.isVisible = true;
        this.loadIcon();
      }
    }, 100);

    // Additional fallback for client-side navigation (React Router, etc.)
    // React's useLayoutEffect and rendering cycles can delay visibility detection
    setTimeout(() => {
      if (!this.svgContent && !this.isVisible) {
        this.isVisible = true;
        this.loadIcon();
      }
    }, 500);
  }

  componentWillLoad() {
    this.inheritedAttributes = inheritAttributes(this.el, NAMING_ATTRIBUTES);
    this.isFocusable = this.el.hasAttribute('tabindex');
    this.setCSSVariables();
  }

  setCSSVariables() {
    this.el.style.setProperty(`--dimension-icon-height`, this.iconSize());
    this.el.style.setProperty(`--dimension-icon-width`, this.iconSize());
    this.el.style.setProperty(`--color-icon-fill`, normalizeColorValue(this.color) ?? 'currentColor');
  }

  connectedCallback() {
    this.observeNamingAttributes();

    // Handle re-connection during client-side navigation
    if (!this.isVisible && !this.svgContent) {
      this.waitUntilVisible(this.el, '50px', () => {
        this.isVisible = true;
        this.loadIcon();
      });
    }

    // Immediate load attempt if already visible (e.g., during React navigation)
    if (this.isElementInViewport(this.el)) {
      this.isVisible = true;
      this.loadIcon();
    }
  }

  disconnectedCallback() {
    if (this.io) {
      this.io.disconnect();
      this.io = undefined;
    }

    if (this.mo) {
      this.mo.disconnect();
      this.mo = undefined;
    }
  }

  @Watch('size')
  @Watch('color')
  updateStyles() {
    this.setCSSVariables();
  }

  @Watch('name')
  @Watch('src')
  @Watch('icon')
  onIconPropertyChange() {
    this.loadIcon();
  }

  loadIcon() {
    // Reset load state when URL changes
    this.didLoadIcon = false;

    // Clear existing content to prevent stale content when switching icons
    this.svgContent = undefined;

    if (Build.isBrowser && this.isVisible) {
      const url = getUrl(this);
      if (url) {
        if (pdsIconContent.has(url)) {
          this.svgContent = pdsIconContent.get(url);
        } else {
          // Fix: Ensure promise callback triggers re-render and handle errors
          getSvgContent(url)
            .then(() => {
              // Force re-render by setting state in next tick
              setTimeout(() => {
                this.svgContent = pdsIconContent.get(url);
              }, 0);
            })
            .catch(() => {
              // Handle fetch errors gracefully
              this.svgContent = '';
            });
        }
        this.didLoadIcon = true;
      }
    }

    this.iconName = getName(this.name, this.icon);
  }

  render() {
    const { flipRtl, iconName, inheritedAttributes } = this;
    const shouldIconAutoFlip = iconName
      ? shouldRtlFlipIcon(iconName, this.el) && flipRtl !== false
      : false;
    const shouldFlip = flipRtl || shouldIconAutoFlip;

    // An icon is decorative unless the author names it. A decorative icon is hidden
    // from assistive technology, so it contributes nothing to the accessible name of
    // the button or link it sits inside. Naming it from `name` instead would put an
    // icon id ("rocket-tone") into that control's name, where neither a screen reader
    // nor a page-inspecting agent can tell it apart from the real label.
    //
    // A focusable icon stays exposed even without a name: hiding something that
    // takes focus leaves keyboard users on an element a screen reader can't see.
    const isNamed = NAMING_ATTRIBUTES.some((attr) => inheritedAttributes[attr] !== undefined);
    const isDecorative = !isNamed && !this.isFocusable;

    if (Build.isDev && !isNamed && this.isFocusable && !this.warnedUnnamedFocusable) {
      this.warnedUnnamedFocusable = true;
      console.warn(
        '[pds-icon] A focusable icon needs an accessible name. Add an aria-label, or remove its tabindex.',
        this.el,
      );
    }

    return (

      <Host
        // undefined, not null: null would strip an aria-hidden the author set on a
        // named icon once the component re-renders.
        aria-hidden={isDecorative ? 'true' : undefined}
        alt=""
        role={isDecorative ? null : 'img'}
        class={{
          ...createColorClasses(this.color),
          'flip-rtl': shouldFlip,
          'icon-rtl': shouldFlip && isRTL(this.el)
        }}
        {...inheritedAttributes}
      >
        {Build.isBrowser && this.svgContent ? (
          <div class="icon-inner" innerHTML={this.svgContent}></div>
        ) : (
          <div class="icon-inner"></div>
        )}
      </Host>
    )
  }

  /*****
   * Private Methods
   ****/

  // The hide/expose decision reads the naming attributes and tabindex, which can
  // change after load (a React prop going from undefined to a string, or
  // setAttribute from script). Re-read them when they do.
  private observeNamingAttributes() {
    if (!Build.isBrowser || typeof MutationObserver === 'undefined' || this.mo) return;

    this.mo = new MutationObserver(() => {
      const next = { ...this.inheritedAttributes };
      let changed = false;

      NAMING_ATTRIBUTES.forEach((attr) => {
        const value = this.el.getAttribute(attr) ?? undefined;
        if (next[attr] !== value) {
          if (value === undefined) {
            delete next[attr];
          } else {
            next[attr] = value;
          }
          changed = true;
        }
      });

      if (changed) this.inheritedAttributes = next;
      this.isFocusable = this.el.hasAttribute('tabindex');
    });

    this.mo.observe(this.el, { attributes: true, attributeFilter: [...NAMING_ATTRIBUTES, 'tabindex'] });
  }

  private waitUntilVisible(el: HTMLElement, rootMargin: string, cb: () => void) {
    if (Build.isBrowser && typeof window !== 'undefined' && (window).IntersectionObserver) {
      const io = (this.io = new (window).IntersectionObserver(
        (data: IntersectionObserverEntry[]) => {
          if (data[0].isIntersecting) {
            io.disconnect();
            this.io = undefined;
            cb();
          }
        },
        { rootMargin },
      ));

      io.observe(el);

      // Safety timeout for client-side navigation scenarios
      // Sometimes IntersectionObserver doesn't fire during React navigation
      setTimeout(() => {
        if (this.io && !this.isVisible) {
          // Check if element is actually visible in viewport
          if (this.isElementInViewport(el)) {
            this.io.disconnect();
            this.io = undefined;
            cb();
          }
        }
      }, 1000);
    } else {
      // browser doesn't support IntersectionObserver
      // so just fallback to always show it
      cb();
    }
  }

  private isElementInViewport(el: HTMLElement): boolean {
    if (!el || !el.isConnected) return false;

    const rect = el.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;

    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= windowHeight &&
      rect.right <= windowWidth
    ) || (
      // Also consider partially visible elements
      rect.top < windowHeight &&
      rect.bottom > 0 &&
      rect.left < windowWidth &&
      rect.right > 0
    );
  }

  /**
   * Debug method to help diagnose loading issues
   * Call from browser console: document.querySelector('pds-icon').debugIconState()
   */
  debugIconState() {
    const url = getUrl(this);
    const rect = this.el.getBoundingClientRect();

    console.log('PdsIcon Debug State:', {
      name: this.name,
      src: this.src,
      icon: this.icon,
      iconName: this.iconName,
      url,
      isVisible: this.isVisible,
      didLoadIcon: this.didLoadIcon,
      hasSvgContent: !!this.svgContent,
      svgContentLength: this.svgContent?.length || 0,
      isInCache: url ? pdsIconContent.has(url) : false,
      cachedContent: url ? pdsIconContent.get(url) : null,
      element: this.el,
      // Client-side navigation specific debug info
      isConnected: this.el.isConnected,
      isInViewport: this.isElementInViewport(this.el),
      hasIntersectionObserver: !!this.io,
      boundingClientRect: rect,
      windowDimensions: {
        width: window.innerWidth || document.documentElement.clientWidth,
        height: window.innerHeight || document.documentElement.clientHeight
      }
    });
  }
}

const createColorClasses = (color: string | undefined) => {
  return color
   ? {
       'pds-color': true,
       [`pds-color-${color}`]: true,
     }
   : null;
 };
