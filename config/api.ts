import { GoogleGenerativeAI } from "@google/generative-ai";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Inisialisasi Gemini Client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
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
    try {
        let systemPrompt = "";

        if (payload.role === "guru") {
            // KHUSUS PENILAIAN (Guru menganalisis siswa)
            systemPrompt = `
Asisten Pedagogis Matematika. Tugas Anda: Berikan SKOR (0-100) dan REKOMENDASI.
FORMAT OUTPUT HARUS: "SKOR: [angka] | REKOMENDASI: [teks]"
JANGAN gunakan simbol Markdown (** atau *). Gunakan teks biasa.
`;
        } else if (payload.role === "asisten") {
            // KHUSUS CHAT / ASISTEN AI (Tanya jawab umum)
            systemPrompt = "Asisten AI Matematika. Jawab pertanyaan dengan ramah, jelas, dan akurat. Gunakan teks biasa TANPA Markdown.";
        } else {
            // KHUSUS SISWA (Tutor AI)
            systemPrompt = "Tutor Matiku AI. Jawab sebagai guru yang ramah. Berikan penjelasan yang JELAS dan TUNTAS. JANGAN gunakan simbol Markdown (seperti ** atau *). Gunakan format teks biasa yang bersih.";
        }

        const fullPrompt = `
Role: ${systemPrompt}
Context: ${payload.context || "Math"}
Pertanyaan/Data: ${payload.question}

Jawaban:
`;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        return response.text().trim();

    } catch (error: any) {
        console.error("Gemini Frontend Error:", error);

        // Fallback ke Backend jika Gemini Frontend gagal
        try {
            const res = await fetch(`${BACKEND_URL}/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            return data.response || "Gagal mendapatkan respon dari AI.";
        } catch (backendError) {
            throw new Error("Gagal menghubungi Gemini maupun Backend AI.");
        }
    }
}

/**
 * Cek status backend.
 */
export async function checkBackendHealth(): Promise<HealthResponse> {
    try {
        const res = await fetch(`${BACKEND_URL}/health`);
        if (!res.ok) throw new Error("Backend tidak dapat dijangkau.");
        return res.json();
    } catch (e) {
        return { status: "offline", model_loaded: false, message: "Backend offline" };
    }
}
