
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Transaction, GroundingSource } from "../types";
import { storageService } from "./storageService";

export const classifyTransactions = async (
  transactions: Transaction[],
  userId: string,
  onProgress?: (progress: number, classifiedBatch: Transaction[]) => void
): Promise<Transaction[]> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // 1. Fetch User Rules for the Learning Loop
  const userRules = userId ? await storageService.getUserRules(userId) : [];
  const rulesContext = userRules.length > 0
    ? `\nIMPORTANT: The user has previously specified these category preferences. Use them as the absolute gold standard for these merchants: ${JSON.stringify(userRules.map(r => ({ merchant: r.merchant_pattern, preferred_category: r.preferred_category })))}`
    : "";

  // 2. Fetch Category Settings (Discretionary vs Non-Discretionary)
  const categorySettings = userId ? await storageService.getCategorySettings(userId) : {};
  const categoryContext = Object.keys(categorySettings).length > 0
    ? `\nIMPORTANT: Use these user preferences for classification type (Discretionary vs Non-Discretionary): ${JSON.stringify(categorySettings)}. If a category is in this list, its 'is_discretionary' value MUST match the value here.`
    : "";

  const BATCH_SIZE = 50;
  const totalTransactions = transactions.length;
  const processedTransactions: Transaction[] = [];

  for (let i = 0; i < totalTransactions; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE);
    const batchData = batch.map(t => ({
      id: t.id,
      description: t.description,
      amount: t.amount
    }));

    const prompt = `Classify these transactions: ${JSON.stringify(batchData)}`;

    try {
      const responseContent: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: `
            You are an expert financial analyst. Your task is to classify credit card transactions into categories and determine if they are Discretionary or Non-Discretionary.
            
            Available categories: Food - Supermarkets, Food - Dining, Shopping, Housing, Transportation, Utilities, Entertainment, Healthcare, Income, Travel, Insurance, Subscriptions, Other.
            
            If a merchant description is ambiguous or unknown, use your internal knowledge and the Google Search tool to identify the merchant and its business type.
            ${rulesContext}
            ${categoryContext}
            
            Discretionary vs Non-Discretionary:
            - Non-Discretionary: Essential bills, rent, utilities, insurance, healthcare, basic groceries (Supermarkets), income.
            - Discretionary: Dining out, luxury shopping, entertainment, travel, non-essential subscriptions.
            
            Return the result as a JSON array of objects, each with 'id', 'category', and 'is_discretionary' (boolean).
            Only return valid JSON.
          `,
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                category: { type: Type.STRING },
                is_discretionary: { type: Type.BOOLEAN }
              },
              required: ["id", "category", "is_discretionary"]
            }
          }
        }
      });

      const classifications = JSON.parse(responseContent.text || "[]");

      // Extract grounding sources if search was used
      const groundingChunks = responseContent.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources: GroundingSource[] = groundingChunks?.map((chunk: any) => ({
        title: chunk.web?.title || "Search Result",
        uri: chunk.web?.uri || "#"
      })) || [];

      const classifiedBatch = batch.map(t => {
        const classification = classifications.find((r: any) => r.id === t.id);
        return {
          ...t,
          category: classification?.category || "Other",
          discretionary: classification?.is_discretionary ?? true,
          groundingSources: sources.length > 0 ? sources : undefined
        };
      });

      processedTransactions.push(...classifiedBatch);

      if (onProgress) {
        const progress = Math.round(((i + batch.length) / totalTransactions) * 100);
        onProgress(progress, classifiedBatch);
      }
    } catch (error) {
      console.error(`Gemini Classification Error in batch starting at ${i}:`, error);
      // Fallback for this batch: Mark all as 'Other' to keep going
      const fallbackBatch = batch.map(t => ({ ...t, category: 'Other' }));
      processedTransactions.push(...fallbackBatch);
      if (onProgress) {
        const progress = Math.round(((i + batch.length) / totalTransactions) * 100);
        onProgress(progress, fallbackBatch);
      }
    }
  }

  return processedTransactions;
};
