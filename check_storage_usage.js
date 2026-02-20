const cloudinary = require('cloudinary').v2;

// Cloudinary config
cloudinary.config({
    cloud_name: 'ds4prfv5z',
    api_key: '189291132298512',
    api_secret: '8i70nTMn3XqzC8gGS3VR1YdLBYo'
});

async function checkUsage() {
    try {
        const result = await cloudinary.api.usage();
        console.log('--- Cloudinary Usage Report ---');
        console.log(`Plan: ${result.plan}`);
        console.log(`Storage Used: ${(result.storage.usage / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Storage Limit: ${(result.storage.limit / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Usage Percentage: ${result.storage.used_percent}%`);
        console.log(`\nCredits Used: ${result.credits.usage}`);
        console.log(`Credits Limit: ${result.credits.limit || 'Unlimited'}`); // Free plan has limits
        console.log('-------------------------------');
    } catch (error) {
        console.error('Error fetching usage:', error);
    }
}

checkUsage();
