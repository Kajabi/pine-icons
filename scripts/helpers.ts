export interface SvgData {
  /**
   * /dist/svg/airplane-outline.svg
   */
  distSvgFilePath: string;

  /**
   * airplaneOutline
   */
  exportName: string;

  /**
   * airplane-outline.svg
   */
  fileName: string;

  /**
   * airplane-outline.js
   */
  fileNameCjs: string;

  /**
   * airplane-outline.mjs
   */
  fileNameMjs: string;

  /**
   * airplane-outline
   */
  iconName: string;

  /**
   * /dist/pds-icons/svg/airplane-outline.svg
   */
  optimizedFilePath: string;

  /**
   * The path to the save the optimized SVG within the Repo
   */
  optimizedLocalSvgFilePath: string;

  /**
   * Optimized svg content data generated from
   * SVGO
   */
  optimizedSvgContent: string;

  /**
   * /tmp/svg/airplane-outline.svg
   */
  srcFilePath: string;

  /**
   * [
   *  "airplane",
   *  "outline",
   * ]
   */
  tags: string[];

  /**
   * airplane
   */
  title: string;
}

export interface JsonData {
  icons: { name: string; tags?: string[] }[];
  version?: string;
}

export const reservedKeywords = new Set([
  'arguments',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'constructor',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'eval',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
])
