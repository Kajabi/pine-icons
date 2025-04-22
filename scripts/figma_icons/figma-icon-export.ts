import * as dotenv from 'dotenv';

/* eslint-disable @typescript-eslint/no-var-requires */
const axios = require('axios');
import chalk from 'chalk'; // Terminal string styling done right
import path from 'path';
import fs from 'fs-extra';

import { run as finalizeExport } from './finalize-export';
import { run as optimizeSvgs} from '../optimize-svgs'

import { FigmaIcon, FigmaIconConfig } from './types';

if (process.env.NODE_ENV !== 'prod') {
  dotenv.config({ path: `${process.cwd()}/.env` });
}

const info = chalk.white;
const error = chalk.red.bold;
const detail = chalk.yellowBright;
const log = console.log;

const defaultBatchSize = 500;

let figmaClient;
let config: FigmaIconConfig;

const run = async (rootDir: string) : Promise<any> => {
  try {
    const optimizedOutputDir = path.join(rootDir, 'src');
    const optimizedOutputSvgDir = path.join(optimizedOutputDir, 'svg');

    config = await loadFigmaIconConfig(rootDir);
    figmaClient =  client(config.figmaAccessToken);

    config.downloadPath = path.join(rootDir, config.downloadPath);

    await fs.emptyDir(config.downloadPath)
    await fs.emptyDir(optimizedOutputSvgDir);

    const results = await config.pageNames.reduce(async (accPromise, pageName) => {
      const acc = await accPromise;

      const result = await processData(rootDir, config, pageName);

      await optimizeSvgs(rootDir, true);

      log(info('Total results processed: ', detail(result.downloaded.length), 'for Page: ', detail(pageName)));

      acc.push(result);

      return acc;
    }, Promise.resolve([]));  // Initial value is a resolved promise with an empty array


    const flattenedResults = results.reduce((acc, item) => {
      // Combine icons
      acc.icons = [...acc.icons, ...item.icons];

      // Combine downloaded
      acc.downloaded = [...acc.downloaded, ...item.downloaded];

      return acc;
    }, { icons: [], downloaded: [] });

    await finalizeExport(config, flattenedResults, rootDir);

    removeTmpDirectory(config);

    return results;
  }
  catch (e) {
    log(error(e));
    process.exit(1);
  }
}

/**
 * Creates the axios client with the appropriate
 * headers and url.
 *
 * @param apiToken required token to pass in the headers
 * @returns Axios client object
 */
const client = (apiToken) => {
  const figmaBaseApiURL = 'https://api.figma.com/v1';
  const instance = axios.create({
    baseURL: figmaBaseApiURL,
    headers: {
      'Content-Type': 'application/json',
      'X-Figma-Token': apiToken
    }
  })

  instance.interceptors.request.use((conf) => {
    conf.startTime = new Date().getTime();

    return conf;
  });

  return instance;
};

/**
 * Downloads the images
 *
 * @param icon - The FigmaIcon object
 * @param outputDir - The directory that the svg will be downloaded
 * @returns a object with the name and size of the svg
 */
const downloadImages = (icons: FigmaIcon[], outputDir: string, pageName: string) => {
  // Ensure the output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Map each icon to a promise that resolves when the download and write is complete
  const downloadPromises = icons.map((icon) => {
    const nameClean = icon.name.toLowerCase();
    const iconNameSuffix = pageName === 'Icons' ? '' : `-${pageName.toLowerCase()}`;
    const filename= `${nameClean}${iconNameSuffix}.svg`;
    const imagePath = path.resolve(outputDir, filename);

    return axios.get(icon.url, { responseType: 'arraybuffer' })
      .then((res) => {
        fs.writeFileSync(imagePath, res.data);
        icon.filesize = fs.statSync(imagePath).size;
        log(info('Successfully downloaded and saved:'), detail(filename));

        return {
          name: filename,
          size: icon.filesize
        };
      })
      .catch((err) => {
        logErrorMessage(`Failed to download ${icon.name} from ${icon.url}:`, err.message);
        throw err; // Re-throw to handle in Promise.all
      });
  });

  return Promise.all(downloadPromises)
    .then((results) => {
      info('All downloads completed successfully.');
      return results; // Array of all icon file details
    })
    .catch((err) => {
      logErrorMessage('An error occurred while downloading images:', err);
      throw err;
    });
};

