import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Extracts text from a document image or PDF using Gemini Vision.
 * Uses gemini-2.5-flash for speed and low latency (best for OCR).
 */
export const extractTextFromDocument = async (
  base64Data: string, 
  mimeType: string
): Promise<string> => {
  try {
    // Using Flash for fast OCR
    const modelId = 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: "Transcribe the text from this document exactly as it appears. Maintain the structure (lists, headers) using Markdown. Do not include any intro or outro text."
          }
        ]
      }
    });

    return response.text || "No text could be extracted.";
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    throw new Error("Failed to extract text from the document.");
  }
};

/**
 * Analyzes the extracted text or the original document for deeper insights.
 * Uses gemini-3-pro-preview with thinking budget for complex reasoning.
 */
export const analyzeDocumentContent = async (
  text: string,
  base64Data?: string,
  mimeType?: string
): Promise<string> => {
  try {
    // Using Pro with Thinking for deep analysis
    const modelId = 'gemini-3-pro-preview';
    
    const parts: any[] = [{ text: `Analyze this document content:\n\n${text}\n\nProvide a structured summary including:\n1. Document Type\n2. Key Dates\n3. Main Entities (People/Companies)\n4. Action Items or Summary` }];

    // If we have the original image, include it for better context
    if (base64Data && mimeType) {
      parts.unshift({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts },
      config: {
        thinkingConfig: {
          thinkingBudget: 32768 // Maximum thinking budget
        }
      }
    });

    return response.text || "Analysis failed.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze the document.");
  }
};