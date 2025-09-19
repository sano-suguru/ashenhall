/* eslint-disable @typescript-eslint/no-require-imports */

try {
  // Register ts-node to handle TypeScript files in CommonJS context
  require('ts-node').register({ transpileOnly: true });
  require('./generate-animation-css.ts');
} catch (err) {
  console.error('Failed to run TypeScript generator via CJS wrapper:', err);
  process.exit(1);
}
