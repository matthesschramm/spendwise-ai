import React, { useMemo } from 'react';
import { SavedReport, Transaction } from '../types';
import { storageService } from '../services/storageService';
import { parseStructuredDate } from '../utils/dateUtils';
import SpreadsheetTooltip from './SpreadsheetTooltip';

interface BudgetProgressViewProps {
    reports: SavedReport[];
    onBack: () => void;
    userId?: string;
    onEditDate?: (id: string, newDate: string) => void;
    onDeleteTransaction?: (id: string) => void;
    onEditCategory?: (id: string, newCategory: string) => void;
    availableCategories?: string[];
}

const BudgetProgressView: React.FC<BudgetProgressViewProps> = ({ reports, onBack, userId, onEditDate, onDeleteTransaction, onEditCategory, availableCategories }) => {
    const [selectedReportId, setSelectedReportId] = React.useState<string>('');
    const [categoryBudgets, setCategoryBudgets] = React.useState<Record<string, number>>({});
    const [editingCategory, setEditingCategory] = React.useState<string | null>(null);
    const [editValue, setEditValue] = React.useState("");
    const [expenseOrder, setExpenseOrder] = React.useState<string[]>([]);
    const [incomeOrder, setIncomeOrder] = React.useState<string[]>([]);
    const [activeTooltip, setActiveTooltip] = React.useState<{
        title: string;
        total: number;
        transactions: Transaction[];
        position: { x: number; y: number };
    } | null>(null);
    const [tooltipMode, setTooltipMode] = React.useState<'hover' | 'click'>('hover');
    const closeTimeout = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        return () => {
            if (closeTimeout.current) clearTimeout(closeTimeout.current);
        };
    }, []);

    const clearTooltipTimer = () => {
        if (closeTimeout.current) {
            clearTimeout(closeTimeout.current);
            closeTimeout.current = null;
        }
    };

    const startTooltipTimer = () => {
        clearTooltipTimer();
        closeTimeout.current = setTimeout(() => {
            setActiveTooltip(null);
        }, 500);
    };

    const showTooltip = (e: React.MouseEvent<HTMLTableCellElement>, title: string, total: number, transactions: Transaction[]) => {
        if (total === 0 || transactions.length === 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        clearTooltipTimer();
        setActiveTooltip({ title, total, transactions, position: { x: rect.left, y: rect.bottom } });
    };

    React.useEffect(() => {
        if (userId) {
            storageService.getCategoryBudgets(userId, 'Global')
                .then(setCategoryBudgets);
            storageService.getCategoryOrder(userId, 'expense')
                .then(setExpenseOrder);
            storageService.getCategoryOrder(userId, 'income')
                .then(setIncomeOrder);
        }
    }, [userId]);

    // Auto-select most recent report on mount
    React.useEffect(() => {
        if (!selectedReportId && reports.length > 0) {
            const sorted = [...reports].sort((a, b) => b.timestamp - a.timestamp);
            setSelectedReportId(sorted[0].id);
        }
    }, [reports, selectedReportId]);

    const selectedReport = useMemo(() =>
        reports.find(r => r.id === selectedReportId) || null,
    [reports, selectedReportId]);

    const handleBudgetChange = async (category: string, value: string) => {
        const amount = parseFloat(value) || 0;
        if (userId) {
            await storageService.saveBudget(userId, 'Global', amount, category);
            setCategoryBudgets(prev => ({ ...prev, [category]: amount }));
        }
        setEditingCategory(null);
    };

    const dateInfo = useMemo(() => {
        if (!selectedReport) return null;

        const dates = selectedReport.transactions
            .map(t => parseStructuredDate(t.date))
            .filter(d => !isNaN(d.getTime()))
            .sort((a, b) => a.getTime() - b.getTime());

        if (dates.length === 0) return null;

        const earliest = dates[0];
        const latest = dates[dates.length - 1];
        const daysElapsed = Math.max(1, Math.floor((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        const daysInMonth = new Date(latest.getFullYear(), latest.getMonth() + 1, 0).getDate();

        const monthName = latest.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        const startDay = earliest.getDate();
        const endDay = latest.getDate();

        return { earliest, latest, daysElapsed, daysInMonth, monthName, startDay, endDay };
    }, [selectedReport]);

    const tableData = useMemo(() => {
        if (!selectedReport || !dateInfo) {
            return { incomeCategories: [] as string[], expenseCategories: [] as string[], categoryData: {} as Record<string, { total: number; transactions: Transaction[] }> };
        }

        const categoryData: Record<string, { total: number; transactions: Transaction[] }> = {};
        const globalCategoryTotals: Record<string, number> = {};
        const incomeCategories = new Set<string>();
        const expenseCategories = new Set<string>();

        selectedReport.transactions.forEach(t => {
            const cat = t.category || 'Other';
            if (!categoryData[cat]) {
                categoryData[cat] = { total: 0, transactions: [] };
            }
            categoryData[cat].total += t.amount;
            categoryData[cat].transactions.push(t);
            globalCategoryTotals[cat] = (globalCategoryTotals[cat] || 0) + t.amount;
        });

        Object.entries(globalCategoryTotals).forEach(([cat, net]) => {
            if (net > 0) {
                incomeCategories.add(cat);
            } else if (net < 0) {
                expenseCategories.add(cat);
            } else {
                if (cat.toLowerCase().includes('income') || cat.toLowerCase().includes('salary')) {
                    incomeCategories.add(cat);
                } else {
                    expenseCategories.add(cat);
                }
            }
        });

        const sortCategories = (cats: Set<string>, order: string[]) => {
            const catArray = Array.from(cats);
            if (order.length === 0) return catArray.sort();
            return catArray.sort((a, b) => {
                const indexA = order.indexOf(a);
                const indexB = order.indexOf(b);
                if (indexA === -1 && indexB === -1) return a.localeCompare(b);
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            });
        };

        return {
            incomeCategories: sortCategories(incomeCategories, incomeOrder),
            expenseCategories: sortCategories(expenseCategories, expenseOrder),
            categoryData
        };
    }, [selectedReport, dateInfo, incomeOrder, expenseOrder]);

    const getProjected = (actual: number, isIncome: boolean) => {
        if (!dateInfo) return 0;
        const dailyRate = actual / dateInfo.daysElapsed;
        const projected = dailyRate * dateInfo.daysInMonth;
        return isIncome ? projected : projected;
    };

    const getPercentUsed = (actual: number, budget: number, isIncome: boolean) => {
        if (!budget || budget === 0) return 0;
        const absActual = isIncome ? actual : Math.abs(actual);
        return (absActual / budget) * 100;
    };

    const getStatusInfo = (actual: number, budget: number, isIncome: boolean): { label: string; color: string; bgColor: string; icon: string } => {
        if (!budget || budget === 0) return { label: 'No Budget', color: 'text-slate-400', bgColor: 'bg-slate-50', icon: 'fa-minus' };

        const absActual = isIncome ? actual : Math.abs(actual);
        const projected = Math.abs(getProjected(actual, isIncome));
        const percentUsed = (absActual / budget) * 100;

        if (isIncome) {
            if (projected >= budget) return { label: 'On Track', color: 'text-emerald-700', bgColor: 'bg-emerald-50', icon: 'fa-check' };
            if (projected >= budget * 0.8) return { label: 'Close', color: 'text-amber-700', bgColor: 'bg-amber-50', icon: 'fa-triangle-exclamation' };
            return { label: 'Behind', color: 'text-rose-700', bgColor: 'bg-rose-50', icon: 'fa-arrow-down' };
        }

        if (projected <= budget) return { label: 'On Track', color: 'text-emerald-700', bgColor: 'bg-emerald-50', icon: 'fa-check' };
        if (percentUsed <= 90) return { label: 'Warning', color: 'text-amber-700', bgColor: 'bg-amber-50', icon: 'fa-triangle-exclamation' };
        return { label: 'Over Budget', color: 'text-rose-700', bgColor: 'bg-rose-50', icon: 'fa-arrow-up' };
    };

    const getVarianceStyle = (variance: number) => {
        if (variance > 0) return 'text-emerald-600';
        if (variance < 0) {
            return Math.abs(variance) > 50 ? 'bg-rose-100 text-rose-900' : 'text-rose-600';
        }
        return 'text-slate-900';
    };

    const completedReports = reports.filter(r => r.status === 'completed' || r.transactions.length > 0);

    if (completedReports.length === 0) {
        return (
            <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-sm text-center">
                <i className="fa-solid fa-bullseye text-slate-200 text-5xl mb-4"></i>
                <h3 className="text-xl font-bold text-slate-800">No Reports Available</h3>
                <p className="text-slate-500 mt-2">Upload a mid-month transaction statement first to track your budget progress.</p>
                <button onClick={onBack} className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors">
                    Go to Import
                </button>
            </div>
        );
    }

    const hasBudgets = Object.values(categoryBudgets).some((v: number) => v > 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900">
                        Budget Progress Tracker
                    </h2>
                    <p className="text-sm font-bold text-violet-600 bg-violet-50 px-3 py-1 rounded-full w-fit mt-2">
                        Mid-Month Budget Checkpoint
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Tooltip</span>
                        <div className="flex bg-slate-100 rounded-xl p-0.5">
                            <button
                                onClick={() => setTooltipMode('hover')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tooltipMode === 'hover' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <i className="fa-solid fa-arrow-pointer text-[10px]"></i>
                                Hover
                            </button>
                            <button
                                onClick={() => setTooltipMode('click')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tooltipMode === 'click' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <i className="fa-solid fa-hand-pointer text-[10px]"></i>
                                Click
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={onBack}
                        className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-slate-100 transition-all"
                    >
                        <i className="fa-solid fa-arrow-left"></i>
                        Back to Dashboard
                    </button>
                </div>
            </div>

            {/* Report Selector */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                            <i className="fa-solid fa-file-lines text-violet-600"></i>
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Statement</p>
                            <p className="text-xs text-slate-500 mt-0.5">Choose your mid-month statement to compare against budget</p>
                        </div>
                    </div>
                    <select
                        value={selectedReportId}
                        onChange={(e) => setSelectedReportId(e.target.value)}
                        className="flex-1 md:flex-none md:min-w-[280px] px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 cursor-pointer"
                    >
                        {completedReports.sort((a, b) => b.timestamp - a.timestamp).map(r => (
                            <option key={r.id} value={r.id}>
                                {r.name} ({r.transactions.length} transactions)
                            </option>
                        ))}
                    </select>
                </div>

                {/* Date Range Summary */}
                {dateInfo && (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex items-center gap-2">
                            <i className="fa-solid fa-calendar text-slate-400 text-xs"></i>
                            <span className="text-xs font-bold text-slate-600">
                                {dateInfo.monthName}: Day {dateInfo.startDay} - {dateInfo.endDay}
                            </span>
                        </div>
                        <div className="bg-violet-50 px-4 py-2 rounded-xl border border-violet-100 flex items-center gap-2">
                            <i className="fa-solid fa-hourglass-half text-violet-500 text-xs"></i>
                            <span className="text-xs font-bold text-violet-700">
                                {dateInfo.daysElapsed} of {dateInfo.daysInMonth} days ({Math.round((dateInfo.daysElapsed / dateInfo.daysInMonth) * 100)}% of month)
                            </span>
                        </div>
                        <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-2">
                            <i className="fa-solid fa-receipt text-blue-500 text-xs"></i>
                            <span className="text-xs font-bold text-blue-700">
                                {selectedReport?.transactions.length || 0} transactions
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Budget prompt */}
            {!hasBudgets && selectedReport && (
                <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 flex items-start gap-4">
                    <div className="bg-amber-500 text-white p-2.5 rounded-xl shadow-lg shadow-amber-100">
                        <i className="fa-solid fa-triangle-exclamation text-lg"></i>
                    </div>
                    <div>
                        <h4 className="font-black text-amber-900">No Budgets Set</h4>
                        <p className="text-amber-700 text-sm mt-1 leading-relaxed">
                            You can set budgets by clicking on the budget cells in the table below, or head to the <span className="font-bold">Monthly View</span> to set them there.
                        </p>
                    </div>
                </div>
            )}

            {/* Spreadsheet Table */}
            {selectedReport && dateInfo && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-auto max-h-[80vh] custom-scrollbar focus:outline-none">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead className="sticky top-0 z-30">
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest sticky left-0 top-0 bg-slate-50 z-40 min-w-[200px] max-w-[200px] shadow-[1px_0_0_0_#f1f5f9]">Category</th>
                                    <th className="p-4 text-xs font-black text-violet-600 uppercase tracking-widest text-right min-w-[120px]">Monthly Budget</th>
                                    <th className="p-4 text-xs font-black text-blue-600 uppercase tracking-widest text-right min-w-[120px]">Spent So Far</th>
                                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center min-w-[160px]">% Used</th>
                                    <th className="p-4 text-xs font-black text-amber-600 uppercase tracking-widest text-right min-w-[130px]">Projected Month</th>
                                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right min-w-[120px]">Variance</th>
                                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center min-w-[110px]">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {/* Income Section */}
                                <tr className="bg-emerald-50/30">
                                    <td colSpan={7} className="px-4 py-2 text-[10px] font-black text-emerald-600 uppercase tracking-tighter">
                                        Income Streams
                                    </td>
                                </tr>
                                {tableData.incomeCategories.map(cat => {
                                    const cell = tableData.categoryData[cat];
                                    const actual = cell?.total || 0;
                                    const budget = categoryBudgets[cat] || 0;
                                    const percentUsed = getPercentUsed(actual, budget, true);
                                    const projected = getProjected(actual, true);
                                    const variance = budget > 0 ? projected - budget : 0;
                                    const status = getStatusInfo(actual, budget, true);

                                    return (
                                        <tr key={cat} className="group hover:bg-slate-50 transition-colors">
                                            <td className="p-4 text-sm font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 z-10 min-w-[200px] max-w-[200px] shadow-[1px_0_0_0_#f1f5f9] truncate">
                                                {cat}
                                            </td>
                                            <td className="p-4 text-sm font-black text-right min-w-[120px]">
                                                {editingCategory === cat ? (
                                                    <input
                                                        autoFocus
                                                        type="number"
                                                        className="w-full px-1 py-0.5 text-xs border rounded bg-white text-right"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onBlur={() => handleBudgetChange(cat, editValue)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleBudgetChange(cat, editValue)}
                                                    />
                                                ) : (
                                                    <div
                                                        className="cursor-pointer hover:bg-emerald-100/50 rounded px-2 py-0.5 transition-all text-emerald-800"
                                                        onClick={() => { setEditingCategory(cat); setEditValue((categoryBudgets[cat] || 0).toString()); }}
                                                    >
                                                        {budget > 0 ? `$${budget.toLocaleString()}` : <span className="text-slate-300 text-xs">Set budget</span>}
                                                    </div>
                                                )}
                                            </td>
                                            <td
                                                className={`p-4 text-sm font-black text-right text-emerald-600 min-w-[120px] hover:bg-emerald-100/50 ${tooltipMode === 'hover' ? 'cursor-help' : 'cursor-pointer'}`}
                                                onMouseEnter={tooltipMode === 'hover' ? (e) => showTooltip(e, cat, actual, cell?.transactions || []) : undefined}
                                                onMouseLeave={tooltipMode === 'hover' ? startTooltipTimer : undefined}
                                                onClick={tooltipMode === 'click' ? (e) => showTooltip(e, cat, actual, cell?.transactions || []) : undefined}
                                            >
                                                ${actual.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-4 min-w-[160px]">
                                                {budget > 0 ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${percentUsed >= 100 ? 'bg-emerald-500' : percentUsed >= 80 ? 'bg-amber-400' : 'bg-blue-400'}`}
                                                                style={{ width: `${Math.min(100, percentUsed)}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-black text-slate-500 min-w-[40px] text-right">{Math.round(percentUsed)}%</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-300 text-center block">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-sm font-black text-right text-amber-700 min-w-[130px]">
                                                ${Math.abs(projected).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className={`p-4 text-sm font-black text-right min-w-[120px] ${budget > 0 ? getVarianceStyle(variance) : 'text-slate-300'}`}>
                                                {budget > 0 ? (
                                                    <>{variance >= 0 ? '+' : ''}${variance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</>
                                                ) : '-'}
                                            </td>
                                            <td className="p-4 text-center min-w-[110px]">
                                                {budget > 0 ? (
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${status.color} ${status.bgColor}`}>
                                                        <i className={`fa-solid ${status.icon} text-[8px]`}></i>
                                                        {status.label}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-300">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {/* Income Totals */}
                                <tr className="bg-emerald-50 font-black">
                                    <td className="p-4 text-sm text-emerald-700 sticky left-0 bg-emerald-50 z-10 min-w-[200px] max-w-[200px] shadow-[1px_0_0_0_#f1f5f9]">Total Income</td>
                                    <td className="p-4 text-sm text-emerald-700 text-right">
                                        ${tableData.incomeCategories.reduce((acc, cat) => acc + (categoryBudgets[cat] || 0), 0).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-sm text-emerald-700 text-right">
                                        ${tableData.incomeCategories.reduce((acc, cat) => acc + (tableData.categoryData[cat]?.total || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-4"></td>
                                    <td className="p-4 text-sm text-emerald-700 text-right">
                                        ${Math.abs(tableData.incomeCategories.reduce((acc, cat) => acc + getProjected(tableData.categoryData[cat]?.total || 0, true), 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-4"></td>
                                    <td className="p-4"></td>
                                </tr>

                                {/* Expenses Section */}
                                <tr className="bg-red-50/30">
                                    <td colSpan={7} className="px-4 py-2 text-[10px] font-black text-red-600 uppercase tracking-tighter">
                                        Expense Categories
                                    </td>
                                </tr>
                                {tableData.expenseCategories.map(cat => {
                                    const cell = tableData.categoryData[cat];
                                    const actual = cell?.total || 0;
                                    const absActual = Math.abs(actual);
                                    const budget = categoryBudgets[cat] || 0;
                                    const percentUsed = getPercentUsed(actual, budget, false);
                                    const projected = Math.abs(getProjected(actual, false));
                                    const variance = budget > 0 ? budget - projected : 0;
                                    const status = getStatusInfo(actual, budget, false);

                                    return (
                                        <tr key={cat} className="group hover:bg-slate-50 transition-colors">
                                            <td className="p-4 text-sm font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 z-10 min-w-[200px] max-w-[200px] shadow-[1px_0_0_0_#f1f5f9] truncate">
                                                {cat}
                                            </td>
                                            <td className="p-4 text-sm font-black text-right min-w-[120px]">
                                                {editingCategory === cat ? (
                                                    <input
                                                        autoFocus
                                                        type="number"
                                                        className="w-full px-1 py-0.5 text-xs border rounded bg-white text-right"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onBlur={() => handleBudgetChange(cat, editValue)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleBudgetChange(cat, editValue)}
                                                    />
                                                ) : (
                                                    <div
                                                        className="cursor-pointer hover:bg-rose-100/50 rounded px-2 py-0.5 transition-all text-rose-800"
                                                        onClick={() => { setEditingCategory(cat); setEditValue((categoryBudgets[cat] || 0).toString()); }}
                                                    >
                                                        {budget > 0 ? `$${budget.toLocaleString()}` : <span className="text-slate-300 text-xs">Set budget</span>}
                                                    </div>
                                                )}
                                            </td>
                                            <td
                                                className={`p-4 text-sm font-black text-right text-rose-600 min-w-[120px] hover:bg-red-100/50 ${tooltipMode === 'hover' ? 'cursor-help' : 'cursor-pointer'}`}
                                                onMouseEnter={tooltipMode === 'hover' ? (e) => showTooltip(e, cat, actual, cell?.transactions || []) : undefined}
                                                onMouseLeave={tooltipMode === 'hover' ? startTooltipTimer : undefined}
                                                onClick={tooltipMode === 'click' ? (e) => showTooltip(e, cat, actual, cell?.transactions || []) : undefined}
                                            >
                                                ${absActual.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-4 min-w-[160px]">
                                                {budget > 0 ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${percentUsed >= 100 ? 'bg-rose-500' : percentUsed >= 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                                                style={{ width: `${Math.min(100, percentUsed)}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-black text-slate-500 min-w-[40px] text-right">{Math.round(percentUsed)}%</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-300 text-center block">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-sm font-black text-right text-amber-700 min-w-[130px]">
                                                ${projected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className={`p-4 text-sm font-black text-right min-w-[120px] ${budget > 0 ? getVarianceStyle(variance) : 'text-slate-300'}`}>
                                                {budget > 0 ? (
                                                    <>{variance >= 0 ? '+' : ''}${variance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</>
                                                ) : '-'}
                                            </td>
                                            <td className="p-4 text-center min-w-[110px]">
                                                {budget > 0 ? (
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${status.color} ${status.bgColor}`}>
                                                        <i className={`fa-solid ${status.icon} text-[8px]`}></i>
                                                        {status.label}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-300">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {/* Expense Totals */}
                                <tr className="bg-red-50 font-black">
                                    <td className="p-4 text-sm text-red-700 sticky left-0 bg-red-50 z-10 min-w-[200px] max-w-[200px] shadow-[1px_0_0_0_#f1f5f9]">Total Expenses</td>
                                    <td className="p-4 text-sm text-red-700 text-right">
                                        ${tableData.expenseCategories.reduce((acc, cat) => acc + (categoryBudgets[cat] || 0), 0).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-sm text-red-700 text-right">
                                        ${Math.abs(tableData.expenseCategories.reduce((acc, cat) => acc + (tableData.categoryData[cat]?.total || 0), 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-4"></td>
                                    <td className="p-4 text-sm text-red-700 text-right">
                                        ${Math.abs(tableData.expenseCategories.reduce((acc, cat) => acc + getProjected(tableData.categoryData[cat]?.total || 0, false), 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-4"></td>
                                    <td className="p-4"></td>
                                </tr>

                                {/* Net Position */}
                                <tr className="bg-slate-900 text-white font-black">
                                    <td className="p-4 text-sm sticky left-0 bg-slate-900 z-10 min-w-[200px] max-w-[200px] border-r border-slate-800">Net Position</td>
                                    <td className="p-4 text-sm text-right">
                                        ${(
                                            tableData.incomeCategories.reduce((acc, cat) => acc + (categoryBudgets[cat] || 0), 0) -
                                            tableData.expenseCategories.reduce((acc, cat) => acc + (categoryBudgets[cat] || 0), 0)
                                        ).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-sm text-right">
                                        {(() => {
                                            const netActual =
                                                tableData.incomeCategories.reduce((acc, cat) => acc + (tableData.categoryData[cat]?.total || 0), 0) +
                                                tableData.expenseCategories.reduce((acc, cat) => acc + (tableData.categoryData[cat]?.total || 0), 0);
                                            return (
                                                <span className={netActual >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                                    ${netActual.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="p-4"></td>
                                    <td className="p-4 text-sm text-right">
                                        {(() => {
                                            const projectedNet =
                                                tableData.incomeCategories.reduce((acc, cat) => acc + getProjected(tableData.categoryData[cat]?.total || 0, true), 0) +
                                                tableData.expenseCategories.reduce((acc, cat) => acc + getProjected(tableData.categoryData[cat]?.total || 0, false), 0);
                                            return (
                                                <span className={projectedNet >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                                    ${projectedNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="p-4"></td>
                                    <td className="p-4"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Insights Box */}
            <div className="bg-violet-50 p-6 rounded-3xl border border-violet-100 flex items-start gap-4">
                <div className="bg-violet-600 text-white p-3 rounded-2xl shadow-lg shadow-violet-100">
                    <i className="fa-solid fa-lightbulb text-xl"></i>
                </div>
                <div>
                    <h4 className="font-black text-violet-900">How Projections Work</h4>
                    <p className="text-violet-700 text-sm mt-1 leading-relaxed">
                        Projections are calculated using your daily spending rate from the selected statement.
                        The formula is: <span className="font-bold">(Spent So Far / Days Covered) x Days in Month</span>.
                        Click on any budget cell to set or update your target.
                        <span className="font-bold underline ml-1">{tooltipMode === 'hover' ? 'Hover over' : 'Click on'} any amount</span> to see the transaction breakdown.
                    </p>
                </div>
            </div>

            {activeTooltip && (
                <SpreadsheetTooltip
                    {...activeTooltip}
                    onMouseEnter={clearTooltipTimer}
                    onMouseLeave={startTooltipTimer}
                    onEditDate={onEditDate}
                    onDeleteTransaction={onDeleteTransaction}
                    onEditCategory={onEditCategory}
                    availableCategories={availableCategories}
                />
            )}
        </div>
    );
};

export default BudgetProgressView;
