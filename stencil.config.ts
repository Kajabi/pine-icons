import { Config } from '@stencil/core';

import { sass } from '@stencil/sass';

export const config: Config = {
  namespace: 'pds-icons',
  devServer: {
    openBrowser: false,
    port: 7200
  },
  plugins: [sass()],
  outputTargets: [
    {
      type: 'dist',
      empty: false,
    },
    {
      type: 'dist-custom-elements',
      customElementsExportBehavior: 'single-export-module',
      dir: './components'
    },
    {
      type: 'docs-json',
      file: './dist/docs.json',
    },
    {
      type: 'docs-readme',
      footer: '',
    },
    {
      type: 'www',
      copy: [
        { src: '../changelogs', dest: 'changelogs'},
        { src:' ./svg/*.svg', dest: './build/svg/'},
        { src: 'styles/*.css', dest: 'build/styles/'}
      ],
      empty: false,
      serviceWorker: null, // disable service workers
    },
  ],
  testing: {
    browserHeadless: "new",
    modulePathIgnorePatterns: ["<rootDir>/.nx/"],
  },
};
