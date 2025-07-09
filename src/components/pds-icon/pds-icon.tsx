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
  private io?: IntersectionObserver;
  private inheritedAttributes: { [k: string]: any } = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
  private hasInitialized = false;
  private isCurrentlyLoading = false;
  private loadingTimeoutId?: NodeJS.Timeout;
  private iconName: string | null = null;

  @Element() el!: HTMLPdsIconElement;

  @State() private ariaLabel?: string;
  @State() private isVisible = false;
  @State() private svgContent?: string;

  /**
   * The color of the icon
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
   */
  @Prop({ reflect: true }) size?:
    | 'small'   // 12px
    | 'regular'  // 16px
    | 'medium'  // 20px
    | 'large'   // 24px
    | 'auto'
    | string = 'regular'

  /**
   * Specifies the exact `src` of an SVG file to use.
   */
  @Prop() src?: string;

  private iconSize() {
    const sizes: { [key: string]: any } = { // eslint-disable-line @typescript-eslint/no-explicit-any
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

  componentWillLoad() {
    this.inheritedAttributes = inheritAttributes(this.el, ['aria-label']);
    this.iconName = getName(this.name, this.icon);
    if (this.iconName) {
      this.ariaLabel = this.iconName.replace(/\-/g, ' ');
    }
    this.setCSSVariables();
  }

  componentDidLoad() {
    this.setCSSVariables();

    if (!this.svgContent) {
      this.loadingTimeoutId = setTimeout(() => {
        if (!this.svgContent && !this.isCurrentlyLoading) {
          this.isVisible = true;
          this.loadIcon();
        }
      }, 100);
    }
  }

  componentDidUpdate() {
    if (this.isVisible && !this.svgContent && !this.isCurrentlyLoading) {
      this.loadIcon();
    }
  }

  setCSSVariables() {
    this.el.style.setProperty(`--dimension-icon-height`, this.iconSize());
    this.el.style.setProperty(`--dimension-icon-width`, this.iconSize());
    this.el.style.setProperty(`--color-icon-fill`, typeof this.color !== 'undefined' ? this.color : 'currentColor');
  }

  connectedCallback() {
    if (!this.hasInitialized) {
      this.setupVisibilityDetection();
      this.hasInitialized = true;
    } else if (this.svgContent && !this.isVisible) {
      this.isVisible = true;
    }
  }

  disconnectedCallback() {
    if (this.io) {
      this.io.disconnect();
      this.io = undefined;
    }

    if (this.loadingTimeoutId) {
      clearTimeout(this.loadingTimeoutId);
      this.loadingTimeoutId = undefined;
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
    this.iconName = getName(this.name, this.icon);
    if (this.iconName) {
      this.ariaLabel = this.iconName.replace(/\-/g, ' ');
    }
    if (this.isCurrentlyLoading) {
      return;
    }

    if (Build.isBrowser) {
      const url = getUrl(this);
      if (url) {
        this.isCurrentlyLoading = true;

        if (pdsIconContent.has(url)) {
          const cachedContent = pdsIconContent.get(url);
          this.svgContent = cachedContent;
          this.isCurrentlyLoading = false;
        } else {
          getSvgContent(url)
            .then(() => {
              this.svgContent = pdsIconContent.get(url);
            })
            .catch(err => {
              console.error(err);
            })
            .finally(() => {
              this.isCurrentlyLoading = false;
            });
        }
      }
    }
  }

  render() {
    const { ariaLabel, flipRtl, iconName, inheritedAttributes } = this;
    const shouldIconAutoFlip = iconName
      ? shouldRtlFlipIcon(iconName, this.el) && flipRtl !== false
      : false;
    const shouldFlip = flipRtl || shouldIconAutoFlip;

    return (
      <Host
        aria-label={ariaLabel !== undefined && !this.hasAriaHidden() ? ariaLabel : null}
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
    );
  }

  private setupVisibilityDetection() {
    const el = this.el;
    if (this.isElementInViewport()) {
      this.isVisible = true;
      return;
    }

    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.handleRenderOptimization(el);
    } else {
      this.isVisible = true;
    }
  }

  private isElementInViewport(): boolean {
    if (typeof window === 'undefined') return false;

    const rect = this.el.getBoundingClientRect();
    const viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
    const viewWidth = Math.max(document.documentElement.clientWidth, window.innerWidth);

    return !(rect.bottom < 0 ||
      rect.top > viewHeight ||
      rect.right < 0 ||
      rect.left > viewWidth);
  }

  private handleRenderOptimization = (el: HTMLElement | undefined) => {
    if (!el) return;

    const rootMargin = '50px';

    if (Build.isBrowser) {
      if (this.io) {
        this.io.disconnect();
        this.io = undefined;
      }

      this.waitUntilVisible(el, rootMargin, () => {
        this.isVisible = true;
      });
    }
  };

  private waitUntilVisible(el: HTMLElement, rootMargin: string, cb: () => void) {
    if (Build.isBrowser && el) {
      const io = this.io = new IntersectionObserver(data => {
        if (data[0].isIntersecting) {
          io.disconnect();
          this.io = undefined;
          cb();
        }
      }, { rootMargin });

      io.observe(el);
    }
  }

  private hasAriaHidden = () => {
    const hidden = this.inheritedAttributes['aria-hidden'];
    return hidden === '' || hidden === 'true';
  };
}

const createColorClasses = (color: string | undefined) => {
  return color
   ? {
       'pds-color': true,
       [`pds-color-${color}`]: true,
     }
   : null;
 };
