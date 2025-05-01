import { collectionCopy } from '../collection-copy';

import chalk from 'chalk'; // Terminal string styling done right
import path from 'path';
import fs from 'fs-extra';
import { exec } from 'node:child_process';
import { simpleGit, SimpleGitOptions, StatusResult } from 'simple-git';
import { FigmaIcon, FigmaIconConfig, SvgDiffResult } from './types';

const info = chalk.white;
const error = chalk.red.bold;
const detail = chalk.yellowBright;
const log = console.log;

const baseDir = process.cwd();
const scriptsDir = path.join(baseDir, 'scripts');
const srcDir = path.join(baseDir, 'src');
const srcSvgBasePath = path.join(srcDir, 'svg');

const date = new Date();
const strDate = [date.getFullYear().toString(), (date.getMonth() + 1).toString().padStart(2,'0'), date.getDate().toString().padStart(2, '0')].join('-');


export const run = async(config, data, rootDir: string) => {
  const git = gitClient();
  await git.add(srcSvgBasePath);

  const statusResults: StatusResult = await git.status([srcSvgBasePath]);
  const filesChanged = statusResults.files;

  // Even if there are no changes, we still want to update the index.html
  if (filesChanged.length <= 0) {
    log(detail('No SVG changes were found. Proceeding to update index.html...'))

    removeTmpDirectory(config);

    return;
  }

  log('Copying collections...');
  await collectionCopy(rootDir);

  log(info('Creating JSON Icon List'));
  createJsonIconList(data.icons, srcDir);

  log(info('Calling createChangelogHTML'));
  await createChangelogHTML(statusResults);

  // restore staged files in case of failure
  exec(`git restore --staged ${srcSvgBasePath}`)
}

/**
 *
 * Helper Methods
 *
 *
 */

/**
 * Reads the file contents to read the Svg File and stores
 * into a property to be used later
 *
 * @param status - staus indicator, this could be D - deleted, M - modified, or empty - new
 * @param filePath - relattive path to the file
 * @returns - SvgDiffResult
 */
const buildBeforeAndAfterSvg = async (status: string, filePath: string, previousFilePath: string = null):  Promise<SvgDiffResult> => {
  const filename = path.basename(filePath);
  const previousFileName = previousFilePath && path.basename(previousFilePath);

  let beforeSvg = null;
  let afterSvg = null;

  switch(status) {
    case 'D':
      beforeSvg = await getFileContentsFromGit(filePath);
      break;

    case 'M':
      beforeSvg = await getFileContentsFromGit(filePath);
      afterSvg = await getFileContentsFromDisk(filename)
      break;

    case 'R':
        beforeSvg = await getFileContentsFromGit(previousFilePath);
        afterSvg = await getFileContentsFromDisk(filename)
        break;

    case '':
      afterSvg = await getFileContentsFromDisk(filename);
      break;
  }


  return {
    previousFileName,
    filename,
    status,
    before: beforeSvg,
    after: afterSvg,
  }
}

/**
 * Generates a Header, table, and description
 *
 * @param sectionName - name used for the Header
 * @param data - an array of {@link SVGDiffResult}
 * @param description - text to display under the table as a description
 * @returns The string of html used to represent a section e.g Added in the Changelog
 */
const buildHTMLSection = (sectionName: string, data: Array<SvgDiffResult>, description: string) => {
  const content = `<h2>${sectionName}</h2>`;
  const table: string = buildHTMLTable(data, sectionName == 'Renamed');
  const desc = `<p>${description}</p>`;

  return [content, table, desc].join('\n');
}


/**
 * Generates a HTML Table
 *
 * @param data  an array of {@link SvgDiffResult}
 * @returns - The html table markup
 */
