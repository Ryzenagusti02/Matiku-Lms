import React, { useState, useEffect, useCallback } from 'react';
import { Exam, Question, Student, ExamAttempt } from '../types';
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

interface UjianSiswaProps {
    exam: Exam;
    student: Student;
    onFinish: () => void;
}

const UjianSiswa: React.FC<UjianSiswaProps> = ({ exam, student, onFinish }) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<{ [key: string]: any }>({});
    const [timeLeft, setTimeLeft] = useState(exam.duration_minutes * 60);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [view, setView] = useState<'taking' | 'result'>('taking');
    const [finalAttempt, setFinalAttempt] = useState<ExamAttempt | null>(null);

    useEffect(() => {
        const fetchQuestions = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('questions')
                .select('*')
                .eq('exam_id', exam.id);
            if (error) {
                Swal.fire('Error', 'Gagal memuat soal ujian.', 'error');
                onFinish();
            } else {
                setQuestions(data as Question[]);
            }
            setIsLoading(false);
        };
        fetchQuestions();
    }, [exam.id, onFinish]);

    const handleSubmit = useCallback(async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        let correctCount = 0;
        let totalGradable = 0;
        questions.forEach(q => {
            const userAnswer = answers[q.id];
            if (q.question_type === 'multiple_choice' || !q.question_type) {
                totalGradable++;
                if (userAnswer === q.correct_answer_index) correctCount++;
            } else if (q.question_type === 'multiple_response') {
                totalGradable++;
                const correctArr = [...(q.correct_answers || [])].sort();
                const userArr = [...(userAnswer || [])].sort();
                if (JSON.stringify(correctArr) === JSON.stringify(userArr)) {
                    correctCount++;
                }
            }
        });
        const score = totalGradable > 0 ? (correctCount / totalGradable) * 100 : 0;
        
        const attemptData = {
            exam_id: exam.id,
            student_id: student.id,
            student_uid: student.uid,
            score: score,
            answers: answers,
            completed_at: new Date().toISOString(),
        };

        try {
            const { data, error } = await supabase.from('exam_attempts').insert(attemptData).select().single();
            if (error) throw error;
            setFinalAttempt(data as ExamAttempt);
            setView('result');
        } catch (error: any) {
            Swal.fire('Error', error.message || 'Gagal mengirimkan jawaban.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    }, [answers, exam, student, questions]);

    useEffect(() => {
        if (view === 'taking' && !isLoading) {
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        handleSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [view, isLoading, handleSubmit]);

    const handleAnswerSelect = (questionId: string, value: any, type: string) => {
        if (type === 'multiple_response') {
            setAnswers(prev => {
                const current = prev[questionId] || [];
                if (current.includes(value)) {
                    return { ...prev, [questionId]: current.filter((v: number) => v !== value) };
                } else {
                    return { ...prev, [questionId]: [...current, value] };
                }
            });
        } else {
            setAnswers(prev => ({ ...prev, [questionId]: value }));
        }
    };

    if (isLoading) {
        return <div className="text-center p-10">Memuat soal...</div>;
    }
    
    if (view === 'result' && finalAttempt) {
        return (
             <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100 p-6 animate-fade-in-up">
                <h1 className="text-3xl font-bold text-white mb-2">Hasil Ujian: {exam.title}</h1>
                <p className="text-lg text-gray-400 mb-6">Skor Akhir Anda: <span className="text-2xl font-bold text-green-400">{finalAttempt.score.toFixed(1)}</span></p>
                <div className="flex-grow bg-gray-800 p-6 rounded-lg overflow-y-auto">
                    {questions.map((q, index) => {
                        const userAnswer = answers[q.id];
                        const isCorrect = userAnswer === q.correct_answer_index;
                        return (
                            <div key={q.id} className="mb-6 pb-4 border-b border-gray-700">
                                <div className="text-gray-300 mb-3 flex gap-2">
                                    <span>{index + 1}.</span> 
                                    <math-field readonly class="bg-transparent border-none outline-none text-sm">{q.question_text || ''}</math-field>
                                </div>
                                <div className="space-y-2">
                                    {(!q.question_type || q.question_type === 'multiple_choice') && q.options.map((opt, oIndex) => {
                                        let optionClass = 'border-gray-600';
                                        if (oIndex === q.correct_answer_index) optionClass = 'border-green-500 bg-green-500/20';
                                        if (oIndex === userAnswer && !isCorrect) optionClass = 'border-red-500 bg-red-500/20';
                                        return (
                                            <div key={oIndex} className={`p-3 border rounded-md flex ${optionClass}`}>
                                                <span className="mr-2">{oIndex === userAnswer && (isCorrect ? '✓ ' : '✗ ')}</span>
                                                <math-field readonly class="bg-transparent border-none outline-none">{opt}</math-field>
                                            </div>
                                        );
                                    })}
                                    
                                    {q.question_type === 'multiple_response' && q.options.map((opt, oIndex) => {
                                        const userArr = userAnswer || [];
                                        const correctArr = q.correct_answers || [];
                                        const isUserSelected = userArr.includes(oIndex);
                                        const isOptionCorrect = correctArr.includes(oIndex);
                                        
                                        let optionClass = 'border-gray-600';
                                        if (isOptionCorrect) optionClass = 'border-green-500 bg-green-500/20';
                                        else if (isUserSelected && !isOptionCorrect) optionClass = 'border-red-500 bg-red-500/20';
                                        
                                        return (
                                            <div key={oIndex} className={`p-3 border rounded-md flex ${optionClass}`}>
                                                <span className="mr-2">{isUserSelected ? (isOptionCorrect ? '✓ ' : '✗ ') : ''}</span>
                                                <math-field readonly class="bg-transparent border-none outline-none">{opt}</math-field>
                                            </div>
                                        )
                                    })}

                                    {q.question_type === 'essay' && (
                                        <div className="p-4 border border-blue-500 bg-blue-900/20 rounded-md">
                                            <p className="text-xs text-blue-300 mb-2">Jawaban Anda (Menunggu penilaian guru):</p>
                                            <math-field readonly class="bg-transparent border-none outline-none text-white">{userAnswer || 'Tidak ada jawaban'}</math-field>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                 <div className="mt-6 text-center">
                    <button onClick={onFinish} className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Kembali ke Dashboard
                    </button>
                </div>
            </div>
        );
    }
    
    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-gray-100 p-6">
            <header className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">{exam.title}</h1>
                <div className="text-lg font-semibold bg-red-600 px-4 py-2 rounded-md">
                    Sisa Waktu: {Math.floor(timeLeft / 60)}:{('0' + (timeLeft % 60)).slice(-2)}
                </div>
            </header>

            <div className="flex-grow bg-gray-800 p-6 rounded-lg flex flex-col">
                <div className="mb-4">
                    <p className="text-sm text-gray-400">Soal {currentQuestionIndex + 1} dari {questions.length}</p>
                    <div className="w-full bg-gray-700 rounded-full h-2.5 mt-1">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}></div>
                    </div>
                </div>
                
                <div className="flex-grow overflow-y-auto">
                    <div className="text-xl mb-6">
                        <math-field readonly class="bg-transparent border-none outline-none">{currentQuestion?.question_text || ''}</math-field>
                    </div>
                    
                    {(!currentQuestion?.question_type || currentQuestion?.question_type === 'multiple_choice') && (
                        <div className="space-y-3">
                            {currentQuestion?.options.map((option, index) => (
                                <label key={index} className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${answers[currentQuestion.id] === index ? 'border-blue-500 bg-blue-900/50' : 'border-gray-600 hover:bg-gray-700'}`}>
                                    <input
                                        type="radio"
                                        name={`question_${currentQuestion.id}`}
                                        className="hidden"
                                        checked={answers[currentQuestion.id] === index}
                                        onChange={() => handleAnswerSelect(currentQuestion.id, index, 'multiple_choice')}
                                    />
                                    <div className="flex items-center">
                                        <span className="mr-3 font-bold">{String.fromCharCode(65 + index)}.</span>
                                        <math-field readonly class="bg-transparent border-none outline-none pointer-events-none">{option || ''}</math-field>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}

                    {currentQuestion?.question_type === 'multiple_response' && (
                        <div className="space-y-3">
                            <p className="text-sm text-blue-400 mb-2">Pilih semua jawaban yang benar (bisa lebih dari satu):</p>
                            {currentQuestion?.options.map((option, index) => {
                                const isChecked = (answers[currentQuestion.id] || []).includes(index);
                                return (
                                <label key={index} className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${isChecked ? 'border-blue-500 bg-blue-900/50' : 'border-gray-600 hover:bg-gray-700'}`}>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={isChecked}
                                        onChange={() => handleAnswerSelect(currentQuestion.id, index, 'multiple_response')}
                                    />
                                    <div className="flex items-center">
                                        <div className={`w-5 h-5 border-2 mr-4 flex items-center justify-center ${isChecked ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`}>
                                            {isChecked && <span className="text-white text-xs">✓</span>}
                                        </div>
                                        <math-field readonly class="bg-transparent border-none outline-none pointer-events-none">{option || ''}</math-field>
                                    </div>
                                </label>
                            )})}
                        </div>
                    )}

                    {currentQuestion?.question_type === 'essay' && (
                        <div className="space-y-3">
                            <p className="text-sm text-blue-400 mb-2">Ketik jawaban Essai Anda (Dapat menggunakan format matematika):</p>
                            <math-field 
                                class="w-full p-4 bg-gray-700 text-white rounded-lg border-2 border-gray-600 focus-within:border-blue-500 min-h-[150px]"
                                onInput={(e: any) => handleAnswerSelect(currentQuestion.id, e.target.value, 'essay')}
                            >
                                {answers[currentQuestion.id] || ''}
                            </math-field>
                        </div>
                    )}
                </div>
            </div>

            <footer className="mt-6 flex justify-between items-center">
                <button 
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="px-6 py-3 bg-gray-600 rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                    Sebelumnya
                </button>
                {currentQuestionIndex === questions.length - 1 ? (
                    <button onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-3 bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50">
                        {isSubmitting ? 'Mengirim...' : 'Selesaikan Ujian'}
                    </button>
                ) : (
                    <button 
                        onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                        className="px-6 py-3 bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                        Selanjutnya
                    </button>
                )}
            </footer>
        </div>
    );
};

export default UjianSiswa;