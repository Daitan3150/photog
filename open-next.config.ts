export default {
    default: {
        override: {
            wrapper: "cloudflare-node",
            converter: "edge",
            proxyExternalRequest: "fetch",
            incrementalCache: "dummy",
            tagCache: "dummy",
            queue: "dummy",
        },
        /*
        install: {
            packageManager: "npm",
            externals: ["sharp", "jose", "jwks-rsa"],
        },
        */
        // esbuild で sharp（ハッシュ付き含む）を external に
        esbuildConfig: {
            external: ["sharp", "sharp-*"],
        },
    },
    edgeExternals: ["node:crypto", "jose", "sharp"],
    middleware: {
        external: true,
        override: {
            wrapper: "cloudflare-edge",
            converter: "edge",
            proxyExternalRequest: "fetch",
            incrementalCache: "dummy",
            tagCache: "dummy",
            queue: "dummy",
        },
    },
};
