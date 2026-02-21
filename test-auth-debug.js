const fs = require('fs');
let content = fs.readFileSync('src/components/admin/AuthProvider.tsx', 'utf-8');
content = content.replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(true); console.log("[AuthProvider] Render, loading=", loading, "user=", user?.uid);');
content = content.replace('setLoading(false);', 'console.log("[AuthProvider] setLoading(false)"); setLoading(false);');
fs.writeFileSync('src/components/admin/AuthProvider.tsx', content);