const isNotIgnored = (value) => {
  return !value.name.startsWith('_');
}

const isNotText = (value) => {
  return value.type.toLowerCase() !== 'text';
}

/**
 * Extract all the icons from figma page data.
 *
 * @param pageData - an object containing the Page details
 * @param ignoreFrames - an array of names to be ignored
 * @param componentMetadata - an object containing additional details for the icon
 * @returns An array of FigmaIcons
 */
const extractIcons = (pageData, ignoreFrames: string[], componentMetadata, pageName) => {

  const iconFrames = pageData.children.filter(isNotIgnored);

  log(info('-- # of Frames to be processed: ', detail(iconFrames.length)));
  const iconLibrary: Array<FigmaIcon> = [];

  iconFrames.forEach((frame) => {
    if ( ['COMPONENT_SET', 'FRAME'].includes(frame.type) && !ignoreFrames?.includes(frame.name)) {
      const components = frame.children.filter(isNotText);

      log(info('---- Frame:', detail(frame.name), ':', detail(components.length).trim(), 'icons'));

      const componentSuffix = pageName === pageData.name ? '' : `-${pageData.name}`;
      components.forEach( (component) => {
        const icon = {
          id: component.id,
          frame: frame.name.toLowerCase().replaceAll(' ', '-'),
          name: !isNaN(component.name) ?  `number-${component.name}${componentSuffix}`: `${component.name}${componentSuffix}`
        };


        if (componentMetadata[component.id] !== undefined ) {
          icon["tags"] = componentMetadata[component.id].description
        }

        iconLibrary.push(icon)
      });
    }
  });

  return iconLibrary;
}

/**
 * Process that finds and downloads SVGs
 *

 * @param fileId - The unique Id for the Figma File
 * @param config - The configuration object
 * @param iconLibrary - The array of FigmaIcons
 * @returns - An object with the icons and downloaded SVGs
 */
const fetchAndDownloadIcons = async (fileId: string, config: FigmaIconConfig, iconLibrary, pageName: string) => {
  try {
    const icons: Array<FigmaIcon> = await fetchImageUrls(fileId, iconLibrary)

    const outputDirectory = config.downloadPath;

    const allIcons = await downloadImages(icons, outputDirectory, pageName);

    return {
      icons: iconLibrary,
      downloaded: allIcons,
    }

  } catch (e) {
    logErrorMessage('fetchAndDonwloadIcons', e);
  }
}

/**
 * Process that will make an API call to retrieve
 * the FigmaFile data
 *
 * @oaram fileId - string: the fileId of the Figma File / Branch
 * @returns - JSON data from Figma API - See  {@link https://www.figma.com/developers/api#get-files-endpoint | GET File}
 */
const fetchFigmaData = (fileId: string) => {
  const requestPath = `files/${fileId}?branch_data=true`;

  const data = figmaClient.get(requestPath)
    .then((resp) => {
      return resp.data;
    })
    .catch((err) => {
      log(error('Error occurred fetching Figma Data, error: ', err));
    });

  return data;
}

/**
 * Sends a request to get a collection
 * icon urls to download
 *
 * @param fileId - The FileId that contains the icons
 * @param icons - An array of @see {@link FigmaIcon}
 * @returns - Array<FigmaIcon> with urls
 */
const fetchImageUrls = (fileId: string, icons: Array<FigmaIcon>) => {
  return new Promise<FigmaIcon[]>((resolve) => {
    const iconIds = icons.map(icon => icon.id).join(',')

    figmaClient.get(`images/${fileId}?ids=${iconIds}&format=svg`)
      .then((res) => {
        const imageUrls: string[] = res.data.images;
        log(info(`Image Api returned ${chalk.yellowBright(Object.keys(res.data.images).length)} image urls\n`));

        icons.forEach(icon => {
          icon.url = imageUrls[icon.id]
        })

        resolve(icons);
      })
      .catch((err) => {
        log(error('Unable to get icons: ', err));
        process.exit(1);
      });
  })
}

