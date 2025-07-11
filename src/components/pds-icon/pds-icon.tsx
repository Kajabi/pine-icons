import { Build, Component, Element, Host, Prop, State, Watch, h } from '@stencil/core';
import { getSvgContent, pdsIconContent } from './request';
import { getName, getUrl, inheritAttributes, isRTL, shouldRtlFlipIcon } from './utils';

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
  private inheritedAttributes: { [k: string]: any } = {}; // eslint-disable-line @typescript-eslint/no-explicit-any

  @Element() el!: HTMLPdsIconElement;

  @State() private ariaLabel?: string;
  @State() private isVisible = false;
  @State() private svgContent?: string;

  /**
   *
   * The color of the icon
   *
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
    this.inheritedAttributes = inheritAttributes(this.el, ['aria-label']);
    this.setCSSVariables();
    this.setupInitialAriaLabel();
  }

  setCSSVariables() {
    this.el.style.setProperty(`--dimension-icon-height`, this.iconSize());
    this.el.style.setProperty(`--dimension-icon-width`, this.iconSize());
    this.el.style.setProperty(`--color-icon-fill`, typeof this.color !== 'undefined' ? this.color : 'currentColor');
  }

  connectedCallback() {
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
    // Update aria-label when icon properties change
    this.setupInitialAriaLabel();
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
    const { ariaLabel, flipRtl, iconName,inheritedAttributes } = this;
    const shouldIconAutoFlip = iconName
      ? shouldRtlFlipIcon(iconName, this.el) && flipRtl !== false
      : false;
    const shouldFlip = flipRtl || shouldIconAutoFlip;

    // Use inherited aria-label if provided, otherwise fall back to auto-generated one
    const finalAriaLabel = inheritedAttributes['aria-label'] || ariaLabel;

    return (

      <Host
        aria-label={finalAriaLabel !== undefined && !this.hasAriaHidden() ? finalAriaLabel : null }
        alt=""
        role="img"
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

  private setupInitialAriaLabel() {
    // Only set aria-label during initial load if one isn't already provided
    if (!this.inheritedAttributes['aria-label']) {
      const iconName = getName(this.name, this.icon);
      if (iconName) {
        this.ariaLabel = iconName.replace(/\-/g, ' ');
      }
    }
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

  private hasAriaHidden = () => {
    const { el } = this;

    return el.hasAttribute('aria-hidden') && el.getAttribute('aria-hidden') === 'true';
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
