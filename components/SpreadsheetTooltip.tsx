import React from 'react';
import { Transaction } from '../types';

const SpreadsheetTooltip: React.FC<{
    title: string;
    total: number;
    transactions: Transaction[];
    position: { x: number; y: number };
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onEditDate?: (id: string, newDate: string) => void;
    onDeleteTransaction?: (id: string) => void;
    onEditCategory?: (id: string, newCategory: string) => void;
    availableCategories?: string[];
}> = ({ title, total, transactions, position, onMouseEnter, onMouseLeave, onEditDate, onDeleteTransaction, onEditCategory, availableCategories = ['Other'] }) => {
    const [editingDateId, setEditingDateId] = React.useState<string | null>(null);
    const [editingCategoryId, setEditingCategoryId] = React.useState<string | null>(null);
    const [editCategoryValue, setEditCategoryValue] = React.useState("");
    // Breakdown totals
    const { outflows, inflows } = transactions.reduce((acc, t) => {
        if (t.amount < 0) acc.outflows += t.amount;
        else acc.inflows += t.amount;
        return acc;
    }, { outflows: 0, inflows: 0 });

    // Show all transactions sorted by magnitude
    const sorted = [...transactions].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    const handleCategoryChange = (id: string, newValue: string) => {
        if (newValue === "Other") {
            setEditingCategoryId(id);
            setEditCategoryValue("");
            return;
        }

        if (onEditCategory) {
            onEditCategory(id, newValue);
        }
        setEditingCategoryId(null);
    };

    const handleCustomCategoryBlur = (id: string) => {
        const trimmed = editCategoryValue.trim();
        if (trimmed && onEditCategory) {
            onEditCategory(id, trimmed);
        }
        setEditingCategoryId(null);
        setEditCategoryValue("");
    };

    return (
        <div
            className="fixed z-[9999] bg-white p-5 rounded-2xl shadow-2xl border border-slate-200 min-w-[320px] animate-in fade-in zoom-in-95 duration-200 pointer-events-auto m-0"
            style={{
                left: Math.max(10, Math.min(position.x, window.innerWidth - 340)),
                top: Math.min(position.y - 8, window.innerHeight - 420),
                marginTop: 0
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <span className="text-sm font-black text-slate-900">{title}</span>
                <span className={`text-xs font-black px-2 py-1 rounded-lg ${total >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                    ${Math.abs(total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
            </div>

            {/* Net Breakdown Summary */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-rose-50/50 p-2 rounded-xl border border-rose-100/50">
                    <p className="text-[9px] font-black text-rose-600 uppercase tracking-tighter">Total Spent</p>
                    <p className="text-sm font-black text-rose-700">-${Math.abs(outflows).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/50">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Total In/Refund</p>
                    <p className="text-sm font-black text-emerald-700">+${inflows.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Detailed Breakdown</p>
                <div className="max-h-[200px] overflow-y-auto pr-2 custom-scrollbar focus:outline-none pointer-events-auto">
                    {sorted.map((t, idx) => {
                        const isOutflow = t.amount < 0;
                        return (
                            <div key={t.id || idx} className="flex justify-between items-start gap-4 mb-3 last:mb-0 border-l-2 pl-3 border-transparent hover:border-slate-100 transition-colors">
                                <div className="flex-1">
                                    <p className="text-[11px] font-bold text-slate-700 leading-tight line-clamp-1">{t.description}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {editingDateId === t.id ? (
                                            <input
                                                type="date"
                                                defaultValue={t.date}
                                                onBlur={(e) => {
                                                    onEditDate?.(t.id, e.target.value);
                                                    setEditingDateId(null);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        onEditDate?.(t.id, (e.target as HTMLInputElement).value);
                                                        setEditingDateId(null);
                                                    }
                                                }}
                                                className="text-[10px] border border-blue-300 rounded px-1 outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                autoFocus
                                            />
                                        ) : (
                                            <span
                                                onClick={() => onEditDate && setEditingDateId(t.id)}
                                                className={`text-[9px] font-medium ${onEditDate ? "text-slate-400 hover:text-blue-600 cursor-pointer hover:bg-blue-50 px-1 rounded transition-colors" : "text-slate-400"}`}
                                            >
                                                {t.date}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        {editingCategoryId === t.id ? (
                                            <input
                                                type="text"
                                                value={editCategoryValue}
                                                placeholder="Type category..."
                                                onChange={(e) => setEditCategoryValue(e.target.value)}
                                                onBlur={() => handleCustomCategoryBlur(t.id)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleCustomCategoryBlur(t.id)}
                                                className="text-[10px] border border-blue-300 rounded px-1 py-0.5 w-32 focus:ring-1 focus:ring-blue-500 outline-none"
                                                autoFocus
                                            />
                                        ) : (
                                            <select
                                                value={t.category || "Other"}
                                                onChange={(e) => handleCategoryChange(t.id, e.target.value)}
                                                className={`text-[10px] border border-transparent hover:border-slate-200 rounded px-1 py-0.5 outline-none cursor-pointer transition-colors font-medium ${onEditCategory ? 'text-blue-700 hover:bg-slate-100' : 'text-slate-400 pointer-events-none'}`}
                                            >
                                                {availableCategories.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`text-[11px] font-black whitespace-nowrap ${isOutflow ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {isOutflow ? '-' : '+'}${Math.abs(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                    {onDeleteTransaction && (
                                        <button
                                            onClick={() => {
                                                if (window.confirm("Delete this transaction?")) {
                                                    onDeleteTransaction(t.id);
                                                }
                                            }}
                                            className="text-[10px] text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100 p-1"
                                            title="Delete"
                                        >
                                            <i className="fa-solid fa-trash-can"></i>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SpreadsheetTooltip;
