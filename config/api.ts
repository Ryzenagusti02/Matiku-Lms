import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("VITE_GEMINI_API_KEY tidak ditemukan. Pastikan sudah di-set di .env atau Vercel Environment Variables.");
}

// Inisialisasi Gemini Client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.7,
    }
});

export interface GenerateRequest {
    role: "guru" | "siswa" | "asisten";
    question: string;
    context?: string;
}

export interface GenerateResponse {
    response: string;
    role: string;
    model_used: string;
}

export interface HealthResponse {
    status: string;
    model_loaded: boolean;
    message: string;
}

/**
 * Kirim pertanyaan langsung ke Google Gemini API dari frontend.
 */
export async function generateAiResponse(payload: GenerateRequest): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error("API Key Gemini belum di-set. Hubungi administrator.");
    }

    let systemPrompt = "";

    if (payload.role === "guru") {
        systemPrompt = `
Asisten Pedagogis Matematika. Tugas Anda: Berikan SKOR (0-100) dan REKOMENDASI.
FORMAT OUTPUT HARUS: "SKOR: [angka] | REKOMENDASI: [teks]"
JANGAN gunakan simbol Markdown (** atau *). Gunakan teks biasa.
`;
    } else if (payload.role === "asisten") {
        systemPrompt = "Asisten AI Matematika. Jawab pertanyaan dengan ramah, jelas, dan akurat. Gunakan teks biasa TANPA Markdown.";
    } else {
        systemPrompt = "Tutor Matiku AI. Jawab sebagai guru yang ramah. Berikan penjelasan yang JELAS dan TUNTAS. JANGAN gunakan simbol Markdown (seperti ** atau *). Gunakan format teks biasa yang bersih.";
    }

    const fullPrompt = `
Role: ${systemPrompt}
Context: ${payload.context || "Math"}
Pertanyaan/Data: ${payload.question}

Jawaban:
`;

    try {
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error: any) {
        console.error("Gemini Error:", error);
        throw new Error("Gagal menghubungi Gemini AI. Pastikan API Key valid dan coba lagi.");
    }
}

/**
 * Cek status koneksi Gemini.
 */
export async function checkBackendHealth(): Promise<HealthResponse> {
    if (!GEMINI_API_KEY) {
        return { status: "offline", model_loaded: false, message: "API Key Gemini belum di-set." };
    }
    return { status: "online", model_loaded: true, message: "Gemini AI siap digunakan." };
}
