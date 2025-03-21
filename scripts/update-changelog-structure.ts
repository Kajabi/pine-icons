import path from 'path';
import fs from 'fs-extra';

const baseDir = process.cwd();
const changelogPath = path.join(baseDir, 'changelogs');

// Get all changelog files
const arrChangelogs = fs.readdirSync(changelogPath);
const changelogRecords: string[] = [];

// Process changelog files
arrChangelogs.reverse().forEach((filename, idx) => {
  if (path.extname(filename) === '.html') {
    if (idx < 10) {
      // Read the changelog file to get the version
      const changelogContent = fs.readFileSync(path.join(changelogPath, filename), 'utf8');
      const versionMatch = changelogContent.match(/Pine Icons - (v[\d.]+)/);
      const version = versionMatch ? versionMatch[1] : '';
      const date = filename.replace('-changelog.html', '');

      changelogRecords.push(`<div class="changelog-entry"><a class="changelog-entry_link" href="changelogs/${filename}"><p class="changelog-entry_date">${date}</p><p class="changelog-entry_version">${version}</p></a></div>`);
    }
  }
});

// Read the template and replace the changelogs
const indexHtml = fs.readFileSync(path.join(baseDir, 'src', 'index-template.html'), 'utf8')
  .replace(/{{changelogs}}/g, changelogRecords.join('\n'));

// Write to both src and www directories
fs.writeFileSync(path.join(baseDir, 'src', 'index.html'), indexHtml);
fs.writeFileSync(path.join(baseDir, 'www', 'index.html'), indexHtml);
