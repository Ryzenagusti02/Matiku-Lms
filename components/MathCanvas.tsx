import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { ExpandIcon } from './icons';

interface MathCanvasProps { user: User; }

const MathCanvas: React.FC<MathCanvasProps> = ({ user }) => {
    const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const toggleFullscreen = () => {
        if (!isFullscreen) containerRef.current?.requestFullscreen?.();
        else document.exitFullscreen?.();
        setIsFullscreen(!isFullscreen);
    };

    return (
        <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-3xl font-medium text-gray-900 dark:text-white">Papan Matematika</h3>
                </div>
                <div className="flex gap-2 items-center">
                    <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                        <button onClick={() => setViewMode('2d')} className={`px-3 py-1 text-sm rounded-md transition-colors ${viewMode === '2d' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>GeoGebra 2D</button>
                        <button onClick={() => setViewMode('3d')} className={`px-3 py-1 text-sm rounded-md transition-colors ${viewMode === '3d' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>GeoGebra 3D</button>
                    </div>
                </div>
            </div>

            <div ref={containerRef} className="relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm" style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 180px)' }}>
                <button onClick={toggleFullscreen} className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white shadow-lg"><ExpandIcon className="w-4 h-4" /></button>

                {viewMode === '3d' ? (
                    <iframe src="https://www.geogebra.org/classic/3d?embed" width="100%" height="100%" style={{ border: 0, display: 'block' }} allowFullScreen></iframe>
                ) : (
                    <iframe src="https://www.geogebra.org/classic/geometry?embed" width="100%" height="100%" style={{ border: 0, display: 'block' }} allowFullScreen></iframe>
                )}
            </div>
        </div>
    );
};

export default MathCanvas;
