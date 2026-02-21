const fs = require('fs');
const metaFile = '.open-next/server-functions/default/handler.mjs.meta.json';
const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));

const packageSizes = {};

for (const [path, data] of Object.entries(meta.inputs)) {
    // node_modules が含まれるパスからパッケージ名のみを抽出
    const match = path.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
    if (match) {
        const pkg = match[1];
        packageSizes[pkg] = (packageSizes[pkg] || 0) + data.bytes;
    }
}

const sorted = Object.entries(packageSizes).sort((a, b) => b[1] - a[1]);

console.log('Package Size Summary (uncompressed):');
sorted.slice(0, 30).forEach(([pkg, size]) => {
    console.log(`${pkg.padEnd(35)} : ${(size / 1024 / 1024).toFixed(2)} MB`);
});
