const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'protobufjs' || moduleName === 'protobufjs/minimal') {
        return {
            filePath: require.resolve(
                moduleName === 'protobufjs/minimal'
                    ? 'protobufjs/dist/minimal/protobuf.js'
                    : 'protobufjs/dist/protobuf.js'
            ),
            type: 'sourceFile',
        };
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
