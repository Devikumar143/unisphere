module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            [
                'module-resolver',
                {
                    alias: {
                        'protobufjs/minimal': './node_modules/protobufjs/dist/minimal/protobuf.js',
                        'protobufjs': './node_modules/protobufjs/dist/protobuf.js',
                    },
                },
            ],
        ],
    };
};
