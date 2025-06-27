import { isEncodedDataUrl, isSvgDataUrl, validateContent } from './validate';

export const pdsIconContent = new Map<string, string>();
const requests = new Map<string, Promise<any>>(); // eslint-disable-line @typescript-eslint/no-explicit-any

let parser: DOMParser;

export const getSvgContent = (url: string, sanitize = false, retryCount = 0) => {
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
            console.warn(`No SVG found in data URL: ${url}`);
            pdsIconContent.set(url, '');
          }
        } catch (error) {
          console.error(`Failed to parse SVG data URL: ${url}`, error);
          pdsIconContent.set(url, '');
        }

        return Promise.resolve();
      } else {
        // Add retry logic and better error handling
        req = fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'image/svg+xml,text/plain,*/*'
          },
          cache: 'force-cache' // Aggressive caching for icons
        }).then((rsp) => {
          if (rsp.ok) {
            return rsp.text().then((svgContent) => {
              if (svgContent && sanitize !== false) {
                svgContent = validateContent(svgContent);
              }
              if (svgContent) {
                pdsIconContent.set(url, svgContent);
              } else {
                console.warn(`Empty SVG content received for: ${url}`);
                pdsIconContent.set(url, '');
              }
            });
          } else {
            throw new Error(`HTTP ${rsp.status}: ${rsp.statusText}`);
          }
        }).catch((error) => {
          console.error(`Failed to fetch icon ${url}:`, error);

          // Retry logic - attempt up to 3 times with exponential backoff
          if (retryCount < 3) {
            const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
            console.log(`Retrying icon load in ${delay}ms (attempt ${retryCount + 1}/3): ${url}`);

            return new Promise((resolve) => {
              setTimeout(() => {
                // Clear the failed request from cache to allow retry
                requests.delete(url);
                resolve(getSvgContent(url, sanitize, retryCount + 1));
              }, delay);
            });
          } else {
            // Final failure - set empty content to prevent infinite loading
            pdsIconContent.set(url, '');
            throw error;
          }
        });

        requests.set(url, req);
      }
    } else {
      console.warn('Fetch or document not available, setting empty icon content');
      pdsIconContent.set(url, '');
      return Promise.resolve();
    }
  }

  return req;
}
