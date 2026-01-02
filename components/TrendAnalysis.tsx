import React, { useMemo, useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { SavedReport } from '../types';
import { aggregateTrendData } from '../utils/aggregationUtils';

interface TrendAnalysisProps {
    reports: SavedReport[];
    onBack: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
    'Housing': '#6366f1',
    'Utilities': '#8b5cf6',
    'Food - Supermarkets': '#ec4899',
    'Food - Dining': '#f43f5e',
    'Transportation': '#06b6d4',
    'Healthcare': '#10b981',
    'Insurance': '#f59e0b',
    'Entertainment': '#84cc16',
    'Shopping': '#64748b',
    'Subscriptions': '#3b82f6',
    'Travel': '#fbbf24',
    'Other': '#94a3b8'
};

const getCategoryColor = (cat: string, index: number) => {
    if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat];
    const fallbackColors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e'];
    return fallbackColors[index % fallbackColors.length];
};

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ reports, onBack }) => {
    const trendData = useMemo(() => aggregateTrendData(reports), [reports]);
    const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());

    const categoriesByGroup = useMemo(() => {
        const discretionary = new Set<string>();
        const nonDiscretionary = new Set<string>();

        reports.forEach(report => {
            report.transactions.forEach(t => {
                if (t.amount >= 0) return;
                const cat = t.category || 'Other';
                if (t.discretionary === false) {
                    nonDiscretionary.add(cat);
                } else {
                    discretionary.add(cat);
                }
            });
        });

        return {
            discretionary: Array.from(discretionary),
            nonDiscretionary: Array.from(nonDiscretionary)
        };
    }, [reports]);

    const toggleCategory = (cat: string) => {
        setHiddenCategories(prev => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    };

    if (reports.length === 0) {
        return (
            <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-sm text-center">
                <i className="fa-solid fa-chart-line text-slate-200 text-5xl mb-4"></i>
                <h3 className="text-xl font-bold text-slate-800">No Data for Analysis</h3>
                <p className="text-slate-500 mt-2">Upload and save some reports first to track your spending trends.</p>
                <button onClick={onBack} className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors">
                    Go Back
                </button>
            </div>
        );
    }

    const CustomLegend = ({ categories, groupName }: { categories: string[], groupName: string }) => (
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {categories.map((cat, idx) => {
                const isHidden = hiddenCategories.has(cat);
                const color = getCategoryColor(cat, idx);
                return (
                    <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border flex items-center gap-1.5 ${isHidden
                                ? 'bg-slate-50 border-slate-200 text-slate-400 grayscale line-through'
                                : 'bg-white border-slate-100 text-slate-600 shadow-sm hover:border-slate-300'
                            }`}
                    >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isHidden ? '#cbd5e1' : color }}></span>
                        {cat}
                    </button>
                );
            })}
        </div>
    );

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-12">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Spending Breakdown</h2>
                    <p className="text-slate-500 font-medium mt-1">Detailed month-on-month category analysis.</p>
                </div>
                <button
                    onClick={onBack}
                    className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-slate-100 transition-all border border-transparent hover:border-slate-100"
                >
                    <i className="fa-solid fa-arrow-left"></i>
                    Back to Hub
                </button>
            </div>

            <div className="grid grid-cols-1 gap-12">
                {/* Section 1: Non-discretionary Breakdown */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                                <i className="fa-solid fa-shield-halved text-indigo-600 text-xl"></i>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Essential Trends</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Non-Discretionary Expenses</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Total Fixed Items</p>
                            <p className="text-xl font-black text-indigo-600">{categoriesByGroup.nonDiscretionary.length}</p>
                        </div>
                    </div>

                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                    tickFormatter={(val) => `$${val.toLocaleString()}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '1.25rem',
                                        border: 'none',
                                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                        padding: '1.25rem'
                                    }}
                                    formatter={(val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                                />
                                {/* Main Total Line (Faded in background) */}
                                <Line
                                    type="monotone"
                                    dataKey="nonDiscretionary"
                                    name="Total Essential"
                                    stroke="#cbd5e1"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={false}
                                    activeDot={false}
                                    hide={hiddenCategories.has('Total Essential')}
                                />
                                {/* Category Lines */}
                                {categoriesByGroup.nonDiscretionary.map((cat, idx) => (
                                    <Line
                                        key={cat}
                                        type="monotone"
                                        dataKey={`categories.${cat}`}
                                        name={cat}
                                        stroke={getCategoryColor(cat, idx)}
                                        strokeWidth={hiddenCategories.has(cat) ? 0 : 3}
                                        dot={{ r: 4, fill: getCategoryColor(cat, idx), strokeWidth: 2, stroke: '#fff' }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                        animationDuration={1500}
                                        hide={hiddenCategories.has(cat)}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <CustomLegend categories={['Total Essential', ...categoriesByGroup.nonDiscretionary]} groupName="Essential" />
                </div>

                {/* Section 2: Discretionary Breakdown */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                                <i className="fa-solid fa-face-smile text-emerald-600 text-xl"></i>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Lifestyle Trends</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Discretionary Expenses</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Active Categories</p>
                            <p className="text-xl font-black text-emerald-600">{categoriesByGroup.discretionary.length}</p>
                        </div>
                    </div>

                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                    tickFormatter={(val) => `$${val.toLocaleString()}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '1.25rem',
                                        border: 'none',
                                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                        padding: '1.25rem'
                                    }}
                                    formatter={(val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                                />
                                {/* Main Total Line (Faded in background) */}
                                <Line
                                    type="monotone"
                                    dataKey="discretionary"
                                    name="Total Lifestyle"
                                    stroke="#cbd5e1"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={false}
                                    activeDot={false}
                                    hide={hiddenCategories.has('Total Lifestyle')}
                                />
                                {/* Category Lines */}
                                {categoriesByGroup.discretionary.map((cat, idx) => (
                                    <Line
                                        key={cat}
                                        type="monotone"
                                        dataKey={`categories.${cat}`}
                                        name={cat}
                                        stroke={getCategoryColor(cat, idx + 5)} // Offset index for variance
                                        strokeWidth={hiddenCategories.has(cat) ? 0 : 3}
                                        dot={{ r: 4, fill: getCategoryColor(cat, idx + 5), strokeWidth: 2, stroke: '#fff' }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                        animationDuration={1500}
                                        hide={hiddenCategories.has(cat)}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <CustomLegend categories={['Total Lifestyle', ...categoriesByGroup.discretionary]} groupName="Lifestyle" />
                </div>
            </div>
        </div>
    );
};

export default TrendAnalysis;
