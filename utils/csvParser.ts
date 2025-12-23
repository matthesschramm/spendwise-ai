
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
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < headers.length) continue;

    const amount = parseFloat(cols[amountIdx].replace(/[$,]/g, ''));
    if (isNaN(amount)) continue;

    transactions.push({
      id: `tx-${i}-${Date.now()}`,
      date: cols[dateIdx],
      description: cols[descIdx],
      amount: amount, // Keep sign to distinguish between inflows and outflows
    });
  }

  return transactions;
};
