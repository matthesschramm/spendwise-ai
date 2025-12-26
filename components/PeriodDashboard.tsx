import React from 'react';
import { Transaction, SavedReport } from '../types';
import Dashboard from './Dashboard';

interface PeriodDashboardProps {
    transactions: Transaction[];
    periodName: string;
    onBack: () => void;
    budgetAmount: number;
    onUpdateBudget: (amount: number) => void;
    mode: 'calendar' | 'mid-month';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    periodKey: string;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    allReports: SavedReport[];
}

const PeriodDashboard: React.FC<PeriodDashboardProps> = ({
    transactions,
    periodName,
    onBack,
    budgetAmount,
    onUpdateBudget,
    mode
}) => {
    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                                <i className="fa-solid fa-chart-column text-xl"></i>
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Period Summary</h2>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Cross-Report Aggregation</p>
                            </div>
                        </div>
                        <p className="text-slate-500 font-medium mt-4">
                            Analysis for <span className="text-indigo-600 font-bold">{periodName}</span>
                            <span className="mx-2 text-slate-300">|</span>
                            <span className="text-slate-600 bg-slate-50 px-2 py-0.5 rounded text-xs">
                                {mode === 'calendar' ? 'Calendar Month' : 'Mid-Month Cycle (15th-14th)'}
                            </span>
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Consolidated</p>
                            <p className="text-lg font-black text-slate-700">{transactions.length} <span className="text-xs font-medium text-slate-400">Items</span></p>
                        </div>
                        <button
                            onClick={onBack}
                            className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center gap-2"
                        >
                            <i className="fa-solid fa-house-chimney text-xs"></i>
                            Exit to Hub
                        </button>
                    </div>
                </div>

                <Dashboard
                    transactions={transactions}
                    budgetAmount={budgetAmount}
                    onUpdateBudget={onUpdateBudget}
                />
            </div>
        </div>
    );
};

export default PeriodDashboard;
