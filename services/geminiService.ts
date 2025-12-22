
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Transaction, GroundingSource } from "../types";

export const classifyTransactions = async (transactions: Transaction[]): Promise<Transaction[]> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // Prepare the prompt
  // We send descriptions in batches to be efficient
  const transactionData = transactions.map(t => ({
    id: t.id,
    description: t.description,
    amount: t.amount
  }));

  const systemInstruction = `
    You are an expert financial analyst. Your task is to classify credit card transactions into categories.
    Available categories: Food & Dining, Shopping, Housing, Transportation, Utilities, Entertainment, Healthcare, Income, Travel, Insurance, Other.
    
    If a merchant description is ambiguous or unknown, use your internal knowledge and the Google Search tool to identify the merchant and its business type.
    
    Return the result as a JSON array of objects, each with 'id' and 'category'.
    Only return valid JSON.
  `;

  const prompt = `Classify these transactions: ${JSON.stringify(transactionData)}`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              category: { type: Type.STRING },
            },
            required: ["id", "category"]
          }
        }
      }
    });

    const results = JSON.parse(response.text || "[]");

    // Extract grounding sources if search was used
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources: GroundingSource[] = groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || "Search Result",
      uri: chunk.web?.uri || "#"
    })) || [];

    // Map categories back to original transactions
    return transactions.map(t => {
      const classification = results.find((r: any) => r.id === t.id);
      return {
        ...t,
        category: classification?.category || "Other",
        groundingSources: sources.length > 0 ? sources : undefined
      };
    });
  } catch (error) {
    console.error("Gemini Classification Error:", error);
    throw error;
  }
};
