import React, { useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { DownloadIcon } from './icons';
import Swal from 'sweetalert2';

interface PdfExportButtonProps {
    targetRef: React.RefObject<HTMLDivElement | null>;
    fileName: string;
    title?: string;
}

// Dynamically load a script and wait for it to finish
function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        // Check if script is already loaded
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            // Script tag exists but might not have loaded yet; wait a bit then resolve
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Gagal memuat script: ${src}`));
        document.head.appendChild(script);
    });
}

// Ensure html2canvas is available on window
async function ensureHtml2Canvas(): Promise<any> {
    if (typeof (window as any).html2canvas === 'function') {
        return (window as any).html2canvas;
    }
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    // Wait a tick for the global to register
    await new Promise(r => setTimeout(r, 100));
    if (typeof (window as any).html2canvas === 'function') {
        return (window as any).html2canvas;
    }
    throw new Error('Library html2canvas tidak ditemukan atau gagal dimuat.');
}

// Ensure jsPDF constructor is available on window
async function ensureJsPDF(): Promise<any> {
    // Check existing globals first
    const existing = getJsPDFConstructor();
    if (existing) return existing;

    // Load jsPDF UMD
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js');
    // Wait a tick for the global to register
    await new Promise(r => setTimeout(r, 200));

    const ctor = getJsPDFConstructor();
    if (ctor) return ctor;
    throw new Error('Library jsPDF tidak ditemukan atau gagal dimuat.');
}

function getJsPDFConstructor(): any {
    const jspdfObj = (window as any).jspdf;
    if (jspdfObj && typeof jspdfObj.jsPDF === 'function') return jspdfObj.jsPDF;
    if (typeof (window as any).jsPDF === 'function') return (window as any).jsPDF;
    if (typeof jspdfObj === 'function') return jspdfObj;
    return null;
}

const PdfExportButton: React.FC<PdfExportButtonProps> = ({ targetRef, fileName, title = 'Export PDF' }) => {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        if (!targetRef.current) {
            Swal.fire({ title: 'Error', text: 'Konten tidak ditemukan untuk di-export.', icon: 'error', background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff', color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#111827' });
            return;
        }

        setIsExporting(true);

        try {
            // Dynamically ensure libraries are loaded
            const html2canvasFn = await ensureHtml2Canvas();
            const jsPDFConstructor = await ensureJsPDF();

            // Capture the target element as canvas
            const canvas = await html2canvasFn(targetRef.current, {
                backgroundColor: '#111827',
                scale: 2,
                useCORS: true,
                logging: false,
                windowWidth: targetRef.current.scrollWidth,
                windowHeight: targetRef.current.scrollHeight,
            });

            const imgData = canvas.toDataURL('image/png');

            const pdf = new jsPDFConstructor({
                orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth - 20; // 10mm margin each side
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Add header
            pdf.setFillColor(17, 24, 39);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(16);
            pdf.text(`Matiku LMS - ${fileName}`, 10, 12);
            pdf.setFontSize(8);
            pdf.setTextColor(156, 163, 175);
            pdf.text(`Diekspor pada: ${new Date().toLocaleString('id-ID')}`, 10, 18);
            pdf.setDrawColor(55, 65, 81);
            pdf.line(10, 20, pageWidth - 10, 20);

            // Add image content (may need multiple pages)
            let yOffset = 25;
            const availableHeight = pageHeight - 30; // 25mm top + 5mm bottom

            if (imgHeight <= availableHeight) {
                pdf.addImage(imgData, 'PNG', 10, yOffset, imgWidth, imgHeight);
            } else {
                // Multi-page support
                let remainingHeight = imgHeight;
                let sourceY = 0;
                let isFirstPage = true;

                while (remainingHeight > 0) {
                    if (!isFirstPage) {
                        pdf.addPage();
                        yOffset = 10;
                    }

                    const sliceHeight = isFirstPage ? availableHeight : pageHeight - 15;
                    const sourceHeight = (sliceHeight / imgWidth) * canvas.width;

                    // Create a cropped canvas for this page slice
                    const pageCanvas = document.createElement('canvas');
                    pageCanvas.width = canvas.width;
                    pageCanvas.height = Math.min(sourceHeight, canvas.height - sourceY);
                    const ctx = pageCanvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(canvas, 0, sourceY, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);
                        const pageImgData = pageCanvas.toDataURL('image/png');
                        const pageImgHeight = (pageCanvas.height * imgWidth) / canvas.width;
                        if (!isFirstPage) {
                            pdf.setFillColor(17, 24, 39);
                            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
                        }
                        pdf.addImage(pageImgData, 'PNG', 10, yOffset, imgWidth, pageImgHeight);
                    }

                    sourceY += sourceHeight;
                    remainingHeight -= sliceHeight;
                    isFirstPage = false;
                }
            }

            // Generate PDF blob
            const pdfBlob = pdf.output('blob');

            // Sanitize filename for compatibility
            const safeName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');

            // Upload to Supabase Storage
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const timestamp = Date.now();
                const filePath = `pdfs/${user.id}/${timestamp}_${safeName}.pdf`;

                const { error: uploadError } = await supabase.storage
                    .from('matiku_storage')
                    .upload(filePath, pdfBlob, {
                        contentType: 'application/pdf',
                        upsert: false,
                    });

                if (uploadError) {
                    console.warn('PDF upload to Supabase failed:', uploadError.message);
                    // Still allow local download even if upload fails
                }
            }

            // Also trigger local download
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${safeName}_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'PDF berhasil diekspor & disimpan!',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff', color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#111827',
            });
        } catch (error: any) {
            console.error('PDF export error:', error);
            Swal.fire({
                title: 'Export Gagal',
                text: error.message || 'Terjadi kesalahan saat mengekspor PDF.',
                icon: 'error',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff', color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#111827',
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={isExporting}
            title={title}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)',
            }}
        >
            {isExporting ? (
                <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Mengekspor...</span>
                </>
            ) : (
                <>
                    <DownloadIcon className="w-4 h-4" />
                    <span>Simpan PDF</span>
                </>
            )}
        </button>
    );
};

export default PdfExportButton;
