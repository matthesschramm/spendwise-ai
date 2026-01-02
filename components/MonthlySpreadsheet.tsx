import React, { useMemo } from 'react';
import { SavedReport, Transaction } from '../types';
import { storageService } from '../services/storageService';
import { parseStructuredDate, getTransactionPeriod } from '../utils/dateUtils';

const SpreadsheetTooltip: React.FC<{
    title: string;
    total: number;
    transactions: Transaction[];
    position: { x: number; y: number };
}> = ({ title, total, transactions, position }) => {
    // Breakdown totals
    const { outflows, inflows } = transactions.reduce((acc, t) => {
        if (t.amount < 0) acc.outflows += t.amount;
        else acc.inflows += t.amount;
        return acc;
    }, { outflows: 0, inflows: 0 });

    // Show top transactions by magnitude
    const sorted = [...transactions].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 10);

    return (
        <div
            className="fixed z-[9999] bg-white p-5 rounded-2xl shadow-2xl border border-slate-200 min-w-[320px] animate-in fade-in zoom-in duration-150 pointer-events-none"
            style={{
                left: Math.min(position.x + 20, window.innerWidth - 340),
                top: Math.min(position.y + 20, window.innerHeight - 400)
            }}
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
                <div className="max-h-[220px] overflow-y-auto pr-2 custom-scrollbar focus:outline-none">
                    {sorted.map((t, idx) => {
                        const isOutflow = t.amount < 0;
                        return (
                            <div key={t.id || idx} className="flex justify-between items-start gap-4 mb-3 last:mb-0 border-l-2 pl-3 border-transparent hover:border-slate-100 transition-colors">
                                <div className="flex-1">
                                    <p className="text-[11px] font-bold text-slate-700 leading-tight line-clamp-1">{t.description}</p>
                                    <p className="text-[9px] text-slate-400 font-medium">{t.date}</p>
                                </div>
                                <span className={`text-[11px] font-black whitespace-nowrap ${isOutflow ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {isOutflow ? '-' : '+'}${Math.abs(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        );
                    })}
                    {transactions.length > 10 && (
                        <p className="text-[10px] text-blue-600 font-black mt-3 text-center bg-blue-50 py-1.5 rounded-lg border border-blue-100">
                            + {transactions.length - 10} additional items
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

interface MonthlySpreadsheetProps {
    reports: SavedReport[];
    onBack: () => void;
    mode?: 'calendar' | 'mid-month';
    userId?: string;
}

const MonthlySpreadsheet: React.FC<MonthlySpreadsheetProps> = ({ reports, onBack, mode = 'calendar', userId }) => {
    const [activeTooltip, setActiveTooltip] = React.useState<{
        title: string;
        total: number;
        transactions: Transaction[];
        position: { x: number; y: number };
    } | null>(null);
    const [categoryBudgets, setCategoryBudgets] = React.useState<Record<string, number>>({});
    const [editingCategory, setEditingCategory] = React.useState<string | null>(null);
    const [editValue, setEditValue] = React.useState("");

    React.useEffect(() => {
        if (userId) {
            storageService.getCategoryBudgets(userId, 'Global')
                .then(setCategoryBudgets);
        }
    }, [userId]);

    const handleBudgetChange = async (category: string, value: string) => {
        const amount = parseFloat(value) || 0;
        if (userId) {
            await storageService.saveBudget(userId, 'Global', amount, category);
            setCategoryBudgets(prev => ({ ...prev, [category]: amount }));
        }
        setEditingCategory(null);
    };

    const tableData = useMemo(() => {
        const monthMap: Record<string, Record<string, { total: number; transactions: Transaction[] }>> = {};
        const monthSortMap: Record<string, number> = {};
        const categories = new Set<string>();
        const incomeCategories = new Set<string>();
        const expenseCategories = new Set<string>();
        const globalCategoryTotals: Record<string, number> = {};

        reports.forEach(report => {
            report.transactions.forEach(t => {
                const date = parseStructuredDate(t.date);
                if (isNaN(date.getTime())) return;

                const monthKey = getTransactionPeriod(date, mode as 'calendar' | 'mid-month') + (mode === 'mid-month' ? ' (Mid-Month)' : '');

                const cat = t.category || 'Other';

                if (!monthMap[monthKey]) {
                    monthMap[monthKey] = {};
                    // Use a representative date for consistent sorting
                    const representativeDate = new Date(date);
                    if (mode === 'mid-month' && date.getDate() >= 15) {
                        representativeDate.setDate(1);
                        representativeDate.setMonth(representativeDate.getMonth() + 1);
                    }
                    monthSortMap[monthKey] = new Date(representativeDate.getFullYear(), representativeDate.getMonth(), 1).getTime();
                }

                if (!monthMap[monthKey][cat]) {
                    monthMap[monthKey][cat] = { total: 0, transactions: [] };
                }

                monthMap[monthKey][cat].total += t.amount;
                monthMap[monthKey][cat].transactions.push(t);
                globalCategoryTotals[cat] = (globalCategoryTotals[cat] || 0) + t.amount;
                categories.add(cat);
            });
        });

        // Classify categories based on their global net balance
        Object.entries(globalCategoryTotals).forEach(([cat, net]) => {
            if (net > 0) {
                incomeCategories.add(cat);
            } else if (net < 0) {
                expenseCategories.add(cat);
            } else {
                // Defensive fallback
                if (cat.toLowerCase().includes('income') || cat.toLowerCase().includes('salary')) {
                    incomeCategories.add(cat);
                } else {
                    expenseCategories.add(cat);
                }
            }
        });

        // Sort months chronologically
        const sortedMonths = Object.keys(monthMap).sort((a, b) => {
            return monthSortMap[a] - monthSortMap[b];
        });

        return {
            months: sortedMonths,
            incomeCategories: Array.from(incomeCategories).sort(),
            expenseCategories: Array.from(expenseCategories).sort(),
            data: monthMap
        };
    }, [reports, mode, categoryBudgets]);

    const getVarianceStyle = (actual: number, budget: number, isIncome: boolean) => {
        if (!budget || budget === 0) return '';

        const absActual = Math.abs(actual);
        const variance = isIncome ? (actual - budget) : (budget - absActual);

        if (variance > 0) {
            return 'text-emerald-600';
        } else {
            const isSignificant = Math.abs(variance) > (0.1 * budget);
            if (isSignificant) {
                return 'bg-rose-100 text-rose-900';
            } else {
                return 'text-rose-600';
            }
        }
    };

    if (reports.length === 0) {
        return (
            <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-sm text-center">
                <i className="fa-solid fa-table-list text-slate-200 text-5xl mb-4"></i>
                <h3 className="text-xl font-bold text-slate-800">No Data to Compare</h3>
                <p className="text-slate-500 mt-2">Upload and save some reports first to see your monthly comparison.</p>
                <button onClick={onBack} className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors">
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-900">
                        Monthly Performance Table
                    </h2>
                    <p className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full w-fit mt-2">
                        {mode === 'mid-month' ? 'Mid-Month View (15th - 14th)' : 'Standard Calendar View'}
                    </p>
                </div>
                <button
                    onClick={onBack}
                    className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-slate-100 transition-all"
                >
                    <i className="fa-solid fa-arrow-left"></i>
                    Back to Dashboard
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden border-separate">
                <div className="overflow-auto max-h-[80vh] custom-scrollbar focus:outline-none">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead className="sticky top-0 z-30">
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest sticky left-0 top-0 bg-slate-50 z-40 min-w-[256px] max-w-[256px] shadow-[1px_0_0_0_#f1f5f9]">Category</th>
                                <th className="p-4 text-xs font-black text-blue-600 uppercase tracking-widest sticky left-[256px] top-0 bg-blue-50 z-30 min-w-[128px] max-w-[128px] border-r border-blue-100 shadow-[1px_0_0_0_#f1f5f9]">Target Budget</th>
                                {tableData.months.map(month => (
                                    <th key={month} className="p-4 text-xs font-black text-slate-600 uppercase tracking-widest text-right whitespace-nowrap min-w-[140px] sticky top-0 bg-slate-50 z-20">
                                        {month}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {/* Income Section */}
                            <tr className="bg-emerald-50/30">
                                <td colSpan={tableData.months.length + 2} className="px-4 py-2 text-[10px] font-black text-emerald-600 uppercase tracking-tighter">
                                    Income Streams
                                </td>
                            </tr>
                            {tableData.incomeCategories.map(cat => (
                                <tr key={cat} className="group hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-sm font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 z-10 min-w-[256px] max-w-[256px] shadow-[1px_0_0_0_#f1f5f9] truncate">{cat}</td>
                                    <td className="p-4 text-sm font-black text-emerald-600 sticky left-[256px] bg-emerald-50 z-10 border-r border-emerald-100 min-w-[128px] max-w-[128px] text-center shadow-[1px_0_0_0_#f1f5f9]">
                                        {editingCategory === cat ? (
                                            <input
                                                autoFocus
                                                type="number"
                                                className="w-full px-1 py-0.5 text-xs border rounded bg-white"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={() => handleBudgetChange(cat, editValue)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleBudgetChange(cat, editValue)}
                                            />
                                        ) : (
                                            <div
                                                className="cursor-pointer hover:bg-emerald-100/50 rounded px-1 transition-all"
                                                onClick={() => { setEditingCategory(cat); setEditValue((categoryBudgets[cat] || 0).toString()); }}
                                            >
                                                ${(categoryBudgets[cat] || 0).toLocaleString()}
                                            </div>
                                        )}
                                    </td>
                                    {tableData.months.map(month => {
                                        const cell = tableData.data[month][cat];
                                        const val = cell?.total || 0;
                                        const budget = categoryBudgets[cat] || 0;
                                        const varianceStyle = getVarianceStyle(val, budget, true);

                                        return (
                                            <td
                                                key={month}
                                                className={`p-4 text-sm font-black text-right transition-colors ${val > 0 ? (varianceStyle || 'text-emerald-600 bg-emerald-50/20') : 'text-slate-300'} hover:bg-emerald-100/50 cursor-help relative`}
                                                onMouseEnter={(e) => val > 0 && setActiveTooltip({
                                                    title: `${cat} - ${month}`,
                                                    total: val,
                                                    transactions: cell.transactions,
                                                    position: { x: e.clientX, y: e.clientY }
                                                })}
                                                onMouseLeave={() => setActiveTooltip(null)}
                                            >
                                                {val !== 0 ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            <tr className="bg-emerald-50 font-black">
                                <td className="p-4 text-sm text-emerald-700 sticky left-0 bg-emerald-50 z-10 min-w-[256px] max-w-[256px] shadow-[1px_0_0_0_#f1f5f9]">Total Income</td>
                                <td className="p-4 text-sm text-emerald-700 sticky left-[256px] bg-emerald-50 z-10 border-r border-emerald-100 min-w-[128px] max-w-[128px] text-center shadow-[1px_0_0_0_#f1f5f9]">
                                    ${tableData.incomeCategories.reduce((acc, cat) => acc + (categoryBudgets[cat] || 0), 0).toLocaleString()}
                                </td>
                                {tableData.months.map(month => {
                                    const totalIn = tableData.incomeCategories.reduce((acc, cat) => acc + (tableData.data[month][cat]?.total || 0), 0);
                                    return (
                                        <td key={month} className="p-4 text-sm text-emerald-700 text-right">
                                            ${totalIn.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    );
                                })}
                            </tr>

                            {/* Expenses Section */}
                            <tr className="bg-red-50/30">
                                <td colSpan={tableData.months.length + 2} className="px-4 py-2 text-[10px] font-black text-red-600 uppercase tracking-tighter">
                                    Expense Categories
                                </td>
                            </tr>
                            {tableData.expenseCategories.map(cat => (
                                <tr key={cat} className="group hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-sm font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 z-10 min-w-[256px] max-w-[256px] shadow-[1px_0_0_0_#f1f5f9] truncate">{cat}</td>
                                    <td className="p-4 text-sm font-black text-rose-600 sticky left-[256px] bg-rose-50 z-10 border-r border-rose-100 min-w-[128px] max-w-[128px] text-center shadow-[1px_0_0_0_#f1f5f9]">
                                        {editingCategory === cat ? (
                                            <input
                                                autoFocus
                                                type="number"
                                                className="w-full px-1 py-0.5 text-xs border rounded bg-white"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={() => handleBudgetChange(cat, editValue)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleBudgetChange(cat, editValue)}
                                            />
                                        ) : (
                                            <div
                                                className="cursor-pointer hover:bg-rose-100/50 rounded px-1 transition-all"
                                                onClick={() => { setEditingCategory(cat); setEditValue((categoryBudgets[cat] || 0).toString()); }}
                                            >
                                                ${(categoryBudgets[cat] || 0).toLocaleString()}
                                            </div>
                                        )}
                                    </td>
                                    {tableData.months.map(month => {
                                        const cell = tableData.data[month][cat];
                                        const val = cell?.total || 0;
                                        const absVal = Math.abs(val);
                                        const budget = categoryBudgets[cat] || 0;
                                        const varianceStyle = getVarianceStyle(val, budget, false);

                                        return (
                                            <td
                                                key={month}
                                                className={`p-4 text-sm font-black text-right transition-colors ${val < 0 ? (varianceStyle || 'text-red-500 bg-red-50/20') : 'text-slate-300'} hover:bg-red-100/50 cursor-help relative`}
                                                onMouseEnter={(e) => val < 0 && setActiveTooltip({
                                                    title: `${cat} - ${month}`,
                                                    total: val,
                                                    transactions: cell.transactions,
                                                    position: { x: e.clientX, y: e.clientY }
                                                })}
                                                onMouseLeave={() => setActiveTooltip(null)}
                                            >
                                                {val !== 0 ? `$${absVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            <tr className="bg-red-50 font-black">
                                <td className="p-4 text-sm text-red-700 sticky left-0 bg-red-50 z-10 min-w-[256px] max-w-[256px] shadow-[1px_0_0_0_#f1f5f9]">Total Expenses</td>
                                <td className="p-4 text-sm text-red-700 sticky left-[256px] bg-red-50 z-10 border-r border-rose-100 min-w-[128px] max-w-[128px] text-center shadow-[1px_0_0_0_#f1f5f9]">
                                    ${tableData.expenseCategories.reduce((acc, cat) => acc + (categoryBudgets[cat] || 0), 0).toLocaleString()}
                                </td>
                                {tableData.months.map(month => {
                                    const totalOut = tableData.expenseCategories.reduce((acc, cat) => acc + (tableData.data[month][cat]?.total || 0), 0);
                                    return (
                                        <td key={month} className="p-4 text-sm text-red-700 text-right">
                                            ${Math.abs(totalOut).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    );
                                })}
                            </tr>

                            {/* Net Flow Section */}
                            <tr className="bg-slate-900 text-white font-black">
                                <td className="p-4 text-sm sticky left-0 bg-slate-900 z-10 min-w-[256px] max-w-[256px] border-r border-slate-800">Net Position</td>
                                <td className="p-4 text-sm sticky left-[256px] bg-slate-800 z-10 text-center border-r border-slate-700 min-w-[128px] max-w-[128px] shadow-[1px_0_0_0_#1e293b]">
                                    ${(tableData.incomeCategories.reduce((acc, cat) => acc + (categoryBudgets[cat] || 0), 0) - tableData.expenseCategories.reduce((acc, cat) => acc + (categoryBudgets[cat] || 0), 0)).toLocaleString()}
                                </td>
                                {tableData.months.map(month => {
                                    const totalIn = tableData.incomeCategories.reduce((acc, cat) => acc + (tableData.data[month][cat]?.total || 0), 0);
                                    const totalOut = tableData.expenseCategories.reduce((acc, cat) => acc + (tableData.data[month][cat]?.total || 0), 0);
                                    const net = totalIn + totalOut;
                                    return (
                                        <td key={month} className={`p-4 text-sm text-right ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            ${net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    );
                                })}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
                <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-100">
                    <i className="fa-solid fa-lightbulb text-xl"></i>
                </div>
                <div>
                    <h4 className="font-black text-blue-900">Spreadsheet Insights</h4>
                    <p className="text-blue-700 text-sm mt-1 leading-relaxed">
                        This view aggregates all transactions from your saved reports.
                        Rows are dynamically generated based on the categories found in your statement history.
                        <span className="font-bold underline ml-1">Hover over any value</span> to see the top transactions contributing to that amount.
                    </p>
                </div>
            </div>

            {activeTooltip && <SpreadsheetTooltip {...activeTooltip} />}
        </div>
    );
};

export default MonthlySpreadsheet;
