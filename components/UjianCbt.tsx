import React, { useState, useMemo } from 'react';
import { Exam, Question, Student, ExamAttempt } from '../types';
import { EditIcon, TrashIcon, XIcon, FileTextIcon, EyeIcon } from './icons';
import { supabase } from '../config/supabaseClient';
import Swal from 'sweetalert2';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { 
        onInput?: (e: any) => void; 
        readonly?: boolean;
        class?: string;
        style?: React.CSSProperties;
      };
    }
  }
}

interface UjianCbtProps {
    exams: Exam[];
    students: Student[];
    examAttempts: ExamAttempt[];
    refreshData: () => void;
    addNotification: (message: string) => void;
}

const UjianCbt: React.FC<UjianCbtProps> = ({ exams, students, examAttempts, refreshData, addNotification }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);
    // FIX: Correctly type the currentExam state to allow partial questions during creation/editing.
    // The intersection of Partial<Exam> and { questions: ... } was too restrictive.
    // Omit ensures the 'questions' property is correctly typed as Partial<Question>[].
    const [currentExam, setCurrentExam] = useState<Omit<Partial<Exam>, 'questions'> & { questions: Partial<Question>[] }>({ questions: [] });
    const [selectedExamForResults, setSelectedExamForResults] = useState<Exam | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const openModal = (exam: Exam | null = null) => {
        if (exam) {
            setCurrentExam({ ...exam, questions: exam.questions || [] });
        } else {
            setCurrentExam({ 
                title: '', 
                duration_minutes: 60, 
                questions: [{ 
                    question_type: 'multiple_choice', 
                    question_text: '', 
                    options: ['', '', '', ''], 
                    correct_answer_index: 0, 
                    correct_answers: [], 
                    essay_keywords: [] 
                }] 
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentExam({ questions: [] });
    };

    const openResultModal = (exam: Exam) => {
        setSelectedExamForResults(exam);
        setIsResultModalOpen(true);
    };

    const closeResultModal = () => {
        setSelectedExamForResults(null);
        setIsResultModalOpen(false);
    };

    const handleQuestionChange = (qIndex: number, field: keyof Question, value: any) => {
        const updatedQuestions = [...currentExam.questions];
        updatedQuestions[qIndex] = { ...updatedQuestions[qIndex], [field]: value };
        setCurrentExam({ ...currentExam, questions: updatedQuestions });
    };

    const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
        const updatedQuestions = [...currentExam.questions];
        const updatedOptions = [...(updatedQuestions[qIndex].options || [])];
        updatedOptions[oIndex] = value;
        updatedQuestions[qIndex].options = updatedOptions;
        setCurrentExam({ ...currentExam, questions: updatedQuestions });
    };

    const toggleCorrectAnswer = (qIndex: number, oIndex: number) => {
        const updatedQuestions = [...currentExam.questions];
        const q = updatedQuestions[qIndex];
        const currentAnswers = q.correct_answers || [];
        if (currentAnswers.includes(oIndex)) {
            q.correct_answers = currentAnswers.filter(i => i !== oIndex);
        } else {
            q.correct_answers = [...currentAnswers, oIndex];
        }
        setCurrentExam({ ...currentExam, questions: updatedQuestions });
    };

    const addQuestion = () => {
        setCurrentExam({ 
            ...currentExam, 
            questions: [
                ...currentExam.questions, 
                { question_type: 'multiple_choice', question_text: '', options: ['', '', '', ''], correct_answer_index: 0, correct_answers: [], essay_keywords: [] }
            ] 
        });
    };
    
    const removeQuestion = (qIndex: number) => {
        const updatedQuestions = currentExam.questions.filter((_, index) => index !== qIndex);
        setCurrentExam({ ...currentExam, questions: updatedQuestions });
    };

    const handleSave = async () => {
        const { title, duration_minutes, questions } = currentExam;
        if (!title || !duration_minutes || questions.length === 0) {
            Swal.fire('Error', 'Judul, durasi, dan minimal satu soal harus diisi.', 'error');
            return;
        }
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not found");

            let examId = currentExam.id;

            // Upsert Exam
            if (examId) {
                const { data, error } = await supabase.from('exams').update({ title, duration_minutes }).eq('id', examId).select().single();
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('exams').insert({ title, duration_minutes, teacher_id: user.id }).select().single();
                if (error) throw error;
                examId = data.id;
            }

            // Delete old questions if editing
            if (currentExam.id) {
                await supabase.from('questions').delete().eq('exam_id', currentExam.id);
            }

            // Insert new questions
            const questionsToInsert = questions.map(q => ({
                exam_id: examId,
                question_type: q.question_type || 'multiple_choice',
                question_text: q.question_text,
                options: q.options || [],
                correct_answer_index: q.correct_answer_index,
                correct_answers: q.correct_answers || [],
                essay_keywords: q.essay_keywords || []
            }));
            const { error: qError } = await supabase.from('questions').insert(questionsToInsert);
            if (qError) throw qError;
            
            addNotification(`Ujian "${title}" berhasil disimpan.`);
            Swal.fire('Sukses', 'Ujian berhasil disimpan.', 'success');
            refreshData();
            closeModal();
        } catch (error: any) {
            console.error(error);
            Swal.fire('Error', error.message || 'Gagal menyimpan ujian.', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
     const handleDelete = async (exam: Exam) => {
        Swal.fire({
            title: 'Hapus Ujian?',
            text: `Ujian "${exam.title}" akan dihapus permanen beserta semua soal dan hasil siswa.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonText: 'Batal',
            confirmButtonText: 'Ya, hapus!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const { error } = await supabase.from('exams').delete().eq('id', exam.id);
                    if (error) throw error;
                    addNotification(`Ujian "${exam.title}" telah dihapus.`);
                    Swal.fire('Dihapus!', 'Ujian telah berhasil dihapus.', 'success');
                    refreshData();
                } catch (error: any) {
                    Swal.fire('Error', error.message || 'Gagal menghapus ujian.', 'error');
                }
            }
        });
    };

    const resultsForSelectedExam = useMemo(() => {
        if (!selectedExamForResults) return [];
        return examAttempts
            .filter(attempt => attempt.exam_id === selectedExamForResults.id)
            .map(attempt => {
                const student = students.find(s => s.id === attempt.student_id);
                return {
                    studentName: student?.name || 'Siswa tidak ditemukan',
                    score: attempt.score,
                    completedAt: new Date(attempt.completed_at!).toLocaleString('id-ID')
                };
            })
            .sort((a,b) => b.score - a.score);
    }, [selectedExamForResults, examAttempts, students]);

    return (
        <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-3xl font-medium text-gray-900 dark:text-white">Ujian CBT</h3>
                <button onClick={() => openModal()} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    + Buat Ujian Baru
                </button>
            </div>
            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3">Judul Ujian</th>
                            <th className="px-6 py-3">Jumlah Soal</th>
                            <th className="px-6 py-3">Durasi</th>
                            <th className="px-6 py-3 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {exams.map(exam => (
                            <tr key={exam.id} className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-6 py-4 font-medium text-white">{exam.title}</td>
                                <td className="px-6 py-4">{exam.questions?.length || 0}</td>
                                <td className="px-6 py-4">{exam.duration_minutes} menit</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => openResultModal(exam)} className="text-gray-500 dark:text-gray-400 hover:text-green-400 mr-4"><EyeIcon className="w-5 h-5" /></button>
                                    <button onClick={() => openModal(exam)} className="text-gray-500 dark:text-gray-400 hover:text-blue-400 mr-4"><EditIcon className="w-5 h-5" /></button>
                                    <button onClick={() => handleDelete(exam)} className="text-gray-500 dark:text-gray-400 hover:text-red-400"><TrashIcon className="w-5 h-5" /></button>
                                </td>
                            </tr>
                        ))}
                        {exams.length === 0 && (
                            <tr><td colSpan={4} className="text-center py-8 text-gray-500">Belum ada ujian.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-3xl border border-gray-700 max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{currentExam.id ? 'Edit Ujian' : 'Buat Ujian Baru'}</h2>
                            <button onClick={closeModal}><XIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="flex-grow overflow-y-auto pr-2">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <input type="text" placeholder="Judul Ujian" value={currentExam.title || ''} onChange={e => setCurrentExam({...currentExam, title: e.target.value})} className="w-full p-2 bg-gray-700 rounded-md" />
                                <input type="number" placeholder="Durasi (menit)" value={currentExam.duration_minutes || ''} onChange={e => setCurrentExam({...currentExam, duration_minutes: parseInt(e.target.value)})} className="w-full p-2 bg-gray-700 rounded-md" />
                            </div>
                            <hr className="border-gray-600 my-4" />
                            {currentExam.questions.map((q, qIndex) => (
                                <div key={qIndex} className="bg-gray-900 p-4 rounded-md mb-4 border border-gray-700">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-4">
                                            <label className="text-gray-300 font-semibold">Soal #{qIndex + 1}</label>
                                            <select 
                                                value={q.question_type || 'multiple_choice'} 
                                                onChange={e => handleQuestionChange(qIndex, 'question_type', e.target.value)}
                                                className="bg-gray-800 text-xs text-gray-300 p-1 rounded border border-gray-600"
                                            >
                                                <option value="multiple_choice">Pilihan Ganda</option>
                                                <option value="multiple_response">PG Kompleks (Lebih dari 1 benar)</option>
                                                <option value="essay">Essai</option>
                                            </select>
                                        </div>
                                        <button onClick={() => removeQuestion(qIndex)} className="text-red-400 hover:text-red-300 text-sm">Hapus Soal</button>
                                    </div>
                                    
                                    {/* Menggunakan MathLive untuk teks soal */}
                                    <div className="mb-4">
                                        <label className="text-xs text-gray-500 block mb-1">Pertanyaan (Ketik rumus matematika atau teks bebas):</label>
                                        <math-field 
                                            class="w-full p-3 bg-gray-700 text-white rounded-md border border-gray-600 focus-within:border-blue-500 outline-none text-lg min-h-[60px]"
                                            onInput={(e: any) => handleQuestionChange(qIndex, 'question_text', e.target.value)}
                                        >
                                            {q.question_text || ''}
                                        </math-field>
                                    </div>

                                    {/* Render Opsi Berdasarkan Tipe Soal */}
                                    {(q.question_type === 'multiple_choice' || q.question_type === 'multiple_response' || !q.question_type) && (
                                        <div className="space-y-3 mt-4 border-t border-gray-700 pt-3">
                                            <label className="text-xs text-gray-500 block mb-2">Opsi Jawaban (Pilih jawaban benar):</label>
                                            {q.options?.map((opt, oIndex) => (
                                                <div key={oIndex} className="flex items-center gap-3">
                                                    {q.question_type === 'multiple_response' ? (
                                                        <input 
                                                            type="checkbox" 
                                                            checked={(q.correct_answers || []).includes(oIndex)} 
                                                            onChange={() => toggleCorrectAnswer(qIndex, oIndex)} 
                                                            className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded" 
                                                        />
                                                    ) : (
                                                        <input 
                                                            type="radio" 
                                                            name={`correct_q${qIndex}`} 
                                                            checked={q.correct_answer_index === oIndex} 
                                                            onChange={() => handleQuestionChange(qIndex, 'correct_answer_index', oIndex)} 
                                                            className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600" 
                                                        />
                                                    )}
                                                    <div className="flex-grow">
                                                        <math-field 
                                                            class="w-full p-2 bg-gray-800 text-white rounded-md border border-gray-600 focus-within:border-blue-500 outline-none"
                                                            onInput={(e: any) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                                        >
                                                            {opt || ''}
                                                        </math-field>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex justify-end">
                                                <button 
                                                    onClick={() => handleQuestionChange(qIndex, 'options', [...(q.options || []), ''])}
                                                    className="text-xs text-blue-400 hover:text-blue-300"
                                                >
                                                    + Tambah Opsi Lainnya
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {q.question_type === 'essay' && (
                                        <div className="mt-4 border-t border-gray-700 pt-3">
                                            <label className="text-xs text-gray-500 block mb-1">Penyelesaian (Kosongkan jika siswa bebas menjawab):</label>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Catatan: Soal essai saat ini akan dinilai manual oleh guru melalui dashboard.</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <button onClick={addQuestion} className="w-full py-2 border-2 border-dashed border-gray-600 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-700">+ Tambah Soal</button>
                        </div>
                        <div className="mt-6 flex justify-end pt-4 border-t border-gray-700">
                            <button onClick={handleSave} disabled={isLoading} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-800">
                                {isLoading ? 'Menyimpan...' : 'Simpan Ujian'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
             {isResultModalOpen && selectedExamForResults && (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl border border-gray-700 max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Hasil Ujian: {selectedExamForResults.title}</h2>
                            <button onClick={closeResultModal}><XIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3">Nama Siswa</th>
                                        <th className="px-6 py-3">Skor</th>
                                        <th className="px-6 py-3">Waktu Selesai</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-gray-800">
                                    {resultsForSelectedExam.map((res, idx) => (
                                        <tr key={idx} className="border-b border-gray-700">
                                            <td className="px-6 py-4 font-medium text-white">{res.studentName}</td>
                                            <td className="px-6 py-4 text-green-400 font-bold">{res.score.toFixed(1)}</td>
                                            <td className="px-6 py-4">{res.completedAt}</td>
                                        </tr>
                                    ))}
                                    {resultsForSelectedExam.length === 0 && (
                                        <tr><td colSpan={3} className="text-center py-8 text-gray-500">Belum ada siswa yang mengerjakan ujian ini.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UjianCbt;