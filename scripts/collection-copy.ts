import fs from 'fs-extra';
import { join } from 'path';

export const collectionCopy = async (rootDir: string) => {
  const optimizedSrc = join(rootDir, 'src', 'svg');
  const distSvgDest = join(rootDir, 'dist', 'svg');
  const collectionDest = join(rootDir, 'dist', 'collection', 'components', 'pds-icon', 'svg');

  await fs.copy(optimizedSrc, collectionDest);
  console.log('Copied optimized SVGs to collection: ', collectionDest);

  await fs.copy(optimizedSrc, distSvgDest);
  console.log('Copied optimized SVGs to dist/svg: ', distSvgDest);

  // we don't want to copy the src/svgs to the collection (distribution)
  await fs.remove(join(rootDir, 'dist', 'collection', 'svg'));

  // don't want to copy the test svgs to the collection either
  await fs.remove(join(rootDir, 'dist', 'collection', 'components', 'test'));

  const cePackageDir = join(rootDir, 'components');
  const cePackageJsonPath = join(cePackageDir, 'package.json');
  const ceCjsPath = join(cePackageDir, 'index.cjs.js');

  const emptyCjs = `/*empty cjs*/`;
  await fs.writeFile(ceCjsPath, emptyCjs);

  const cePackageJson = {
    name: '@pine-ds/icons/components',
    description: 'Pine Icons custom element',
    main: './index.cjs.js',
    module: '.index.js',
    types: './index.d.ts',
    private: true,
  };

  await fs.writeFile(cePackageJsonPath, JSON.stringify(cePackageJson, null, 2));
}
