const fs = require('fs');

// We will test if the Auth context is correctly firing its initial state
// Sometimes `user` is null but Next.js router blocks renders.
let content = fs.readFileSync('src/app/admin/photos/page.tsx', 'utf-8');

// Inject a debug log whenever component renders
if(!content.includes('PhotosPage Mount')) {
  content = content.replace('export default function PhotosPage() {', 'export default function PhotosPage() { console.log("[PhotosPage Mount] auth state:", { user: !!user, loading });');
  fs.writeFileSync('src/app/admin/photos/page.tsx', content);
}
