/**
 * Custom module load to allow resolving paths in production like tsconfig-paths does
 */
const tsConfig = require("./tsconfig.json");
const tsConfigPaths = require("tsconfig-paths");

const baseUrl = "./build/src";
tsConfigPaths.register({
  baseUrl,
  paths: tsConfig.compilerOptions.paths,
});
