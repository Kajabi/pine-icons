import { isEncodedDataUrl, isSvgDataUrl, validateContent } from './validate';

export const pdsIconContent = new Map<string, string>();
const requests = new Map<string, Promise<any>>(); // eslint-disable-line @typescript-eslint/no-explicit-any

let parser: DOMParser;

export const getSvgContent = (url: string, sanitize = false) => {
  let req = requests.get(url);

  if(!req) {
    if (typeof fetch != 'undefined' && typeof document !== 'undefined') {
      if (isSvgDataUrl(url) && isEncodedDataUrl(url)) {
        if (!parser) {
          parser = new DOMParser();
        }

        try {
          const doc = parser.parseFromString(url, 'text/html');
          const svg = doc.querySelector('svg');

          if (svg) {
            pdsIconContent.set(url, svg.outerHTML);
          } else {
            pdsIconContent.set(url, '');
          }
        } catch (error) {
          pdsIconContent.set(url, '');
        }

        return Promise.resolve();
      } else {
        // we don't have a request
        req = fetch(url).then((rsp) => {
          if (rsp.ok) {
            return rsp.text().then((svgContent) => {
              if (svgContent && sanitize !== false) {
                try {
                  svgContent = validateContent(svgContent);
                } catch (validationError) {
                  svgContent = '';
                }
              }
              pdsIconContent.set(url, svgContent || '');
            });
          } else {
            // Handle HTTP errors
            throw new Error(`Failed to load SVG: ${rsp.status} ${rsp.statusText}`);
          }
        }).catch((error) => {
          // Handle all fetch errors gracefully
          console.warn('Failed to load SVG:', url, error);
          pdsIconContent.set(url, '');
          // Don't re-throw to prevent unhandled promise rejections
        });

        requests.set(url, req);
      }
    } else {
      pdsIconContent.set(url, '');
      return Promise.resolve();
    }
  }

  return req;
}
