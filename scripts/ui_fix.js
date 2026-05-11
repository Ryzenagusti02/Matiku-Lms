const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'components');

// 1. Update index.css
let cssPath = path.join(__dirname, '..', 'index.css');
if (fs.existsSync(cssPath)) {
    let cssContent = fs.readFileSync(cssPath, 'utf8');
    if (!cssContent.includes('animate-gradient-xy')) {
        cssContent += `\n
@keyframes gradient-xy {
    0%, 100% {
        background-size: 400% 400%;
        background-position: left center;
    }
    50% {
        background-size: 200% 200%;
        background-position: right center;
    }
}
.animate-gradient-xy {
    animation: gradient-xy 15s ease infinite;
}
@keyframes spin-slow {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
.animate-spin-slow {
    animation: spin-slow 3s linear infinite;
}
`;
        fs.writeFileSync(cssPath, cssContent);
    }
}

// 2. Update AuthPage.tsx
let fAuth = path.join(dir, 'AuthPage.tsx');
if (fs.existsSync(fAuth)) {
    let cAuth = fs.readFileSync(fAuth, 'utf8');
    cAuth = cAuth.replace(
        /className="relative flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 overflow-hidden"/,
        'className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 animate-gradient-xy text-white p-4 overflow-hidden"'
    );
    cAuth = cAuth.replace(
        /className="relative z-10 w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg animate-zoom-in-fade border border-gray-700\/50"/,
        'className="relative z-10 w-full max-w-md p-8 space-y-6 bg-white/10 rounded-2xl shadow-2xl animate-zoom-in-fade border border-white/20 backdrop-blur-md"'
    );
    cAuth = cAuth.replace(
        /className="w-full px-4 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/g,
        'className="w-full px-4 py-2 text-gray-200 bg-gray-900/50 border border-gray-600/50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500"'
    );
    cAuth = cAuth.replace(
        /className="w-full flex items-center justify-center px-4 py-2 space-x-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 transition-colors"/,
        'className="w-full flex items-center justify-center px-4 py-2 space-x-2 text-gray-200 bg-gray-900/40 border border-gray-600/50 rounded-md hover:bg-gray-900/60 transition-colors backdrop-blur-sm"'
    );
    cAuth = cAuth.replace(
        /className="relative px-4 text-sm text-gray-400 bg-gray-800"/,
        'className="relative px-4 text-sm text-gray-400 bg-transparent"'
    );
    fs.writeFileSync(fAuth, cAuth);
}

// 3. Update GuruApp.tsx
let fGuru = path.join(dir, 'GuruApp.tsx');
if (fs.existsSync(fGuru)) {
    let cGuru = fs.readFileSync(fGuru, 'utf8');
    cGuru = cGuru.replace(
        /<div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">\s*<img src="\/favicon\.svg" alt="Memuat Matiku LMS" className="w-24 h-24 animate-pulse-logo" \/>\s*<p className="mt-4 text-lg text-gray-400">Memuat data guru...<\/p>\s*<\/div>/,
        `<div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 animate-gradient-xy text-white overflow-hidden relative">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-0"></div>
                    <div className="relative z-10 flex flex-col items-center bg-white/10 p-10 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-md">
                        <div className="relative w-24 h-24 mb-6">
                            <div className="absolute inset-0 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin"></div>
                            <div className="absolute inset-2 rounded-full border-4 border-purple-500/30 border-b-purple-500 animate-spin-slow" style={{ animationDirection: 'reverse' }}></div>
                            <img src="/favicon.svg" alt="Memuat Matiku LMS" className="absolute inset-0 m-auto w-12 h-12 animate-pulse-logo" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Matiku LMS</h2>
                        <p className="text-sm text-gray-300">Memuat data guru...</p>
                    </div>
                </div>`
    );
    fs.writeFileSync(fGuru, cGuru);
}

// 4. Update SiswaApp.tsx
let fSiswa = path.join(dir, 'SiswaApp.tsx');
if (fs.existsSync(fSiswa)) {
    let cSiswa = fs.readFileSync(fSiswa, 'utf8');
    cSiswa = cSiswa.replace(
        /<div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">\s*<img src="\/favicon\.svg" alt="Memuat Matiku LMS" className="w-24 h-24 animate-pulse-logo" \/>\s*<p className="mt-4 text-lg text-gray-400">Memuat data siswa...<\/p>\s*<\/div>/,
        `<div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 animate-gradient-xy text-white overflow-hidden relative">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-0"></div>
                    <div className="relative z-10 flex flex-col items-center bg-white/10 p-10 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-md">
                        <div className="relative w-24 h-24 mb-6">
                            <div className="absolute inset-0 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin"></div>
                            <div className="absolute inset-2 rounded-full border-4 border-purple-500/30 border-b-purple-500 animate-spin-slow" style={{ animationDirection: 'reverse' }}></div>
                            <img src="/favicon.svg" alt="Memuat Matiku LMS" className="absolute inset-0 m-auto w-12 h-12 animate-pulse-logo" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Matiku LMS</h2>
                        <p className="text-sm text-gray-300">Memuat data siswa...</p>
                    </div>
                </div>`
    );
    fs.writeFileSync(fSiswa, cSiswa);
}

console.log('done ui fix');
