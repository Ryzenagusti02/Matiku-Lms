import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import Swal from 'sweetalert2';
import { EyeIcon, EyeOffIcon, LogInIcon, UserPlusIcon, GoogleIcon } from './icons';

const swalError = (title: string, text: string) =>
    Swal.fire({ title, text, icon: 'error', background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff', color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#111827' });

const swalSuccess = (title: string, text: string) =>
    Swal.fire({ title, text, icon: 'success', background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff', color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#111827' });

// Floating math symbols for background decoration
const MATH_SYMBOLS = ['∑', '∫', 'π', '√', '∞', 'Δ', 'θ', 'λ', '∂', 'α', 'β', 'γ', 'φ', '±', '÷', '×', '≈', '≠', '∈', '∀'];

const MathBackground: React.FC = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {MATH_SYMBOLS.map((sym, i) => (
            <span
                key={i}
                className="math-bg-symbol"
                style={{
                    left: `${(i * 5) % 95}%`,
                    top: `${(i * 7 + 3) % 90}%`,
                    fontSize: `${1.2 + (i % 4) * 0.6}rem`,
                    animationDelay: `${(i * 0.4)}s`,
                    animationDuration: `${6 + (i % 5) * 2}s`,
                }}
            >
                {sym}
            </span>
        ))}
    </div>
);

const AuthPage: React.FC = () => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);

    const handleViewChange = (newView: boolean) => {
        if (isLoginView === newView) return;
        setIsAnimatingOut(true);
        setTimeout(() => {
            setIsLoginView(newView);
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setIsAnimatingOut(false);
        }, 300);
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin },
            });
            if (error) swalError('Error Login Google', error.message);
        } catch (err: any) {
            swalError('Koneksi Gagal', err.message || 'Tidak dapat terhubung ke server.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isLoginView) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) swalError('Login Gagal', error.message);
            } else {
                if (password !== confirmPassword) {
                    swalError('Error Pendaftaran', 'Password dan konfirmasi password tidak cocok.');
                    return;
                }
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/verification-success`,
                    },
                });
                if (error) {
                    swalError('Pendaftaran Gagal', error.message);
                } else {
                    await swalSuccess('Pendaftaran Berhasil', 'Silakan cek email Anda untuk verifikasi.');
                    handleViewChange(true);
                }
            }
        } catch (err: any) {
            swalError('Koneksi Gagal', err.message || 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
        } finally {
            setIsLoading(false);
        }
    };

    const passwordInput = (
        value: string,
        setter: (val: string) => void,
        show: boolean,
        showSetter: (val: boolean) => void,
        placeholder: string,
        id: string,
        label: string,
    ) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
            <div className="relative">
                <input
                    type={show ? 'text' : 'password'}
                    id={id}
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder={placeholder}
                    required
                    className="w-full px-4 py-2 text-gray-200 bg-gray-900/50 border border-gray-600/50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500"
                />
                <button
                    type="button"
                    onClick={() => showSetter(!show)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-200"
                >
                    {show ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
            </div>
        </div>
    );

    const formContent = (
        <div className={`${isAnimatingOut ? 'animate-fade-out-form' : 'animate-fade-in-form'}`}>
            <h2 className="text-2xl font-bold text-center">
                {isLoginView ? 'Selamat Datang Kembali!' : 'Buat Akun Baru'}
            </h2>

            <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Alamat Email"
                        required
                        className="w-full px-4 py-2 text-gray-200 bg-gray-900/50 border border-gray-600/50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500"
                    />
                </div>

                {passwordInput(password, setPassword, showPassword, setShowPassword, 'Password', 'password', isLoginView ? 'Password' : 'Buat Password')}
                {!isLoginView && passwordInput(confirmPassword, setConfirmPassword, showConfirmPassword, setShowConfirmPassword, 'Konfirmasi Password', 'confirmPassword', 'Konfirmasi Password')}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center items-center px-4 py-2 text-lg font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-800 transition-colors"
                >
                    {isLoading ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : isLoginView ? (
                        <><LogInIcon className="w-5 h-5 mr-2" /> Login</>
                    ) : (
                        <><UserPlusIcon className="w-5 h-5 mr-2" /> Daftar</>
                    )}
                </button>
            </form>

            <div className="relative flex items-center justify-center">
                <div className="absolute inset-x-0 h-px bg-gray-700" />
                <span className="relative px-4 text-sm text-gray-400 bg-transparent">Atau</span>
            </div>

            <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-2 space-x-2 text-gray-200 bg-gray-900/40 border border-gray-600/50 rounded-md hover:bg-gray-900/60 transition-colors backdrop-blur-sm"
            >
                <GoogleIcon className="w-6 h-6" />
                <span>{isLoginView ? 'Masuk dengan Google' : 'Daftar dengan Google'}</span>
            </button>

            <p className="text-sm text-center text-gray-400">
                {isLoginView ? 'Belum punya akun? ' : 'Sudah punya akun? '}
                <button onClick={() => handleViewChange(!isLoginView)} className="font-medium text-blue-400 hover:underline">
                    {isLoginView ? 'Daftar di sini' : 'Login di sini'}
                </button>
            </p>
        </div>
    );

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 animate-gradient-xy text-white p-4 overflow-hidden">
            <MathBackground />

            <div className="relative z-10 flex items-center mb-8 animate-zoom-in-fade">
                <img src="/favicon.svg" alt="Matiku LMS Logo" className="w-12 h-12" />
                <span className="ml-4 text-3xl font-bold">Matiku LMS</span>
            </div>

            <div className="relative z-10 w-full max-w-md p-8 space-y-6 bg-white/10 rounded-2xl shadow-2xl animate-zoom-in-fade border border-white/20 backdrop-blur-md" style={{ animationDelay: '100ms', backdropFilter: 'blur(10px)' }}>
                <div className="flex border-b border-gray-700">
                    <button onClick={() => handleViewChange(true)} className={`flex-1 py-2 text-lg font-medium transition-colors focus:outline-none ${isLoginView ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}>
                        Login
                    </button>
                    <button onClick={() => handleViewChange(false)} className={`flex-1 py-2 text-lg font-medium transition-colors focus:outline-none ${!isLoginView ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}>
                        Daftar
                    </button>
                </div>
                <div className="min-h-[390px] flex flex-col justify-center">
                    {formContent}
                </div>
            </div>

            {/* Footer */}
            <p className="relative z-10 mt-6 text-xs text-gray-600 animate-fade-in" style={{ animationDelay: '500ms' }}>
                Platform Pembelajaran Matematika Interaktif
            </p>
        </div>
    );
};

export default AuthPage;