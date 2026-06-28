// Metro config: support the monorepo so the @orbis/shared package resolves.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// HMR registration in monorepos sends entry as `./node_modules/<pkg>/...`
// which bypasses nodeModulesPaths (relative paths skip that lookup).
// Strip the prefix so it resolves as a bare specifier via nodeModulesPaths.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // @rnmapbox/maps'in `react-native` field'ı TypeScript source'a işaret eder
  // (src/index) ama bu Metro ile uyumsuz. Pre-build CommonJS'i zorla.
  if (moduleName === "@rnmapbox/maps") {
    return {
      type: "sourceFile",
      filePath: require.resolve("@rnmapbox/maps/lib/commonjs/index"),
    };
  }

  const relNodeModules = moduleName.match(/^\.\/node_modules\/(.+)/);
  if (relNodeModules) {
    return context.resolveRequest(context, relNodeModules[1], platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
