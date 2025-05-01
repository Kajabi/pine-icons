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
   * when the `dir` is `"rtl"`. If `flipRTL` is set to `false`, the icon will not be flipped
   * even if the `dir` is `"rtl"`.
   */
  @Prop() flipRtl?: boolean;

  /**
   * This a combination of both `name` and `src`. If a `src` url is detected
   * it will set the `src` property. Otherwise it assumes it's a built-in named
   * SVG and set the `name` property.
   */
  @Prop() icon?: any;

  /**
   * The name of the icon to use from
   * the built-in set.
   */
  @Prop({ reflect: true }) name?: string;

  /**
   * The size of the icon. This can be
   * 'small', 'regular', 'medium', large, or a
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
    this.waitUntilVisible(this.el, '50px', () => {
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
    if (Build.isBrowser && this.isVisible) {
      const url = getUrl(this);
      if (url) {
        if (pdsIconContent.has(url)) {
          this.svgContent = pdsIconContent.get(url);
        } else {
          getSvgContent(url).then(() => (this.svgContent = pdsIconContent.get(url)));
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
