/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    webpack: (config, { isServer }) => {
        // Enable parsing of CommonJS modules
        config.experiments = {
            ...config.experiments,
            asyncWebAssembly: true,
            layers: true,
            topLevelAwait: true,
        };

        // For Node.js compatibility in browser
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                path: false,
                os: false,
                crypto: require.resolve('crypto-browserify'),
                stream: require.resolve('stream-browserify'),
                zlib: require.resolve('browserify-zlib'),
                buffer: require.resolve('buffer/'),
            };

            // Add Buffer as a global polyfill
            const webpack = require('webpack');
            config.plugins.push(
                new webpack.ProvidePlugin({
                    Buffer: ['buffer', 'Buffer'],
                })
            );
        }

        return config;
    }
};

module.exports = nextConfig; 