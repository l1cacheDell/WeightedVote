const webpack = require("webpack");

module.exports = function override(config) {
    const fallback = config.resolve.fallback || {};
    Object.assign(fallback, {
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        assert: require.resolve("assert"),
        http: require.resolve("stream-http"),
        https: require.resolve("https-browserify"),
        os: require.resolve("os-browserify"),
        url: require.resolve("url"),
        buffer: require.resolve("buffer/"),
        stream: require.resolve("stream-browserify"),
        assert: require.resolve("assert/"),
        path: false,   // sql.js 在浏览器里不需要
        fs: false,     // 禁用
        crypto: false  // 禁用（避免引入庞大的 crypto-browserify）
    });
    config.resolve.fallback = fallback;
    config.plugins = (config.plugins || []).concat([
        new webpack.ProvidePlugin({
            process: "process/browser",
            Buffer: ["buffer", "Buffer"],
        }),
    ]);
    config.resolve.alias = {
        ...(config.resolve.alias || {}),
        "process/browser": require.resolve("process/browser.js"),
        // 也可同步覆盖 'process' 本身（有些包直接 import 'process'）
        process: require.resolve("process/browser.js"),
    };

    config.plugins = (config.plugins || []).concat([
        new webpack.ProvidePlugin({
        Buffer: ["buffer", "Buffer"],
        // 显式到 .js，避免 fully-specified 报错
        process: require.resolve("process/browser.js"),
        }),
    ]);
    return config;
};