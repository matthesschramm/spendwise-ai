
import React, { useMemo } from 'react';
import { SavedReport, Transaction } from '../types';

interface MonthlySpreadsheetProps {
    reports: SavedReport[];
    onBack: () => void;
    mode?: 'calendar' | 'mid-month';
}

const MonthlySpreadsheet: React.FC<MonthlySpreadsheetProps> = ({ reports, onBack, mode = 'calendar' }) => {
    const tableData = useMemo(() => {
        const monthMap: Record<string, Record<string, number>> = {};
        const monthSortMap: Record<string, number> = {};
        const categories = new Set<string>();
        const incomeCategories = new Set<string>();
        const expenseCategories = new Set<string>();
        const globalCategoryTotals: Record<string, number> = {};

        reports.forEach(report => {
            report.transactions.forEach(t => {
                // Robust date parsing: explicitly handle DD/MM/YYYY
                let date: Date;
                if (t.date.includes('/')) {
                    const parts = t.date.split('/');
                    if (parts.length === 3) {
                        const d = parseInt(parts[0]);
                        const m = parseInt(parts[1]) - 1; // 0-indexed
                        const y = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
                        date = new Date(y, m, d);
                    } else {
                        date = new Date(t.date);
                    }
                } else {
                    date = new Date(t.date);
                }

                if (isNaN(date.getTime())) return;

                let targetDate = new Date(date);
                let monthKey: string;

                if (mode === 'mid-month') {
                    // Conventional Mid-Month: 15th of Month A to 14th of Month B is labeled "Month B"
                    // e.g. 15 May to 14 June is "June"
                    if (date.getDate() >= 15) {
                        targetDate.setMonth(targetDate.getMonth() + 1);
                    }
                    monthKey = targetDate.toLocaleString('default', { month: 'long', year: 'numeric' }) + ' (Mid-Month)';
                } else {
                    monthKey = targetDate.toLocaleString('default', { month: 'long', year: 'numeric' });
                }

                const cat = t.category || 'Other';

                if (!monthMap[monthKey]) {
                    monthMap[monthKey] = {};
                    // Use start of month for consistent sorting
                    monthSortMap[monthKey] = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).getTime();
                }

                monthMap[monthKey][cat] = (monthMap[monthKey][cat] || 0) + t.amount;
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
    }, [reports]);

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

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50 z-10 w-64">Category</th>
                                {tableData.months.map(month => (
                                    <th key={month} className="p-4 text-xs font-black text-slate-600 uppercase tracking-widest text-right whitespace-nowrap min-w-[140px]">
                                        {month}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {/* Income Section */}
                            <tr className="bg-emerald-50/30">
                                <td colSpan={tableData.months.length + 1} className="px-4 py-2 text-[10px] font-black text-emerald-600 uppercase tracking-tighter">
                                    Income Streams
                                </td>
                            </tr>
                            {tableData.incomeCategories.map(cat => (
                                <tr key={cat} className="group hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-sm font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50">{cat}</td>
                                    {tableData.months.map(month => {
                                        const val = tableData.data[month][cat] || 0;
                                        return (
                                            <td key={month} className={`p-4 text-sm font-black text-right ${val > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                                {val !== 0 ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            <tr className="bg-emerald-50/50 font-black">
                                <td className="p-4 text-sm text-emerald-700 sticky left-0 bg-emerald-50/50">Total Income</td>
                                {tableData.months.map(month => {
                                    const totalIn = tableData.incomeCategories.reduce((acc, cat) => acc + (tableData.data[month][cat] || 0), 0);
                                    return (
                                        <td key={month} className="p-4 text-sm text-emerald-700 text-right">
                                            ${totalIn.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    );
                                })}
                            </tr>

                            {/* Expenses Section */}
                            <tr className="bg-red-50/30">
                                <td colSpan={tableData.months.length + 1} className="px-4 py-2 text-[10px] font-black text-red-600 uppercase tracking-tighter">
                                    Expense Categories
                                </td>
                            </tr>
                            {tableData.expenseCategories.map(cat => (
                                <tr key={cat} className="group hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-sm font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50">{cat}</td>
                                    {tableData.months.map(month => {
                                        const val = tableData.data[month][cat] || 0;
                                        const absVal = Math.abs(val);
                                        return (
                                            <td key={month} className={`p-4 text-sm font-black text-right ${val < 0 ? 'text-red-500' : 'text-slate-300'}`}>
                                                {val !== 0 ? `$${absVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            <tr className="bg-red-50/50 font-black">
                                <td className="p-4 text-sm text-red-700 sticky left-0 bg-red-50/50">Total Expenses</td>
                                {tableData.months.map(month => {
                                    const totalOut = tableData.expenseCategories.reduce((acc, cat) => acc + (tableData.data[month][cat] || 0), 0);
                                    return (
                                        <td key={month} className="p-4 text-sm text-red-700 text-right">
                                            ${Math.abs(totalOut).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    );
                                })}
                            </tr>

                            {/* Net Flow Section */}
                            <tr className="bg-slate-900 text-white font-black">
                                <td className="p-4 text-sm sticky left-0 bg-slate-900 border-r border-slate-800">Net Position</td>
                                {tableData.months.map(month => {
                                    const totalIn = tableData.incomeCategories.reduce((acc, cat) => acc + (tableData.data[month][cat] || 0), 0);
                                    const totalOut = tableData.expenseCategories.reduce((acc, cat) => acc + (tableData.data[month][cat] || 0), 0);
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
                        Outflows (negative amounts) are shown as positive numbers in the expense section for readability,
                        while the Net Position reflects your actual bottom line.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MonthlySpreadsheet;