const buildHTMLTable = (data: Array<SvgDiffResult>, isRenamed = false) => {
  const tableRows = data.map((diff) => `<tr>
  ${ isRenamed ? `<td>${diff.previousFileName}</td>` : ''}
  <td>${diff.filename}</td>
  <td>${diff.before || ''}</td>
  <td>${diff.after || ''}</td>
</tr>`);

  const tableBody = `<tbody>
    ${tableRows.join('')}
  </tbody>`

  const table = `<table class="changelog-table">
  <thead>
    <tr>
      ${ isRenamed ? `<td>Previous Filename</td>` : ''}
      <td>${ isRenamed ? `New Filename</td>` : 'FileName'}</td>
      <td>Before</td>
      <td>After</td>
    </tr>
  </thead>
  ${tableBody}
</table>`

  return table;
}

/**
 * Creates the Changelog.html file based on the
 * latest data pulled from Figma
 *
 * @returns The results from SimpleGit.status()
 */
const createChangelogHTML = async (statusResults: StatusResult) => {
  const { modified, created, deleted, renamed } = await processStatusResults(statusResults);

  // Adding or Deleting will be Major version bump
  // Modifying will be a MINOR version bump

  const html = fs.readFileSync(path.join(scriptsDir, 'figma_icons', 'changelog-template.html'), 'utf8')
    .replace(/{{date}}/g, strDate)
    .replace(/{{modified}}/g, statusResults.modified.length.toString())
    .replace(/{{deleted}}/g, statusResults.deleted.length.toString())
    .replace(/{{created}}/g, statusResults.created.length.toString())
    .replace(/{{renamed}}/g, statusResults.renamed.length.toString())
    .replace(/{{content}}/g, [created, modified, deleted, renamed].join('\n'));

  const changelogFilename = `${strDate}-changelog.html`
  const changelogPath = path.join(baseDir, 'changelogs');
  const fullChangelogFilename = path.join(changelogPath, changelogFilename)

  // Write file to changelogs directory
  fs.writeFileSync(fullChangelogFilename, html);

  const arrChangelogs = fs.readdirSync(changelogPath);

  const changelogRecords = [];
  let numberOfChangelogs = 0;

    arrChangelogs.reverse().forEach((filename, idx) => {
      if (path.extname(filename) === '.html') {
        if (idx < 10) {
          const changelogContent = fs.readFileSync(path.join(changelogPath, filename), 'utf8');
          const versionMatch = changelogContent.match(/Pine Icons - (v[\d.]+)/);
          const version = versionMatch ? versionMatch[1] : '{{version}}';
          const date = filename.replace('-changelog.html', '');

          changelogRecords.push(`<div class="changelog-entry changelog-entry--${idx}"><a class="changelog-entry__link" href="changelogs/${filename}"><p class="changelog-entry_date">${date}</p><p class="changelog-entry_version">${version}</p></a></div>`);
        }
        numberOfChangelogs++;
      }
    });
    log('Number of Changelog files found: ', detail(numberOfChangelogs));

    const indexHtml = fs.readFileSync(path.join(baseDir, 'src', 'index-template.html'), 'utf8')
    .replace(/{{changelogs}}/g, changelogRecords.join('\n'));

    // Copy index.html file to www worker folder
    fs.writeFileSync(path.join(baseDir, 'src', 'index.html'), indexHtml);

    if ( fs.ensureDir(path.join(baseDir, 'www')) ) {
    const wwwChangelogPath = path.join(baseDir, 'www', 'changelogs');
    const wwwChangelogFile = path.join(wwwChangelogPath, changelogFilename);

    // Create Changelogs folder in `www` worker folder
    fs.mkdirSync(wwwChangelogPath, { recursive: true })
    fs.copyFileSync(fullChangelogFilename, wwwChangelogFile)
  }
  return statusResults;
}

/**
 * Creates JSON data file that contains additional
 * metadata
 *
 * @example
 * ```
 * {
 *  "category": "features",
 *  "name": "access-key",
 *  "tags": [
 *    "access",
 *    "key",
 *    "license",
 *    "object",
 *    "password",
 *    "secure"
 *  ]
 * }
 * ```
 *
 * @param icons - array of FigmaIcons
 * @param outputDir - output directory to save the JSON data
 */
