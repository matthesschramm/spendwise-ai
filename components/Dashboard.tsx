
import React, { useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area,
  ComposedChart, Line
} from 'recharts';
import { Transaction } from '../types';
import { parseStructuredDate, toISODateKey } from '../utils/dateUtils';

interface DashboardProps {
  transactions: Transaction[];
  budgetAmount: number;
  onUpdateBudget: (amount: number) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b', '#22d3ee', '#fb923c', '#4ade80'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isCategory = !!data.transactions;
    const title = label || data.name || data.day;
    const items = data.transactions || [];

    return (
      <div className="bg-white p-4 rounded-xl shadow-2xl border border-slate-200 min-w-[300px] animate-in fade-in zoom-in duration-200 relative z-[1001] pointer-events-none">
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
          <span className="text-sm font-black text-slate-900">{title}</span>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            ${(data.value || data.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            {items.length > 0 ? 'Top Transactions' : 'Summary'}
          </p>
          <div className="max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
            {items.length > 0 ? (
              items.map((t: Transaction, idx: number) => (
                <div key={t.id || idx} className="flex justify-between items-start gap-4 mb-2">
                  <div className="flex-1">
                    <p className="text-[11px] font-medium text-slate-700 leading-tight line-clamp-2">{t.description}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{t.date}</p>
                  </div>
                  <span className="text-[11px] font-black text-slate-900">${t.amount.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-500 italic">No detailed breakdown available</p>
            )}
          </div>
          {data.count > 5 && (
            <p className="text-[10px] text-blue-500 font-bold mt-1 text-center bg-blue-50 py-1 rounded">
              + {data.count - 5} more transactions
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ transactions, budgetAmount, onUpdateBudget }) => {
  const [isEditingBudget, setIsEditingBudget] = React.useState(false);
  const [budgetInput, setBudgetInput] = React.useState(budgetAmount.toString());

  // Update input if prop changes
  React.useEffect(() => {
    setBudgetInput(budgetAmount.toString());
  }, [budgetAmount]);
  // 0. Calculate category totals to define Inflows vs Outflows
  const { outflows, inflows, categoryData } = useMemo(() => {
    const totals: Record<string, { amount: number; transactions: Transaction[] }> = {};

    transactions.forEach(t => {
      const cat = t.category || "Other";
      if (!totals[cat]) totals[cat] = { amount: 0, transactions: [] };
      totals[cat].amount += t.amount;
      totals[cat].transactions.push(t);
    });

    const outflowsArr: Transaction[] = [];
    const inflowsArr: Transaction[] = [];
    const categoryStats: any[] = [];

    Object.entries(totals).forEach(([name, stats]) => {
      // If the category is NET negative, it's an Outflow (Expense)
      if (stats.amount < 0) {
        const absAmount = Math.abs(stats.amount);
        // Add all transactions to outflow pool, but keep signs relative
        // We map to absolute for the charts that expect positive values for slices
        outflowsArr.push(...stats.transactions);
        categoryStats.push({
          name,
          value: Number(absAmount.toFixed(2)),
          count: stats.transactions.length,
          transactions: stats.transactions.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 5)
        });
      } else {
        inflowsArr.push(...stats.transactions);
      }
    });

    return {
      outflows: outflowsArr,
      inflows: inflowsArr,
      categoryData: categoryStats.sort((a, b) => b.value - a.value)
    };
  }, [transactions]);

  // 2. Daily Trend Data (Bar Chart logic)
  const dailyTrendData = useMemo(() => {
    if (outflows.length === 0) return [];

    const daily: Record<string, { amount: number; transactions: Transaction[]; dateObj: Date }> = {};
    const dates: Date[] = [];

    outflows.forEach(t => {
      // Precise parsing for DD/MM/YYYY or YYYY-MM-DD
      const date = parseStructuredDate(t.date);

      if (isNaN(date.getTime())) return;

      const key = toISODateKey(date);
      if (!daily[key]) {
        daily[key] = { amount: 0, transactions: [], dateObj: date };
        dates.push(date);
      }
      daily[key].amount += t.amount;
      daily[key].transactions.push(t);
    });

    if (dates.length === 0) return [];

    // Fill in the gaps
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    const filledData = [];
    let current = new Date(minDate);

    while (current <= maxDate) {
      const key = toISODateKey(current);
      const stats = daily[key];

      filledData.push({
        day: current.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        amount: Number(Math.abs(stats?.amount || 0).toFixed(2)),
        transactions: (stats?.transactions || []).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 5),
        count: stats?.transactions.length || 0,
        fullDate: key
      });

      current.setDate(current.getDate() + 1);
    }

    return filledData;
  }, [outflows]);

  // 3. Merchant Analysis
  const merchantData = useMemo(() => {
    const merchants: Record<string, number> = {};
    outflows.forEach(t => {
      const name = t.description.split(/[0-9*#]/)[0].trim().substring(0, 20);
      merchants[name] = (merchants[name] || 0) + t.amount;
    });
    return Object.entries(merchants)
      .map(([name, value]) => ({ name, value: Number(Math.abs(value).toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [outflows]);

  const totalSpent = categoryData.reduce((acc, curr) => acc + curr.value, 0);
  const totalIncome = inflows.reduce((acc, curr) => acc + curr.amount, 0);
  const maxExpense = outflows.length > 0 ? Math.max(...outflows.map(t => Math.abs(t.amount))) : 0;
  const topCategoryPercent = totalSpent > 0 ? (categoryData[0]?.value / totalSpent) * 100 : 0;

  return (
    <div className="space-y-6 mt-8">
      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-red-600 p-5 rounded-2xl text-white shadow-lg shadow-red-100">
          <div className="flex justify-between items-start">
            <p className="text-red-100 text-xs font-bold uppercase tracking-wider">Total Spent</p>
            <i className="fa-solid fa-arrow-down-long text-red-300 opacity-50"></i>
          </div>
          <h4 className="text-2xl font-black mt-1">${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
        </div>

        <div className="bg-emerald-600 p-5 rounded-2xl text-white shadow-lg shadow-emerald-100">
          <div className="flex justify-between items-start">
            <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Total Income</p>
            <i className="fa-solid fa-arrow-up-long text-emerald-300 opacity-50"></i>
          </div>
          <h4 className="text-2xl font-black mt-1">${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Largest Expense</p>
            <i className="fa-solid fa-arrow-up-wide-short text-slate-300"></i>
          </div>
          <h4 className="text-2xl font-black text-slate-800 mt-1">${maxExpense.toLocaleString()}</h4>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative group overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Monthly Budget</p>
            <button
              onClick={() => setIsEditingBudget(true)}
              className="text-slate-300 hover:text-blue-500 transition-colors"
            >
              <i className="fa-solid fa-pen-to-square"></i>
            </button>
          </div>

          {isEditingBudget ? (
            <div className="mt-2 flex gap-2 relative z-10">
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                autoFocus
                className="w-full bg-slate-50 border border-blue-100 rounded-lg px-3 py-1 text-lg font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onUpdateBudget(Number(budgetInput));
                    setIsEditingBudget(false);
                  }
                  if (e.key === 'Escape') {
                    setBudgetInput(budgetAmount.toString());
                    setIsEditingBudget(false);
                  }
                }}
              />
              <button
                onClick={() => {
                  onUpdateBudget(Number(budgetInput));
                  setIsEditingBudget(false);
                }}
                className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-bold"
              >
                Save
              </button>
            </div>
          ) : (
            <>
              <h4 className="text-2xl font-black text-slate-800 mt-1 relative z-10">
                {budgetAmount > 0 ? `$${budgetAmount.toLocaleString()}` : <span className="text-slate-300">Not Set</span>}
              </h4>
              {budgetAmount > 0 && (
                <div className="mt-3 relative z-10">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase">
                      {Math.min(100, (totalSpent / budgetAmount) * 100).toFixed(0)}% Used
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase">
                      ${Math.max(0, budgetAmount - totalSpent).toLocaleString()} Left
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${(totalSpent / budgetAmount) > 1 ? 'bg-rose-500' :
                        (totalSpent / budgetAmount) > 0.8 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                      style={{ width: `${Math.min(100, (totalSpent / budgetAmount) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Background emphasis when over budget */}
          {budgetAmount > 0 && totalSpent > budgetAmount && (
            <div className="absolute inset-0 bg-rose-50/30 -z-0 opacity-50" />
          )}
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Category Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-md font-bold text-slate-800 mb-6 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <i className="fa-solid fa-chart-pie text-blue-500"></i>
              Spending Allocation
            </span>
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Daily Timeline */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-md font-bold text-slate-800 mb-6 flex items-center gap-2">
            <i className="fa-solid fa-wave-square text-emerald-500"></i>
            Daily Spending Trend
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  minTickGap={20}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                <Bar
                  dataKey="amount"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Merchant Power List */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-md font-bold text-slate-800 mb-6 flex items-center gap-2">
            <i className="fa-solid fa-shop text-orange-500"></i>
            Top 8 Merchants
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={merchantData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 500 }} width={120} />
                <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']} wrapperStyle={{ zIndex: 1000 }} />
                <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Volume vs Value */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-md font-bold text-slate-800 mb-6 flex items-center gap-2">
            <i className="fa-solid fa-layer-group text-purple-500"></i>
            Category Volume vs. Value
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={categoryData.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" hide />
                <YAxis yAxisId="right" orientation="right" hide />
                <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                <Legend />
                <Bar yAxisId="left" dataKey="value" name="Total Value ($)" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={30} />
                <Line yAxisId="right" type="monotone" dataKey="count" name="Tx Count" stroke="#ec4899" strokeWidth={2} dot={{ fill: '#ec4899' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
