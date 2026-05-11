import React, { useState, useEffect } from 'react';
import { SparklesIcon } from './icons';
import { checkBackendHealth, HealthResponse } from '../config/api';

const ApiKeyManager: React.FC = () => {
    const [health, setHealth] = useState<HealthResponse | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState('');

    const check = async () => {
        setIsChecking(true);
        setError('');
        try {
            const result = await checkBackendHealth();
            setHealth(result);
        } catch (e: any) {
            setError('Backend tidak dapat dijangkau. Pastikan server berjalan di http://localhost:8000');
            setHealth(null);
        } finally {
            setIsChecking(false);
        }
    };

    useEffect(() => {
        check();
    }, []);

    const statusColor = health?.model_loaded
        ? 'text-green-400'
        : health
        ? 'text-yellow-400'
        : 'text-red-400';

    const statusDot = health?.model_loaded
        ? 'bg-green-400'
        : health
        ? 'bg-yellow-400'
        : 'bg-red-400';

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
            <div className="flex items-center mb-4">
                <SparklesIcon className="w-5 h-5 text-blue-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">Status Backend AI</h3>
            </div>

            <div className="flex items-center gap-2 mb-3">
                <span className={`inline-block w-2.5 h-2.5 rounded-full animate-pulse ${statusDot}`} />
                <span className={`text-sm font-medium ${statusColor}`}>
                    {isChecking
                        ? 'Memeriksa koneksi...'
                        : error
                        ? 'Tidak terhubung'
                        : health?.model_loaded
                        ? 'Model siap'
                        : 'Backend aktif — Model belum di-load'}
                </span>
            </div>

            {health && (
                <p className="text-xs text-gray-400 mb-4">{health.message}</p>
            )}
            {error && (
                <p className="text-xs text-red-400 mb-4">{error}</p>
            )}

            <div className="text-xs text-gray-500 mb-4 bg-gray-900 rounded p-3 font-mono">
                <p>Backend URL: <span className="text-blue-300">http://localhost:8000</span></p>
                <p className="mt-1">Model: <span className="text-blue-300">T5 fine-tuned (model_ai_pedagogis)</span></p>
            </div>

            {!health?.model_loaded && !isChecking && (
                <div className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800 rounded p-3 mb-4">
                    <p className="font-semibold mb-1">Model belum tersedia</p>
                    <p>Jalankan perintah berikut di folder <code className="bg-gray-700 px-1 rounded">backend/</code>:</p>
                    <code className="block mt-2 bg-gray-900 rounded p-2 text-green-300">
                        .\venv\Scripts\python train.py
                    </code>
                    <p className="mt-2">Setelah training selesai, jalankan server:</p>
                    <code className="block mt-1 bg-gray-900 rounded p-2 text-green-300">
                        .\venv\Scripts\python api.py
                    </code>
                </div>
            )}

            <button
                onClick={check}
                disabled={isChecking}
                className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-blue-800 transition-colors"
            >
                {isChecking ? 'Memeriksa...' : 'Periksa Ulang Koneksi'}
            </button>
        </div>
    );
};

export default ApiKeyManager;
