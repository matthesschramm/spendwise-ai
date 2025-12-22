
import React, { useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area,
  ComposedChart, Line
} from 'recharts';
import { Transaction } from '../types';

interface DashboardProps {
  transactions: Transaction[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b', '#22d3ee', '#fb923c', '#4ade80'];

const Dashboard: React.FC<DashboardProps> = ({ transactions }) => {
  // 1. Category Data
  const categoryData = useMemo(() => {
    const summary: Record<string, { value: number, count: number }> = {};
    transactions.forEach(t => {
      const cat = t.category || "Other";
      if (!summary[cat]) summary[cat] = { value: 0, count: 0 };
      summary[cat].value += t.amount;
      summary[cat].count += 1;
    });

    return Object.entries(summary).map(([name, stats]) => ({
      name,
      value: Number(stats.value.toFixed(2)),
      count: stats.count
    })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  // 2. Daily Trend Data
  const dailyTrendData = useMemo(() => {
    const daily: Record<string, number> = {};
    transactions.forEach(t => {
      // Try to extract day from date string (Assuming common formats like MM/DD/YYYY or YYYY-MM-DD)
      const dateParts = t.date.split(/[-/]/);
      let day = t.date; // fallback
      if (dateParts.length >= 2) {
        // Find the part that looks like a day (usually the 2nd part or 3rd)
        day = dateParts.length === 3 ? dateParts[2] : dateParts[1];
        if (day.length > 2) day = dateParts[1]; // handle YYYY-MM-DD vs MM-DD-YYYY
      }
      
      const dayNum = parseInt(day);
      const label = isNaN(dayNum) ? t.date : `Day ${dayNum}`;
      daily[label] = (daily[label] || 0) + t.amount;
    });

    return Object.entries(daily)
      .map(([day, amount]) => ({ day, amount: Number(amount.toFixed(2)) }))
      .sort((a, b) => {
        const d1 = parseInt(a.day.replace('Day ', ''));
        const d2 = parseInt(b.day.replace('Day ', ''));
        return d1 - d2;
      });
  }, [transactions]);

  // 3. Merchant Analysis
  const merchantData = useMemo(() => {
    const merchants: Record<string, number> = {};
    transactions.forEach(t => {
      const name = t.description.split(/[0-9*#]/)[0].trim().substring(0, 20);
      merchants[name] = (merchants[name] || 0) + t.amount;
    });
    return Object.entries(merchants)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [transactions]);

  const total = categoryData.reduce((acc, curr) => acc + curr.value, 0);
  const maxExpense = Math.max(...transactions.map(t => t.amount));
  const avgDaily = total / (dailyTrendData.length || 1);
  const topCategoryPercent = total > 0 ? (categoryData[0]?.value / total) * 100 : 0;

  return (
    <div className="space-y-6 mt-8">
      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-600 p-5 rounded-2xl text-white shadow-lg shadow-blue-100">
          <div className="flex justify-between items-start">
            <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Total Spent</p>
            <i className="fa-solid fa-wallet text-blue-300 opacity-50"></i>
          </div>
          <h4 className="text-2xl font-black mt-1">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Daily Average</p>
            <i className="fa-solid fa-calculator text-slate-300"></i>
          </div>
          <h4 className="text-2xl font-black text-slate-800 mt-1">${avgDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h4>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Largest Expense</p>
            <i className="fa-solid fa-arrow-up-wide-short text-slate-300"></i>
          </div>
          <h4 className="text-2xl font-black text-slate-800 mt-1">${maxExpense.toLocaleString()}</h4>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Budget Concentration</p>
            <i className="fa-solid fa-percentage text-slate-300"></i>
          </div>
          <h4 className="text-2xl font-black text-slate-800 mt-1">{topCategoryPercent.toFixed(0)}%</h4>
          <p className="text-[10px] text-slate-400 mt-1 font-medium italic">In {categoryData[0]?.name}</p>
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
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Total Spent']} 
                />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
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
              <AreaChart data={dailyTrendData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis hide />
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                   formatter={(value: number) => [`$${value.toLocaleString()}`, 'Expenditure']}
                />
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
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
                <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']} />
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
                <Tooltip />
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
