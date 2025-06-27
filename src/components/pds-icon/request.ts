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

        const doc = parser.parseFromString(url, 'text/html');
        const svg = doc.querySelector('svg');

        if (svg) {
          pdsIconContent.set(url, svg.outerHTML);
        }

        return Promise.resolve();
      } else {
        // we don't have a request
        req = fetch(url).then((rsp) => {
          if (rsp.ok) {
            return rsp.text().then((svgContent) => {
              if (svgContent && sanitize !== false) {
                svgContent = validateContent(svgContent);
              }
              pdsIconContent.set(url, svgContent || '');
            });
          }
          pdsIconContent.set(url, '');
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