/**
 * Locate the page in the Figma Data
 *
 * @param document - Figma document data
 * @param pageName - Name of the page to find
 * @returns a Node with the Page data
 */
const findPage = (document, pageName: string,) => {
  const iconPage = document.children.find(c => c.name === pageName);

  if (!iconPage) {
    log(error('No Page found, please check the name "', chalk.white.bgRedBright(pageName), '"'));
    process.exit(1);
    // throw error(`No Page found, please check the name "${chalk.white.bgRedBright(pageName)}"`)
  }

  return iconPage
};

/**
 * Loads the figma-icon-config
 *
 * @params rootDir - The source directory
 * @returns FigmaIconConfig object
 */
const loadFigmaIconConfig = async (rootDir: string) => {
  try {
    const configFile =  path.resolve(path.join(rootDir, 'figma-icon-config.json'));

    if (fs.existsSync(configFile)) {
      log(info('Config file located at: ', detail(configFile)));

      const strConfig = await fs.readFile(configFile, 'utf-8');
      const config = JSON.parse(strConfig) as FigmaIconConfig;

      let hasError = false;

      setFigmaBatchSize(config);
      hasError ||= setFigmaAccessToken(config);
      hasError ||= setFigmaFileId(config);

      if (hasError) {
        logErrorMessage('loadFigmaIconConfig', null);
        process.exit(1);
      }

      return config;
    }
  }
  catch (e) {
    logErrorMessage('loadFigmaIconConfig', e);
    process.exit(1);
  }
}

/**
 * The main process that invokes the Figma Export process
 *
 * @params rootDir - The initial starting directory
 * @params config - The config data
 */
const processData = async (_rootDir: string, config: FigmaIconConfig, pageName) => {
  try {
    let figmaFileId = config.figmaFileId;
    let figmaData = await fetchFigmaData(figmaFileId);

    if ( config.branchName && figmaData.branches.length > 0) {
      const branch = figmaData.branches.find(b => b.name.toLowerCase() === config.branchName.toLowerCase())

      if (!branch) {
        log(error('No branch found with the name'), chalk.white.bgRed(config.branchName));
        process.exit(1);
      }

      figmaFileId = branch.key;
      log(info('Found branch!! Retrieving data for Branch:',detail(config.branchName), ', Branch File id:',detail(figmaFileId)));

      figmaData = await fetchFigmaData(figmaFileId);
    }

    log(info('Page to be processed: ', detail(pageName)));
    const page = findPage(figmaData.document, pageName);
    const iconsArray = extractIcons(page, config.ignoreFrames, figmaData.components, pageName);
    const batches = splitIntoBatches(iconsArray, config.batchSize);

    log(chalk.yellowBright(iconsArray.length), info('icons have been extracted'))

    let output = { icons: [], downloaded: [] };

    const iconResults = Promise.all(batches.map(async (batch, idx) => {
      log("Processing batch", chalk.yellowBright(idx+1), " of ", chalk.yellowBright(batches.length, " with ", chalk.yellowBright(batch.length), " icons"));

      const downloaded = await fetchAndDownloadIcons(figmaFileId, config, batch, pageName);

      return downloaded;
    })).then((results) => {
      if (results.length === 0) {
        return output;
      }

      output = results.reduce((acc, iconResult) => {
        acc.icons = acc.icons.concat(iconResult.icons);
        acc.downloaded = acc.downloaded.concat(iconResult.downloaded);
        return acc;
      });

      return output;
    });

    return iconResults;

  } catch (e) {
    logErrorMessage('processData', e);
  }
}

/***************************/
/*  Kicks off the Process  */
/***************************/
console.log(path.join(__dirname, '../..'))
run(path.join(__dirname, '../..'));

