
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Transaction, GroundingSource } from "../types";
import { storageService } from "./storageService";
import { normalizeDescription } from "../utils/descriptionUtils";

export const classifyTransactions = async (
  transactions: Transaction[],
  userId: string,
  onProgress?: (progress: number, classifiedBatch: Transaction[]) => void
): Promise<Transaction[]> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // 1. Fetch User Rules and Settings
  const userRules = userId ? await storageService.getUserRules(userId) : [];
  const categorySettings = userId ? await storageService.getCategorySettings(userId) : {};

  const totalTransactions = transactions.length;
  const finalResults: Transaction[] = [];
  const transactionsToClassify: Transaction[] = [];
  const descriptionToTransactions = new Map<string, Transaction[]>();

  // 2. Pre-process: Apply local rules and group remaining by normalized description
  transactions.forEach(t => {
    // Check for a manual rule using normalized descriptions (strips unique transaction IDs)
    const normalizedDesc = normalizeDescription(t.description);
    const rule = userRules.find(r => normalizeDescription(r.merchant_pattern) === normalizedDesc);

    if (rule) {
      const cat = rule.preferred_category;
      finalResults.push({
        ...t,
        category: cat,
        discretionary: categorySettings[cat] !== undefined ? categorySettings[cat] : t.discretionary,
        groundingSources: undefined // Rules are deterministic
      });
    } else {
      transactionsToClassify.push(t);
      const list = descriptionToTransactions.get(normalizedDesc) || [];
      list.push(t);
      descriptionToTransactions.set(normalizedDesc, list);
    }
  });

  // If everything was handled by local rules, we're done!
  if (transactionsToClassify.length === 0) {
    onProgress?.(100, finalResults);
    return finalResults;
  }

  // Report initial progress for rule-matched items
  if (finalResults.length > 0) {
    onProgress?.(Math.round((finalResults.length / totalTransactions) * 100), finalResults);
  }

  // 3. Prep Unique Unknowns for Gemini
  const uniqueDescriptions = Array.from(descriptionToTransactions.keys());
  const uniqueDataForAI = uniqueDescriptions.map((desc, idx) => ({
    id: `u-${idx}`, // Use a unique temporary ID for the batch
    description: desc
    // We omit amount here to ensure the AI focuses on identifying the merchant itself, 
    // which leads to better consistency for the same merchant name.
  }));

  const BATCH_SIZE = 50;
  let processedCount = finalResults.length;

  for (let i = 0; i < uniqueDataForAI.length; i += BATCH_SIZE) {
    const batch = uniqueDataForAI.slice(i, i + BATCH_SIZE);
    const prompt = `Classify these unique merchants: ${JSON.stringify(batch)}`;

    try {
      const responseContent: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: `
            You are an expert financial analyst. Your task is to identify merchants and classify them.
            
            Available categories: Food - Supermarkets, Food - Dining, Shopping, Housing, Transportation, Utilities, Entertainment, Healthcare, Income, Travel, Insurance, Subscriptions, Other.
            
            Discretionary vs Non-Discretionary:
            - Non-Discretionary (Essential): Essential bills, rent, utilities (power/water), insurance, healthcare/doctors, basic groceries (Supermarkets), income.
            - Discretionary (Lifestyle): Dining out/cafes, luxury shopping, movies/games, travel/holidays, non-essential subscriptions (Netflix/Gym).
            
            Return a JSON array of objects: { "id": string, "category": string, "is_discretionary": boolean }.
            Maintain 100% consistency. If a merchant is identified as a Gym, it should be Subscriptions/Discretionary unless user settings say otherwise.
            Only return valid JSON. Use Google Search to identify unknown merchants.
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
      const groundingChunks = responseContent.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources: GroundingSource[] = groundingChunks?.map((chunk: any) => ({
        title: chunk.web?.title || "Search Result",
        uri: chunk.web?.uri || "#"
      })) || [];

      const classifiedInThisBatch: Transaction[] = [];

      classifications.forEach((res: any) => {
        const uIdx = parseInt(res.id.replace('u-', ''));
        const desc = uniqueDescriptions[uIdx];
        const matchingTransactions = descriptionToTransactions.get(desc) || [];

        // Apply choice to ALL transactions with this description for 100% consistency
        matchingTransactions.forEach(t => {
          const cat = res.category;
          // Apply global settings override if they exist
          const finalDiscretionary = categorySettings[cat] !== undefined ? categorySettings[cat] : res.is_discretionary;

          classifiedInThisBatch.push({
            ...t,
            category: cat,
            discretionary: finalDiscretionary,
            groundingSources: sources.length > 0 ? sources : undefined
          });
        });
      });

      finalResults.push(...classifiedInThisBatch);
      processedCount += classifiedInThisBatch.length;

      onProgress?.(Math.round((processedCount / totalTransactions) * 100), classifiedInThisBatch);

    } catch (error) {
      console.error(`Gemini Classification Error in batch starting at ${i}:`, error);
      // Fallback: mark all in this batch as Other
      const fallbackBatch: Transaction[] = [];
      batch.forEach(item => {
        const originals = descriptionToTransactions.get(item.description) || [];
        originals.forEach(t => {
          fallbackBatch.push({ ...t, category: 'Other', discretionary: true });
        });
      });
      finalResults.push(...fallbackBatch);
      processedCount += fallbackBatch.length;
      onProgress?.(Math.round((processedCount / totalTransactions) * 100), fallbackBatch);
    }
  }

  return finalResults;
};
