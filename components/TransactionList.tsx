import React, { useState } from 'react';
import { Transaction } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  onEditCategory?: (id: string, newCategory: string) => void;
  onEditDiscretionary?: (id: string, isDiscretionary: boolean) => void;
}

const COMMON_CATEGORIES = [
  // ... (rest of the file)
  "Food - Supermarkets",
  "Food - Dining",
  "Shopping",
  "Housing",
  "Transportation",
  "Utilities",
  "Entertainment",
  "Healthcare",
  "Income",
  "Travel",
  "Insurance",
  "Subscriptions",
  "Other"
];

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onEditCategory, onEditDiscretionary }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleCategoryChange = (id: string, newValue: string) => {
    if (newValue === "Other") {
      setEditingId(id);
      setEditValue("");
      return;
    }

    if (onEditCategory) {
      onEditCategory(id, newValue);
    }
    setEditingId(null);
  };

  const handleCustomCategoryBlur = (id: string) => {
    if (editValue.trim() && onEditCategory) {
      onEditCategory(id, editValue.trim());
    }
    setEditingId(null);
    setEditValue("");
  };

  return (
    <div className="bg-white mt-8 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-bold text-slate-800">Analyzed Transactions</h3>
        <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium">
          {transactions.length} items
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">AI Insight</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-600">{t.date}</td>
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-slate-800 line-clamp-1" title={t.description}>{t.description}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {editingId === t.id ? (
                      <input
                        type="text"
                        value={editValue}
                        placeholder="Type category..."
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCustomCategoryBlur(t.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCustomCategoryBlur(t.id)}
                        className="text-xs border border-blue-300 rounded px-2 py-1 w-32 focus:ring-2 focus:ring-blue-500 outline-none"
                        autoFocus
                      />
                    ) : (
                      <select
                        value={t.category || "Other"}
                        onChange={(e) => handleCategoryChange(t.id, e.target.value)}
                        className={`text-xs border border-transparent hover:border-slate-200 rounded px-1 py-0.5 outline-none cursor-pointer transition-colors font-medium ${onEditCategory ? 'text-blue-700 hover:bg-slate-100' : 'text-slate-600 pointer-events-none'
                          }`}
                      >
                        {COMMON_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        {!COMMON_CATEGORIES.includes(t.category || "") && t.category && (
                          <option value={t.category}>{t.category}</option>
                        )}
                      </select>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <select
                    value={t.discretionary === false ? "non-discretionary" : "discretionary"}
                    onChange={(e) => onEditDiscretionary && onEditDiscretionary(t.id, e.target.value === "discretionary")}
                    className={`text-[10px] uppercase tracking-wider font-black border border-transparent rounded px-2 py-1 outline-none cursor-pointer transition-all ${t.discretionary === false
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      } ${!onEditDiscretionary ? 'pointer-events-none' : ''}`}
                  >
                    <option value="discretionary">Discretionary</option>
                    <option value="non-discretionary">Non-Discretionary</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-slate-800 text-right">
                  ${t.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  {t.groundingSources ? (
                    <div className="flex flex-wrap gap-2">
                      {t.groundingSources.slice(0, 2).map((s, idx) => (
                        <a
                          key={idx}
                          href={s.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-100"
                          title={s.title}
                        >
                          <i className="fa-brands fa-google"></i>
                          Search Result
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Direct Identification</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionList;
