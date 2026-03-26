export type AIProvider = 'gemini' | 'groq';

const WORKER_URL = 'https://ai-proxy.jbetanzos1.workers.dev';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 2000): Promise<T> {
    let lastError: any;
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            const isRateLimit = error?.message?.includes('429') || error?.status === 429 || error?.code === 429 || error?.message?.includes('rate_limit');

            if (isRateLimit && i < maxRetries) {
                const waitTime = initialDelay * Math.pow(2, i);
                console.warn(`Rate Limit (429). Retrying in ${waitTime}ms... (Attempt ${i + 1}/${maxRetries})`);
                await delay(waitTime);
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}

// --- GEMINI IMPLEMENTATION ---

const extractTextWithGemini = async (base64Data: string, mimeType: string): Promise<string> => {
    return callWithRetry(async () => {
        const response = await fetch(`${WORKER_URL}/api/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [
                        { inlineData: { mimeType: mimeType, data: base64Data } },
                        { text: "Transcribe el texto de este documento exactamente como aparece. Mantén la estructura (listas, encabezados) usando Markdown. No incluyas ningún texto de introducción o cierre." }
                    ]
                }]
            })
        });
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo extraer ningún texto.";
    });
};

const analyzeWithGemini = async (text: string, base64Data?: string, mimeType?: string): Promise<string> => {
    return callWithRetry(async () => {
        const parts: any[] = [
            { text: `Analiza el contenido de este documento:\n\n${text}\n\nProporciona un resumen estructurado que incluya:\n1. Tipo de Documento\n2. Fechas Clave\n3. Entidades Principales (Personas/Empresas)\n4. Tareas Pendientes o Resumen` }
        ];

        if (base64Data && mimeType) {
            parts.unshift({ inlineData: { mimeType: mimeType, data: base64Data } });
        }

        const response = await fetch(`${WORKER_URL}/api/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts }]
            })
        });

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "El análisis falló.";
    });
};

// --- GROQ IMPLEMENTATION ---

const GROQ_VISION_MODELS = [
    'llama-3.2-11b-vision-instant',
    'llama-3.2-90b-vision-instant',
    'meta-llama/llama-4-scout-17b-16e-instruct',
];

const extractTextWithGroq = async (base64Data: string, mimeType: string): Promise<string> => {
    return callWithRetry(async () => {
        if (mimeType.includes('pdf')) {
            throw new Error("Groq no admite archivos PDF para visión. Por favor, usa el proveedor Gemini.");
        }

        let lastError: any;

        for (const model of GROQ_VISION_MODELS) {
            try {
                const response = await fetch(`${WORKER_URL}/api/groq`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model,
                        messages: [{
                            role: 'user',
                            content: [
                                { type: 'text', text: "Transcribe el texto de este documento exactamente como aparece. Mantén la estructura (listas, encabezados) usando Markdown. No incluyas ningún texto de introducción o cierre." },
                                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } }
                            ]
                        }],
                        temperature: 0.1,
                        max_tokens: 4096
                    })
                });

                if (response.status === 404 || response.status === 400) {
                    const errorData = await response.json();
                    const errMsg = errorData.error?.message || '';
                    console.warn(`Groq model ${model} failed (${response.status}): ${errMsg}. Trying next...`);
                    lastError = new Error(errMsg || `Model ${model} failed`);
                    continue;
                }

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error?.message || 'Error en Groq API');
                }

                const data = await response.json();
                return data.choices[0]?.message?.content || "No se pudo extraer ningún texto.";
            } catch (e: any) {
                lastError = e;
                const shouldContinue = e.message?.includes('decommissioned')
                    || e.message?.includes('not found')
                    || e.message?.includes('does not exist')
                    || e.message?.includes('invalid image data');
                if (shouldContinue) continue;
                throw e;
            }
        }
        throw lastError || new Error("No se pudo encontrar un modelo de Groq compatible.");
    });
};

const analyzeWithGroq = async (text: string, base64Data?: string, mimeType?: string): Promise<string> => {
    return callWithRetry(async () => {
        const content: any[] = [
            { type: 'text', text: `Analiza el contenido de este documento:\n\n${text}\n\nProporciona un resumen estructurado que incluya:\n1. Tipo de Documento\n2. Fechas Clave\n3. Entidades Principales (Personas/Empresas)\n4. Tareas Pendientes o Resumen` }
        ];

        if (base64Data && mimeType) {
            content.push({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } });
        }

        if (mimeType?.includes('pdf')) {
            throw new Error("Groq no admite archivos PDF para visión. Por favor, usa el proveedor Gemini.");
        }

        let lastError: any;

        for (const model of GROQ_VISION_MODELS) {
            try {
                const response = await fetch(`${WORKER_URL}/api/groq`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model,
                        messages: [{ role: 'user', content }],
                        temperature: 0.1,
                        max_tokens: 4096
                    })
                });

                if (response.status === 404 || response.status === 400) {
                    const errorData = await response.json();
                    const errMsg = errorData.error?.message || '';
                    console.warn(`Groq model ${model} failed (${response.status}): ${errMsg}. Trying next...`);
                    lastError = new Error(errMsg || `Model ${model} failed`);
                    continue;
                }

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error?.message || 'Error en Groq API');
                }

                const data = await response.json();
                return data.choices[0]?.message?.content || "El análisis falló.";
            } catch (e: any) {
                lastError = e;
                const shouldContinue = e.message?.includes('decommissioned')
                    || e.message?.includes('not found')
                    || e.message?.includes('does not exist')
                    || e.message?.includes('invalid image data');
                if (shouldContinue) continue;
                throw e;
            }
        }
        throw lastError || new Error("No se pudo encontrar un modelo de Groq compatible.");
    });
};

// --- UNIFIED INTERFACE ---

export const extractTextFromDocument = async (base64Data: string, mimeType: string, provider: AIProvider = 'gemini'): Promise<string> => {
    if (provider === 'groq') {
        return extractTextWithGroq(base64Data, mimeType);
    }
    return extractTextWithGemini(base64Data, mimeType);
};

export const analyzeDocumentContent = async (text: string, base64Data?: string, mimeType?: string, provider: AIProvider = 'gemini'): Promise<string> => {
    if (provider === 'groq') {
        return analyzeWithGroq(text, base64Data, mimeType);
    }
    return analyzeWithGemini(text, base64Data, mimeType);
};
