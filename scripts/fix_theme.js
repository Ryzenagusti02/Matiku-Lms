const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'components');

if (!fs.existsSync(dir)) {
    console.error("Directory not found:", dir);
    process.exit(1);
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(f => {
    let content = fs.readFileSync(path.join(dir, f), 'utf8');
    
    // Fix sweetalert background
    content = content.replace(/background:\s*['"]#1f2937['"],\s*color:\s*['"]#e5e7eb['"]/g, 
        "background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff', color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#111827'");
        
    // Fix PDF export
    if (f === 'PdfExportButton.tsx') {
        content = content.replace(/const { jsPDF } = \(window as any\)\.jspdf;/g, 
            'const jsPDFConstructor = (window as any).jspdf?.jsPDF || (window as any).jsPDF || (window as any).jspdf;');
        content = content.replace(/const pdf = new jsPDF\(\{/g, 
            'const pdf = new jsPDFConstructor({');
    }
    
    // Specifically fix table designs for the CRUD components
    if (['DataSiswa.tsx', 'ModulAjar.tsx', 'Penugasan.tsx', 'Penilaian.tsx', 'ManajemenFile.tsx', 'UjianCbt.tsx', 'Analitik.tsx'].includes(f)) {
        // Table Container
        content = content.replace(/className="([^"]*)bg-gray-800 shadow-lg([^\"]*)"/g, 'className="$1bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg$2"');
        
        // Table headers
        content = content.replace(/className="([^"]*)text-gray-400([^"]*)"/g, 'className="$1text-gray-500 dark:text-gray-400$2"');
        content = content.replace(/className="([^"]*)text-gray-300 uppercase bg-gray-700([^"]*)"/g, 'className="$1text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700$2"');
        
        // Table rows
        content = content.replace(/className="([^"]*)bg-gray-800 border-b border-gray-700 hover:bg-gray-600([^"]*)"/g, 'className="$1bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700$2"');
        
        // Table cells text
        content = content.replace(/className="([^"]*)font-medium text-white whitespace-nowrap([^"]*)"/g, 'className="$1font-medium text-gray-900 dark:text-white whitespace-nowrap$2"');
        
        // Modals
        content = content.replace(/className="([^"]*)bg-gray-800 p-6 rounded-lg([^"]*)"/g, 'className="$1bg-white dark:bg-gray-800 p-6 rounded-lg$2"');
        content = content.replace(/className="([^"]*)bg-gray-700 text-gray-200 border border-gray-600([^"]*)"/g, 'className="$1bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600$2"');
        
        // Modal Headers text-white
        content = content.replace(/<h2 className="text-2xl font-semibold text-white">/g, '<h2 className="text-2xl font-semibold text-gray-900 dark:text-white">');
        content = content.replace(/<h3 className="text-3xl font-medium text-white">/g, '<h3 className="text-3xl font-medium text-gray-900 dark:text-white">');
        
        // DataSiswa main container fixes (if any missed)
        content = content.replace(/className="([^\"]*)bg-gray-800 shadow-lg rounded-lg overflow-hidden([^\"]*)"/g, 'className="$1bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden$2"');
    }
    
    fs.writeFileSync(path.join(dir, f), content, 'utf8');
});
console.log('Fixed themes script complete');
