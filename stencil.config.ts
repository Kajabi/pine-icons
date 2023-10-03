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
      dir: './components'
    },
    {
      type: 'docs-readme',
      footer: '',
    },
    {
      type: 'www',
      copy: [
        { src: '../changelogs', dest: 'changelogs'}
      ],
      empty: false,
      serviceWorker: null, // disable service workers
    },
  ],
  testing: {
    browserHeadless: "new",
  },
};
