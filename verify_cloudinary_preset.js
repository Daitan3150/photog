const cloudinary = require('cloudinary').v2;

// Cloudinary config
cloudinary.config({
    cloud_name: 'ds4prfv5z',
    api_key: '189291132298512',
    api_secret: '8i70nTMn3XqzC8gGS3VR1YdLBYo'
});

async function verifyUploadSettings() {
    try {
        console.log('--- Verifying Upload Preset ---');
        // We can't easily test 'Unsigned' upload from a node script without a fetch to the unsigned endpoint,
        // but we can check if the preset exists and is configured correctly via the Admin API.
        const preset = await cloudinary.api.upload_preset('next-portfolio');

        console.log(`Preset Name: ${preset.name}`);
        console.log(`Unsigned: ${preset.unsigned}`);
        console.log(`Folder: ${preset.settings.folder || 'None'}`);

        if (preset.unsigned) {
            console.log('\n✅ SUCCESS: Upload preset "next-portfolio" is correctly configured as UNSIGNED.');
            console.log('Photos can be uploaded from the browser (iPhone/Admin panel) without errors.');
        } else {
            console.log('\n❌ ERROR: Upload preset is SIGNED. This will cause errors on iPhone.');
        }
    } catch (error) {
        if (error.http_code === 404) {
            console.error('\n❌ ERROR: Upload preset "next-portfolio" NOT FOUND in Cloudinary.');
        } else {
            console.error('\n❌ ERROR: Verification failed.', error.message);
        }
    }
}

verifyUploadSettings();
