import React, { useState, useRef } from 'react';
import { Student, Module, Assessment } from '../types';
import { EyeIcon, TrashIcon, XIcon, SparklesIcon, EditIcon } from './icons';
import { supabase } from '../config/supabaseClient';
import { generateAiResponse } from '../config/api';
import Swal from 'sweetalert2';
import PdfExportButton from './PdfExportButton';

interface PenilaianProps {
    students: Student[];
    modules: Module[];
    refreshData: () => void;
    addNotification: (message: string) => void;
}

const Penilaian: React.FC<PenilaianProps> = ({ students, modules, refreshData, addNotification }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [isModalOpen, setModalOpen] = useState(false); // Add/Edit Modal
    const [isDetailModalOpen, setDetailModalOpen] = useState(false); // Detail Modal
    const [currentAssessment, setCurrentAssessment] = useState<Partial<Assessment>>({});
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [assessmentForDetail, setAssessmentForDetail] = useState<{ student: Student, assessment: Assessment } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleOpenModal = (student: Student | null = null, assessment: Assessment | null = null) => {
        if (assessment && student) { // Editing
            setCurrentAssessment(assessment);
            setSelectedStudentId(student.id);
        } else { // New
            setCurrentAssessment({});
            setSelectedStudentId('');
        }
        setModalOpen(true);
    };

    const handleAttemptOpenModal = () => {
        if (students.length === 0 || modules.length === 0) {
            Swal.fire({
                title: 'Data Belum Lengkap',
                text: 'Harap tambahkan data siswa dan modul ajar terlebih dahulu sebelum membuat penilaian baru.',
                icon: 'info',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff', color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#111827'
            });
        } else {
            handleOpenModal();
        }
    };
    
    const handleCloseModal = () => {
        setModalOpen(false);
        setCurrentAssessment({});
        setSelectedStudentId('');
    };

    const handleOpenDetailModal = (student: Student, assessment: Assessment) => {
        setAssessmentForDetail({ student, assessment });
        setDetailModalOpen(true);
    };

    const handleCloseDetailModal = () => {
        setDetailModalOpen(false);
        setAssessmentForDetail(null);
    };


    const handleDelete = async (studentId: string, materiId: string) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;
        
        const result = await Swal.fire({
            title: 'Hapus Penilaian?',
            text: `Penilaian untuk ${student.name} pada materi ini akan dihapus.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, hapus!',
            cancelButtonText: 'Batal',
            background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff', color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#111827'
        });

        if (result.isConfirmed) {
            try {
                const newScores = { ...student.scores };
                delete newScores[materiId];

                const { error } = await supabase.from('students').update({ scores: newScores }).eq('id', studentId);
                if (error) throw error;

                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Penilaian dihapus!', showConfirmButton: false, timer: 3000, timerProgressBar: true, background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff', color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#111827' });
                addNotification(`Penilaian untuk ${student.name} telah dihapus.`);
                refreshData();
            } catch (error: any) {
                Swal.fire({ title: 'Error!', text: error.message || 'Gagal menghapus penilaian.', icon: 'error', background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff', color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#111827' });
            }
        }
    };
    
    const handleSave = async () => {
        if (!selectedStudentId || !currentAssessment.materiId || !currentAssessment.analysis) {
            Swal.fire({ title: 'Input Tidak Lengkap', text: 'Siswa, materi, dan analisis harus diisi.', icon: 'error', background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff', color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#111827' });
            return;
        }
        
        setIsLoading(true);
        const student = students.find(s => s.id === selectedStudentId)!;
        const module = modules.find(m => m.id === currentAssessment.materiId)!;
        
        try {
            const prompt = `Analisis kinerja siswa berikut berdasarkan catatan guru: "${currentAssessment.analysis}". Berikan skor dan rekomendasi belajar.`;
            const result = await generateAiResponse({ role: 'guru', question: prompt });

            // Parsing hasil dari Gemini (Format: SKOR: [angka] | REKOMENDASI: [teks])
            let generatedScore = 85;
            let generatedRecommendation = result;

            if (result.includes('|')) {
                const parts = result.split('|');
                const scorePart = parts[0].match(/\d+/);
                if (scorePart) {
                    generatedScore = parseInt(scorePart[0]);
                }
                generatedRecommendation = parts[1].replace(/REKOMENDASI:/i, '').trim();
            } else {
                // Fallback jika format tidak sesuai
                const scoreMatch = result.match(/SKOR:\s*(\d+)/i);
                if (scoreMatch) generatedScore = parseInt(scoreMatch[1]);
                generatedRecommendation = result.replace(/SKOR:\s*\d+/i, '').replace(/REKOMENDASI:/i, '').trim();
            }

            const assessmentData: Assessment = {
                id: currentAssessment.id || currentAssessment.materiId,
                materiId: currentAssessment.materiId,
                materi: module.title,
                analysis: currentAssessment.analysis,
                score: generatedScore,
                date: currentAssessment.date || new Date().toISOString(),
                recommendation: generatedRecommendation,
                summary: '', // Field not used, can be deprecated
            };

            const newScores = { ...student.scores, [currentAssessment.materiId]: assessmentData };
            const { error } = await supabase.from('students').update({ scores: newScores }).eq('id', selectedStudentId);
            if (error) throw error;

            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Penilaian berhasil disimpan!', showConfirmButton: false, timer: 3000, timerProgressBar: true, background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff', color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#111827' });
            addNotification(`Penilaian untuk ${student.name} pada materi '${module.title}' berhasil disimpan.`);
            refreshData();
            handleCloseModal();

        } catch (error: any) {
            console.error("Error saving assessment:", error.message);
            let text = 'Gagal menyimpan penilaian. Ini mungkin karena respons AI tidak valid atau masalah jaringan.';
            if (error.message && error.message.includes('violates row-level security policy')) {
                text = 'Aksi Anda diblokir oleh kebijakan keamanan database (RLS). Pastikan Anda telah menjalankan skrip SQL dari README.md untuk mengkonfigurasi izin dengan benar.';
            }
            Swal.fire({ title: 'Error', text, icon: 'error', background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff', color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#111827' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-3xl font-medium text-gray-900 dark:text-white">Penilaian Siswa</h3>
                <div className="flex gap-2">
                    <PdfExportButton targetRef={contentRef} fileName="Penilaian_Siswa" />
                    <button onClick={handleAttemptOpenModal} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        + Nilai Baru
                    </button>
                </div>
            </div>
            <div ref={contentRef} className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nama Siswa</th>
                                <th scope="col" className="px-6 py-3">Materi Penilaian</th>
                                <th scope="col" className="px-6 py-3">Skor (AI)</th>
                                <th scope="col" className="px-6 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.flatMap(student => 
                                student.scores ? Object.values(student.scores).map(assessment => (
                                    <tr key={`${student.id}-${assessment.materiId}`} className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{student.name}</td>
                                        <td className="px-6 py-4">{assessment.materi}</td>
                                        <td className="px-6 py-4 font-semibold text-blue-400">{assessment.score}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleOpenDetailModal(student, assessment)} className="text-gray-500 dark:text-gray-400 hover:text-green-400 mr-4"><EyeIcon className="w-5 h-5" /></button>
                                            <button onClick={() => handleDelete(student.id, assessment.materiId)} className="text-gray-500 dark:text-gray-400 hover:text-red-400"><TrashIcon className="w-5 h-5" /></button>
                                        </td>
                                    </tr>
                                )) : []
                            )}
                             {students.every(s => !s.scores || Object.keys(s.scores).length === 0) && (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-gray-500">Belum ada data penilaian.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {isModalOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg border border-gray-700 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{currentAssessment.id ? 'Edit Analisis Penilaian' : 'Input Penilaian Baru'}</h2>
                             <button onClick={handleCloseModal} className="text-gray-500 dark:text-gray-400 hover:text-white"><XIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="space-y-4">
                            <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} disabled={!!currentAssessment.id} className="w-full p-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50">
                                <option value="" disabled>Pilih Siswa</option>
                                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <select value={currentAssessment.materiId || ''} onChange={(e) => setCurrentAssessment({ ...currentAssessment, materiId: e.target.value })} disabled={!!currentAssessment.id} className="w-full p-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50">
                                 <option value="" disabled>Pilih Materi</option>
                                {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                            </select>
                            <textarea placeholder="Tulis analisis kualitatif tentang kinerja siswa di sini. AI akan menghasilkan skor dan rekomendasi dari teks ini." value={currentAssessment.analysis || ''} onChange={(e) => setCurrentAssessment({ ...currentAssessment, analysis: e.target.value })} className="w-full p-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md h-40" />
                        </div>
                        <div className="mt-6 flex justify-between items-center">
                            <button onClick={handleCloseModal} className="px-4 py-2 text-gray-300 rounded-md hover:bg-gray-700">Batal</button>
                            <button onClick={handleSave} disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-800 flex items-center">
                                {isLoading ? 'Menganalisis...' : 'Simpan & Generate Skor'}
                                {isLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div> : <SparklesIcon className="w-5 h-5 ml-2"/>}
                            </button>
                        </div>
                    </div>
                 </div>
            )}

            {isDetailModalOpen && assessmentForDetail && (
                 <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Detail Penilaian</h2>
                            <button onClick={handleCloseDetailModal} className="text-gray-500 dark:text-gray-400 hover:text-white"><XIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="space-y-4 text-gray-300">
                            <div className="grid grid-cols-3 gap-4">
                                <div><strong className="text-gray-500 dark:text-gray-400 block">Siswa:</strong> {assessmentForDetail.student.name}</div>
                                <div className="col-span-2"><strong className="text-gray-500 dark:text-gray-400 block">Materi:</strong> {assessmentForDetail.assessment.materi}</div>
                            </div>
                            <div className="bg-gray-900 p-4 rounded-md">
                                <strong className="text-gray-500 dark:text-gray-400 block mb-1">Analisis Guru:</strong>
                                <p className="whitespace-pre-wrap font-sans">{assessmentForDetail.assessment.analysis}</p>
                            </div>
                            <div className="flex items-start space-x-4">
                                <div className="bg-gray-900 p-4 rounded-md text-center flex-shrink-0">
                                    <strong className="text-gray-500 dark:text-gray-400 block">Skor (AI)</strong>
                                    <p className="text-4xl font-bold text-blue-400 mt-1">{assessmentForDetail.assessment.score}</p>
                                </div>
                                <div className="bg-gray-900 p-4 rounded-md flex-grow">
                                    <strong className="text-gray-500 dark:text-gray-400 block mb-1">Rekomendasi Belajar (AI):</strong>
                                    <p className="whitespace-pre-wrap font-sans">{assessmentForDetail.assessment.recommendation}</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => {
                                handleCloseDetailModal();
                                handleOpenModal(assessmentForDetail.student, assessmentForDetail.assessment);
                            }} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center">
                                <EditIcon className="w-5 h-5 mr-2" />
                                Edit Analisis
                            </button>
                            <button onClick={handleCloseDetailModal} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Tutup</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Penilaian;