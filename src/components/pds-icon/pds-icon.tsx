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
  @Prop() icon?: string;

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

    // Always attempt to load icon, but add delay for IntersectionObserver to complete
    setTimeout(() => {
      if (!this.didLoadIcon || !this.svgContent) {
        console.warn('Icon not loaded after component mount, forcing load attempt');
        this.isVisible = true; // Force visibility for fallback loading
        this.loadIcon();
      }
    }, 50);
  }

  componentWillLoad() {
    this.inheritedAttributes = inheritAttributes(this.el, ['aria-label']);
    this.setCSSVariables();
  }

  setCSSVariables() {
    this.el.style.setProperty(`--dimension-icon-height`, this.iconSize());
    this.el.style.setProperty(`--dimension-icon-width`, this.iconSize());
    this.el.style.setProperty(`--color-icon-fill`, typeof this.color !== 'undefined' ? this.color : 'currentColor');
  }

  connectedCallback() {
    // Set a fallback timeout in case IntersectionObserver never fires
    // This prevents icons from never loading due to intersection issues
    const fallbackTimeout = setTimeout(() => {
      if (!this.isVisible) {
        console.warn('IntersectionObserver timeout, forcing icon visibility');
        this.isVisible = true;
        this.loadIcon();
      }
    }, 100); // 100ms fallback

    this.waitUntilVisible(this.el, '50px', () => {
      clearTimeout(fallbackTimeout);
      this.isVisible = true;
      this.loadIcon();
    })
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
  loadIcon() {
    if (Build.isBrowser) {
      const url = getUrl(this);
      if (url) {
        if (pdsIconContent.has(url)) {
          this.svgContent = pdsIconContent.get(url);
        } else {
          // Add comprehensive error handling and timeout
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Icon loading timeout')), 10000); // 10 second timeout
          });

          Promise.race([getSvgContent(url), timeoutPromise])
            .then(() => {
              this.svgContent = pdsIconContent.get(url);
              // Force re-render if content was loaded after initial render
              if (!this.svgContent) {
                console.warn(`Icon content not found after successful load: ${url}`);
              }
            })
            .catch((error) => {
              console.error(`Failed to load icon: ${url}`, error);
              // Set empty content to prevent infinite loading state
              pdsIconContent.set(url, '');
              this.svgContent = '';
            });
        }
        this.didLoadIcon = true;
      }
    }

    this.iconName = getName(this.name, this.icon);

    if (this.iconName) {
      this.ariaLabel = this.iconName.replace(/\-/g, ' ');
    }
  }

  render() {
    const { ariaLabel, flipRtl, iconName,inheritedAttributes } = this;
    const shouldIconAutoFlip = iconName
      ? shouldRtlFlipIcon(iconName, this.el) && flipRtl !== false
      : false;
    const shouldFlip = flipRtl || shouldIconAutoFlip;

    // Debug information when enabled
    this.debugIconState();

    return (

      <Host
        aria-label={ariaLabel !== undefined && !this.hasAriaHidden() ? ariaLabel : null }
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

  private debugIconState() {
    if (typeof window !== 'undefined' && (window as Window & { __PDS_ICON_DEBUG__?: boolean }).__PDS_ICON_DEBUG__) {
      console.log('PDS Icon Debug:', {
        name: this.name,
        src: this.src,
        icon: this.icon,
        isVisible: this.isVisible,
        didLoadIcon: this.didLoadIcon,
        svgContent: this.svgContent ? 'loaded' : 'empty',
        url: getUrl(this),
        hasIntersectionObserver: !!this.io,
        element: this.el
      });
    }
  }

  private waitUntilVisible(el: HTMLElement, rootMargin: string, cb: () => void) {
    if (Build.isBrowser && typeof window !== 'undefined' && (window).IntersectionObserver) {
      try {
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

        // Add a safety timeout for IntersectionObserver
        setTimeout(() => {
          if (this.io) {
            console.warn('IntersectionObserver did not trigger within 5 seconds, forcing callback');
            this.io.disconnect();
            this.io = undefined;
            cb();
          }
        }, 5000);
      } catch (error) {
        console.error('IntersectionObserver initialization failed:', error);
        // Fall back to immediate execution
        cb();
      }
    } else {
      // browser doesn't support IntersectionObserver
      // so just fallback to always show it
      cb();
    }
  }

  private hasAriaHidden = () => {
    const { el } = this;

    return el.hasAttribute('aria-hidden') && el.getAttribute('aria-hidden') === 'true';
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
