
import { Transaction } from "../types";

export const parseCSV = (text: string): Transaction[] => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line !== "");
  if (lines.length < 2) return [];

  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

  // Find column indices
  const dateIdx = headers.findIndex(h => h.includes('date'));
  const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('merchant') || h.includes('transaction'));
  const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('value'));

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    throw new Error("CSV must contain columns for Date, Description/Merchant, and Amount.");
  }

  const transactions: Transaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];

    // Check for the exclusion phrase as early as possible on the raw line
    // This handles both quoted and unquoted commas robustly
    if (rawLine.toUpperCase().includes("PAYMENT RECEIVED, THANK YOU")) continue;

    const cols = rawLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < amountIdx + 1) continue;

    const amount = parseFloat(cols[amountIdx].replace(/[$,]/g, ''));
    if (isNaN(amount)) continue;

    // If description is the last mapped column, take the rest of the columns too
    // in case of unquoted commas in an trailing description field
    let description = cols[descIdx];
    if (descIdx === Math.max(dateIdx, descIdx, amountIdx) && cols.length > descIdx + 1) {
      description = cols.slice(descIdx).join(', ');
    }

    transactions.push({
      id: `tx-${i}-${Date.now()}`,
      date: cols[dateIdx],
      description: description,
      amount: amount,
    });
  }

  return transactions;
};