const createJsonIconList = (icons: Array<FigmaIcon>, outputDir: string) => {
  try {
    icons = icons.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });

    const outputObj = {
      icons: icons.map((icon) => {
          let tags;

          if (icon.tags) {
            tags = icon.tags?.split(',').map((tag) => (tag.trim())).sort();
          }
          else {
            tags = icon.name.split('-');
          }

          return {
            name: icon.name,
            category: icon.frame || null,
            tags: tags.sort(),
          }
        }
      )};

    const srcJsonStr = JSON.stringify(outputObj, null, 2) + '\n';
    fs.writeFileSync(path.join(outputDir, 'icon-data.json'), srcJsonStr);

  }
  catch (e) {
    logErrorMessage('createJsonIconList', e);
  }
}

/**
 * Reads the file contents located on disk
 * @param filename - the name of the file
 * @returns string
 */
const getFileContentsFromDisk = async (filename: string) => {
  return await fs.readFileSync(path.join(srcSvgBasePath, filename), 'utf8');
}

/**
 * Reads the file contents using git cat-file
 * See {@link https://git-scm.com/docs/git-cat-file} for more details
 *
 * @param filePath - the relative path to the file on disk
 * @returns string
 */
const getFileContentsFromGit = async (filePath: string) => {
  return await gitClient().catFile(['blob', `HEAD:${filePath}`]);
}

/**
 * Creates an instance of the SimpleGit object
 * @param options - list of SimpleGitOptions
 * @returns SimpleGit client
 */
const gitClient = (options: Partial<SimpleGitOptions> = { baseDir: srcSvgBasePath, binary: 'git' } ) => {
  return simpleGit(options);
}

/**
 * Logs an error message
 * @param methodName - the name of the method the error occurred in
 * @param err - the error
 */
const logErrorMessage = (methodName: string, err) => {
  log('Error in ' , detail(methodName), '\n Message: ', error(err));
}

/**
 * Processes the SimpleGit status results and builds
 * the HTML Section data
 *
 * @param results - list of results from SimpleGit.status
 * @returns object - string html data for modifed, created, deleted
 */
const processStatusResults = async (results: StatusResult) => {
  const { modified: m, created: n, deleted: d, renamed: r } = results;

  let created, deleted, modified, renamed;

  if (n.length > 0) {
    created = await Promise.all(n.map((path) => { return buildBeforeAndAfterSvg('', path)}));
    created = buildHTMLSection('Added', created, 'What does "Added" mean? These are new icons introduced in this version. They will not appear in the "before" column because they did not exist in the previous version.');
  }

  if (d.length > 0) {
    deleted = await Promise.all(d.map((path) => ( buildBeforeAndAfterSvg('D', path))));
    deleted = buildHTMLSection('Deleted', deleted, 'What does "Deleted" mean? These icons were present in the previous version but have been removed. They will not appear in the "after" column because they no longer exist.');
  }

  if (m.length > 0) {
    modified = await Promise.all(m.map((path) => ( buildBeforeAndAfterSvg('M', path))));
    modified = buildHTMLSection('Modified', modified, 'What does "Modified" mean? These icons have changed since the previous version. Changes may be visual or in the underlying code. If visual, the difference will show in the "before" and "after" columns. If only the code changed, the icon may look the same but will still be listed as modified.');
  }

  if (r.length > 0) {
    renamed = await Promise.all(r.map((path) => ( buildBeforeAndAfterSvg('R', path.to, path.from))));
    renamed = buildHTMLSection('Renamed', renamed, 'What does "Renamed" mean? These icons existed in the previous version but were renamed. You will see both the previous and new filenames. There are no visual changes between the "before" and "after" columns.');
  }

  return { created, deleted, modified, renamed };
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
