import { isEncodedDataUrl, isSvgDataUrl, validateContent } from './validate';

export const pdsIconContent = new Map<string, string>();
const requests = new Map<string, Promise<any>>(); // eslint-disable-line @typescript-eslint/no-explicit-any
const failedRequests = new Set<string>(); // Track failed requests to avoid retries

let parser: DOMParser;

export const getSvgContent = (url: string, sanitize = false, retryCount = 0) => {
  // Check if this URL has already failed multiple times
  if (failedRequests.has(url)) {
    pdsIconContent.set(url, '');
    return Promise.resolve();
  }
  let req = requests.get(url);

  if (!req) {
    if (typeof fetch != 'undefined' && typeof document !== 'undefined') {
      if (isSvgDataUrl(url) && isEncodedDataUrl(url)) {
        if (!parser) {
          parser = new DOMParser();
        }

        try {
          const doc = parser.parseFromString(url, 'text/html');
          const svg = doc.querySelector('svg');

          if (svg) {
            const content = svg.outerHTML;
            pdsIconContent.set(url, content);
          } else {
            pdsIconContent.set(url, '');
          }
        } catch (error) {
          pdsIconContent.set(url, '');
        }

        return Promise.resolve();
      } else {
        req = fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'image/svg+xml,text/plain,*/*'
          },
          cache: 'default',
          signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined
        }).then((rsp) => {
          if (rsp.ok) {
            return rsp.text().then((svgContent) => {
              if (svgContent && sanitize !== false) {
                try {
                  svgContent = validateContent(svgContent);
                } catch (validationError) {
                  svgContent = '';
                }
              }

              if (svgContent) {
                pdsIconContent.set(url, svgContent);
              } else {
                pdsIconContent.set(url, '');
              }
            });
          } else {
            throw new Error(`HTTP ${rsp.status}: ${rsp.statusText}`);
          }
        }).catch((error) => {
          const shouldRetry = retryCount < 3 && !isNonRetryableError(error);

          if (shouldRetry) {
            const delay = getRetryDelay(retryCount, error);

            return new Promise((resolve) => {
              setTimeout(() => {
                requests.delete(url);
                resolve(getSvgContent(url, sanitize, retryCount + 1));
              }, delay);
            });
          } else {
            failedRequests.add(url);
            pdsIconContent.set(url, '');
            throw error;
          }
        });

        requests.set(url, req);
      }
    } else {
      pdsIconContent.set(url, '');
      return Promise.resolve();
    }
  }

  return req;
};

/**
 * Determines if an error should not be retried
 */
const isNonRetryableError = (error: Error): boolean => {
  const nonRetryableTypes = ['TypeError', 'SyntaxError', 'ReferenceError'];
  if (nonRetryableTypes.includes(error.name)) {
    return true;
  }

  const nonRetryableStatuses = ['400', '401', '403', '404', '410'];
  return nonRetryableStatuses.some(status => error.message.includes(status));
};

/**
 * Calculate retry delay with exponential backoff, adjusted by error type
 */
const getRetryDelay = (retryCount: number, error: Error): number => {
  let baseDelay = Math.pow(2, retryCount) * 500;

  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    baseDelay *= 2;
  } else if (error.message.includes('429') || error.message.includes('503')) {
    baseDelay *= 4;
  }

  return Math.min(baseDelay, 5000);
};

/**
 * Clear failed requests (useful for testing or manual retry)
 */
export const clearFailedRequests = () => {
  failedRequests.clear();
};

/**
 * Get cache statistics for debugging
 */
export const getCacheStats = () => {
  return {
    cachedItems: pdsIconContent.size,
    activeRequests: requests.size,
    failedRequests: failedRequests.size,
    cacheEntries: Array.from(pdsIconContent.keys())
  };
};
