import { Build } from '@stencil/core';

let missingAssetPathWarning = false;

declare global {
  interface Window {
    __PINE_ASSET_PATH__?: string
  }
}

/**
 *
 * Reads the component asset path config from meta tag or a global variable.
 * This is a temporary workaround until these issues have been addressed:
 *
 * https://github.com/ionic-team/stencil/issues/2826/
 * https://github.com/ionic-team/stencil/issues/3470
 * https://github.com/ionic-team/stencil-ds-output-targets/issues/186
 */
export const getAssetPath = (path: string) => {
  const metaPineAssetPath = document.head.querySelector<HTMLMetaElement>('meta[data-pine-asset-path]')?.dataset.pineAssetPath;

  // Get the asset path from the window object if available
  const windowAssetPath = window.__PINE_ASSET_PATH__;

  // Set the CDN Asset path using the latest version
  const cdnAssetPath = 'https://cdn.jsdelivr.net/npm/@pine-ds/icons/';

  const assetBasePath  = Build.isTesting ? '/dist/pds-icons' : metaPineAssetPath || windowAssetPath || cdnAssetPath || '/'

  // Display a warning if the assets are fetched from the CDN.
  if ( assetBasePath.startsWith('https://cdn.jsdelivr.net/npm/') && !missingAssetPathWarning ) {
    missingAssetPathWarning = true;
    console.warn(`
      Fetching Pine assets from jsDelivr CDN.\n\n It's recommended that you bundle Pine Assets with your application and set the path accordingly.\n\nFor more information, read the documentation: \nhttps://pine-design-system.netlify.app/?path=/docs/resources-assets--docs
    `)
  }

  let assetPath = path;

  if ( path.startsWith ('./') ) {
    assetPath = path.substring(2);
  }

  if ( !assetBasePath.endsWith('/') ) {
    assetPath = '/' + assetPath;
  }

  return assetBasePath + assetPath;
}


export {};
