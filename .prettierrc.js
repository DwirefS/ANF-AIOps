/**
 * Prettier Configuration for ANF-AIOps
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 * Code formatting configuration for consistent style
 */

module.exports = {
  // Print width
  printWidth: 100,

  // Tab width
  tabWidth: 2,

  // Use tabs instead of spaces
  useTabs: false,

  // Semicolons
  semi: true,

  // Single quotes
  singleQuote: true,

  // Quote props
  quoteProps: 'as-needed',

  // JSX quotes
  jsxSingleQuote: true,

  // Trailing commas
  trailingComma: 'es5',

  // Bracket spacing
  bracketSpacing: true,

  // Bracket same line
  bracketSameLine: false,

  // Arrow function parentheses
  arrowParens: 'always',

  // Range format
  rangeStart: 0,
  rangeEnd: Infinity,

  // Parser
  parser: undefined,

  // File path
  filepath: undefined,

  // Require pragma
  requirePragma: false,

  // Insert pragma
  insertPragma: false,

  // Prose wrap
  proseWrap: 'preserve',

  // HTML whitespace sensitivity
  htmlWhitespaceSensitivity: 'css',

  // Vue script and style tags indentation
  vueIndentScriptAndStyle: false,

  // End of line
  endOfLine: 'lf',

  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',

  // Single attribute per line
  singleAttributePerLine: false,

  // Override for specific file types
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 120,
        tabWidth: 2,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always',
        tabWidth: 2,
      },
    },
    {
      files: '*.{yaml,yml}',
      options: {
        printWidth: 120,
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: '*.{css,scss,less}',
      options: {
        printWidth: 120,
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: '*.html',
      options: {
        printWidth: 120,
        tabWidth: 2,
        htmlWhitespaceSensitivity: 'ignore',
      },
    },
    {
      files: '*.{ts,tsx}',
      options: {
        parser: 'typescript',
        printWidth: 100,
        tabWidth: 2,
        singleQuote: true,
        trailingComma: 'es5',
      },
    },
    {
      files: '*.{js,jsx}',
      options: {
        parser: 'babel',
        printWidth: 100,
        tabWidth: 2,
        singleQuote: true,
        trailingComma: 'es5',
      },
    },
  ],
};