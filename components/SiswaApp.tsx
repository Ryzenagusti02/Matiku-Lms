import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../config/supabaseClient';
import SiswaDashboard from './SiswaDashboard';
import { Student, Exam, ExamAttempt, Assignment, Submission } from '../types';
import Swal from 'sweetalert2';

interface SiswaAppProps {
    user: User;
}

const SiswaApp: React.FC<SiswaAppProps> = ({ user }) => {
    const [studentData, setStudentData] = useState<Student | undefined>(undefined);
    const [teacherExams, setTeacherExams] = useState<Exam[]>([]);
    const [studentExamAttempts, setStudentExamAttempts] = useState<ExamAttempt[]>([]);
    const [studentAssignments, setStudentAssignments] = useState<Assignment[]>([]);
    const [studentSubmissions, setStudentSubmissions] = useState<Submission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refreshData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: userProfile, error: profileError } = await supabase
                .from('profiles')
                .select('teacher_id')
                .eq('id', user.id)
                .single();
            
            if (profileError || !userProfile) throw new Error("Could not fetch user profile.");

            const teacherUid = userProfile.teacher_id;
            if (teacherUid) {
                const { data: studentProfile, error: studentError } = await supabase.from('students').select('*').eq('uid', user.id).eq('teacher_id', teacherUid).single();
                if (studentError) console.error("Error fetching student data:", studentError.message);
                
                let studentClassInfo = '';
                if (studentProfile) {
                    setStudentData(studentProfile as Student);
                    studentClassInfo = `${studentProfile.grade} - ${studentProfile.class}`;
                }

                const [examsRes, attemptsRes, assignmentsRes, submissionsRes] = await Promise.all([
                    supabase.from('exams').select('*').eq('teacher_id', teacherUid).order('created_at', { ascending: false }),
                    supabase.from('exam_attempts').select('*').eq('student_uid', user.id),
                    supabase.from('assignments').select('*').eq('teacher_id', teacherUid).order('due_date', { ascending: true }),
                    supabase.from('submissions').select('*').eq('student_uid', user.id),
                ]);

                if (examsRes.error) throw examsRes.error;
                if (attemptsRes.error) throw attemptsRes.error;
                if (assignmentsRes.error) throw assignmentsRes.error;
                if (submissionsRes.error) throw submissionsRes.error;

                setTeacherExams(examsRes.data as Exam[]);
                setStudentExamAttempts(attemptsRes.data as ExamAttempt[]);
                const allAssignments = assignmentsRes.data as Assignment[];
                setStudentAssignments(allAssignments.filter(a => a.assigned_to_class === 'all' || a.assigned_to_class === studentClassInfo));
                setStudentSubmissions(submissionsRes.data as Submission[]);
            }
        } catch (error: any) {
            console.error("Error fetching siswa data:", error.message);
            Swal.fire({
                title: 'Gagal Memuat Data',
                text: 'Tidak dapat mengambil data siswa. Periksa koneksi internet Anda dan coba lagi.',
                icon: 'error',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff', color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#111827'
            });
        } finally {
            setIsLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 animate-gradient-xy text-white overflow-hidden relative">
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
            </div>
        );
    }

    return (
        <SiswaDashboard
            user={user}
            studentData={studentData}
            exams={teacherExams}
            attempts={studentExamAttempts}
            assignments={studentAssignments}
            submissions={studentSubmissions}
            refreshData={refreshData}
        />
    );
};

export default SiswaApp;