/**
 *
 * Helper Methods
 *
 *
 */

/**
 * Logs an error message
 * @param methodName - the name of the method the error occurred in
 * @param err - the error
 */
const logErrorMessage = (methodName: string, err) => {
  log('Error in ' , detail(methodName), '\n Message: ', error(err));
}

/**
 * Removes the tmp directory created during
 * the download process from the FigmaAPI
 *
 * @param config - FigmaIconConfig object
 */
const removeTmpDirectory = (config: FigmaIconConfig) => {
  log('Removing tmp directory')
  const tmpDir = path.join(config.downloadPath, '..');
  fs.rmSync(tmpDir, { force: true, recursive: true });
}

/**
 * Reads the batchSize if set in the
 * configuration file or environment variable.
 * If one is not found, it will use the default of 500
 *
 * @param config  - FigmaIconConfig object
 * @returns boolean - hasError occurred
 */

const setFigmaBatchSize = (config: FigmaIconConfig) => {
  switch(true) {
    case (!!process.env.BATCH_SIZE == true):
      log(info('Using Batch Size in ', detail('ENVIRONMENT variable')));
      config.batchSize = parseInt(process.env.BATCH_SIZE);
      break;

    case (!!config.batchSize == true):
      log(info('Using Batch Size in ', detail('CONFIGURATION file')));
      break;

    case (!config.batchSize && !process.env.BATCH_SIZE) == true:
      config.batchSize = defaultBatchSize
      log(info('Using default Batch Size of ', detail(defaultBatchSize)));
      break;
  }
}

/**
 * Reads and Sets the Figma access token
 *
 * @params config - FigmaIconConfig object
 * @returns boolean - hasError occurred
 */
const setFigmaAccessToken = (config: FigmaIconConfig) => {
  let hasError = false;

  // Figma Token check
  // Config file overrides Environment variable
  switch(true) {
    // Use Environment variable
    case (!!process.env.FIGMA_ACCESS_TOKEN == true):
      log(info('Using Figma Access Token in ', detail('ENVIRONMENT variable')));
      config.figmaAccessToken = process.env.FIGMA_ACCESS_TOKEN;
      break;

    case (!!config.figmaAccessToken == true):
      log(info('Using Figma Access Token in ', detail('CONFIGURATION file')));
      break;

    case (!config.figmaAccessToken && !process.env.FIGMA_ACCESS_TOKEN) == true:
      hasError ||= true;
      log(error('No Figma Access Token has been provided!!!!!'));
      break;
  }

  return hasError;
}

/**
 * Sets the Figma file id
 *
 * @params config - FigmaIconConfig object
 * @returns boolean - hasError occurred
 */
const setFigmaFileId = (config: FigmaIconConfig) => {
  let hasError = false

  // Figma File Id check
  // Config file overrides Environment Variable
  switch(true) {
    // Use Environment variable
    case (!!process.env.FIGMA_FILE_ID == true):
      log(info('Using Figma File Id in ',detail('ENVIROMENT variable')));
      config.figmaFileId = process.env.FIGMA_FILE_ID
      break;

    // Use provided token in config
    case (!!config.figmaFileId == true):
      log(info('Using Figma File Id in ',detail('Configuration file')));
      break;


    // Render error and exit process
    case (!config.figmaFileId  && !process.env.FIGMA_FILE_ID) == true:
      hasError ||= true;
      log(error('No Figma File Id has been provided!!!!'))

      break;
  }

  return hasError;
}

/**
 * Splits the result set of FigmaIcons into
 * smaller processible batches for Figma API
 *
 * @param array - an array of FigmaIcon objects
 * @param batchSize - size of the batch
 * @returns array - an array of arrays of FigmaIcon objects
 */
const splitIntoBatches = ( array: Array<FigmaIcon>, batchSize: number) => {
  const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      const batch = array.slice(i, i + batchSize);
      batches.push(batch);
    }
    return batches;
}

