const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'components');

// 1. ModulAjar.tsx
let f1 = path.join(dir, 'ModulAjar.tsx');
if (fs.existsSync(f1)) {
    let c1 = fs.readFileSync(f1, 'utf8');
    c1 = c1.replace(
        /if \(result.isConfirmed\) \{\s*try \{\s*\/\/ Future improvement.*?\s*const \{ error/s,
        "if (result.isConfirmed) {\n            Swal.fire({ title: 'Menghapus...', text: 'Mohon tunggu', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });\n            try {\n                const { error"
    );
    c1 = c1.replace(
        /if \(module\.file_url\) \{\s*const filePath = module\.file_url\.split\('\/matiku_storage\/'\)\[1\];\s*await supabase\.storage\.from\('matiku_storage'\)\.remove\(\[filePath\]\);\s*\}/s,
        "if (module.file_url) {\n                    const filePath = decodeURIComponent(module.file_url.split('/matiku_storage/')[1]);\n                    await supabase.storage.from('matiku_storage').remove([filePath]);\n                }"
    );
    fs.writeFileSync(f1, c1);
}

// 2. Penugasan.tsx
let f2 = path.join(dir, 'Penugasan.tsx');
if (fs.existsSync(f2)) {
    let c2 = fs.readFileSync(f2, 'utf8');
    c2 = c2.replace(
        /if \(result.isConfirmed\) \{\s*try \{\s*const \{ error \}/s,
        "if (result.isConfirmed) {\n                Swal.fire({ title: 'Menghapus...', text: 'Mohon tunggu', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });\n                try {\n                    const { error }"
    );
    c2 = c2.replace(
        /if \(assignment\.file_url\) \{\s*const filePath = assignment\.file_url\.split\('\/matiku_storage\/'\)\[1\];\s*await supabase\.storage\.from\('matiku_storage'\)\.remove\(\[filePath\]\);\s*\}/s,
        "if (assignment.file_url) {\n                        const filePath = decodeURIComponent(assignment.file_url.split('/matiku_storage/')[1]);\n                        await supabase.storage.from('matiku_storage').remove([filePath]);\n                    }"
    );
    c2 = c2.replace(
        /Swal\.fire\('Dihapus!', 'Tugas telah dihapus.', 'success'\);/g,
        "Swal.fire({ title: 'Dihapus!', text: 'Tugas telah dihapus.', icon: 'success', background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff', color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#111827' });"
    );
    fs.writeFileSync(f2, c2);
}

// 3. ManajemenFile.tsx
let f3 = path.join(dir, 'ManajemenFile.tsx');
if (fs.existsSync(f3)) {
    let c3 = fs.readFileSync(f3, 'utf8');
    c3 = c3.replace(
        /if \(result.isConfirmed\) \{\s*const filePath =/s,
        "if (result.isConfirmed) {\n            Swal.fire({ title: 'Menghapus...', text: 'Mohon tunggu', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });\n            const filePath ="
    );
    fs.writeFileSync(f3, c3);
}

// 4. SiswaApp.tsx
let f4 = path.join(dir, 'SiswaApp.tsx');
if (fs.existsSync(f4)) {
    let c4 = fs.readFileSync(f4, 'utf8');
    c4 = c4.replace(
        /supabase\.from\('assignments'\)\.select\('\*'\)\.eq\('teacher_id', teacherUid\)\.or\(`assigned_to_class\.eq\.all,assigned_to_class\.eq\.\$\{studentClassInfo\}`\)\.order\('due_date', \{ ascending: true \}\),/g,
        "supabase.from('assignments').select('*').eq('teacher_id', teacherUid).order('due_date', { ascending: true }),"
    );
    c4 = c4.replace(
        /setStudentAssignments\(assignmentsRes\.data as Assignment\[\]\);/g,
        "const allAssignments = assignmentsRes.data as Assignment[];\n                setStudentAssignments(allAssignments.filter(a => a.assigned_to_class === 'all' || a.assigned_to_class === studentClassInfo));"
    );
    fs.writeFileSync(f4, c4);
}

console.log('done deletion fix');
