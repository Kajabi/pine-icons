import * as dotenv from 'dotenv';

/* eslint-disable @typescript-eslint/no-var-requires */
const axios = require('axios');
import chalk from 'chalk'; // Terminal string styling done right
import path from 'path';
import fs from 'fs-extra';
import mkdirp from 'mkdirp';

import { run as finalizeExport } from './finalize-export';
import { run as optimize } from '../optimize-svgs'

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
    config = await loadFigmaIconConfig(rootDir);
    figmaClient =  client(config.figmaAccessToken);

    const results = await processData(rootDir, config);

    await optimize(rootDir, true);

    await finalizeExport(config, results, rootDir);

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
 * Creates the directory that will
 * contain the SVGs
 *
 * @param outputDir - The directory name to create
 */
const createOutputDirectory = async (outputDir: string) => {
  return new Promise<void>((resolve) => {
    const directory = path.resolve(outputDir);

    if(!fs.existsSync(directory)) {
      log(info(`Directory ${outputDir} does not exist`));

      if (mkdirp.sync(directory)) {
        log(info(`Created directory ${outputDir}`))
        resolve();
      }
    }
    else {
      resolve();
    }
  })
}

/**
 * Downloads the images
 *
 * @param icon - The FigmaIcon object
 * @param outputDir - The directory that the svg will be downloaded
 * @returns a object with the name and size of the svg
 */
const downloadImages = (icons: FigmaIcon[], outputDir: string) => {
  // Ensure the output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Map each icon to a promise that resolves when the download and write is complete
  const downloadPromises = icons.map((icon) => {
    const nameClean = icon.name.toLowerCase();
    const imagePath = path.resolve(outputDir, `${nameClean}.svg`);

    return axios.get(icon.url, { responseType: 'arraybuffer' })
      .then((res) => {
        fs.writeFileSync(imagePath, res.data);
        icon.filesize = fs.statSync(imagePath).size;
        log(info('Successfully downloaded and saved:'), detail(`${icon.name}.svg`));

        return {
          name: `${icon.name}.svg`,
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
const extractIcons = (pageData, ignoreFrames: string[], componentMetadata) => {

  const iconFrames = pageData.children.filter(isNotIgnored);

  log(info('Frames to be processed: ', detail(iconFrames.length)));
  const iconLibrary: Array<FigmaIcon> = [];

  iconFrames.forEach((frame) => {
    if ( ['COMPONENT_SET', 'FRAME'].includes(frame.type) && !ignoreFrames?.includes(frame.name)) {
      const components = frame.children.filter(isNotText);

      log(info('---- Frame:', detail(frame.name), ':', detail(components.length).trim(), 'icons'));

      const componentSuffix = config.pageName === pageData.name ? '' : `-${pageData.name}`;
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
const fetchAndDownloadIcons = async (fileId: string, config: FigmaIconConfig, iconLibrary) => {
  try {
    const icons: Array<FigmaIcon> = await fetchImageUrls(fileId, iconLibrary)

    const outputDirectory = config.downloadPath;

    const allIcons = await downloadImages(icons, outputDirectory);
    console.log('allIcons: ', allIcons.length)

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

      hasError ||= setFigmaBatchSize(config);
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
const processData = async (rootDir: string, config: FigmaIconConfig) => {
  try {
    config.downloadPath = path.join(rootDir, config.downloadPath);

    let figmaFileId = config.figmaFileId;
    let figmaData = await fetchFigmaData(figmaFileId);

    if ( config.branchName && figmaData.branches.length > 0) {
      const branch = figmaData.branches.find(b => b.name === config.branchName)

      if (!branch) {
        log(error('No branch found with the name'), chalk.white.bgRed(config.branchName));
        process.exit(1);
      }

      figmaFileId = branch.key;
      log(info('Found branch!! Retrieving data for Branch:',detail(config.branchName), ', Branch File id:',detail(figmaFileId)));

      figmaData = await fetchFigmaData(figmaFileId);
    }

    // TODO: Changes need to be made here to iterate multiple pages which will need to include the page name to name icons
    const page = findPage(figmaData.document, config.pageName);

    const iconsArray = extractIcons(page, config.ignoreFrames, figmaData.components);
    const batches = splitIntoBatches(iconsArray, config.batchSize);

    log(chalk.yellowBright(iconsArray.length), info('icons have been extracted'))

    const response = await fs.emptyDir(config.downloadPath)
    .then(() => {
      let output = { icons: [], downloaded: [] };

      const outputDirectory = config.downloadPath; //.concat(`-${batchNo}`)

      createOutputDirectory(outputDirectory);
      fs.emptyDirSync(outputDirectory);

      const iconResults = Promise.all(batches.map(async (batch, idx) => {
        log("Processing batch", chalk.yellowBright(idx+1), " of ", chalk.yellowBright(batches.length, " with ", chalk.yellowBright(batch.length), " icons"));

        const downloaded = await fetchAndDownloadIcons(figmaFileId, config, batch);

        return downloaded;
      })).then((results) => {
        output = results.reduce((acc, iconResult) => {
          acc.icons = acc.icons.concat(iconResult.icons);
          acc.downloaded = acc.downloaded.concat(iconResult.downloaded);
          return acc;
        });

        return output;
      });

      return iconResults;
    })

    return response;
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
 * Reads the batchSize if set in the
 * configuration file or environment variable.
 * If one is not found, it will use the default of 500
 *
 * @param config  - FigmaIconConfig object
 * @returns boolean - hasError occurred
 */

const setFigmaBatchSize = (config: FigmaIconConfig) => {
  let hasError = false;

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

  return hasError;
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
  let batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      let batch = array.slice(i, i + batchSize);
      batches.push(batch);
    }
    return batches;
}

