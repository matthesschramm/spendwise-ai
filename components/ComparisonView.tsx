
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { SavedReport } from '../types';

interface ComparisonViewProps {
  reportA: SavedReport;
  reportB: SavedReport;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({ reportA, reportB }) => {
  const comparisonData = useMemo(() => {
    const categories = new Set([
      ...reportA.transactions.map(t => t.category || 'Other'),
      ...reportB.transactions.map(t => t.category || 'Other')
    ]);

    const getTotals = (report: SavedReport) => {
      const totals: Record<string, number> = {};
      report.transactions.forEach(t => {
        const cat = t.category || 'Other';
        totals[cat] = (totals[cat] || 0) + t.amount;
      });
      return totals;
    };

    const totalsA = getTotals(reportA);
    const totalsB = getTotals(reportB);

    return Array.from(categories).map(cat => {
      const valA = totalsA[cat] || 0;
      const valB = totalsB[cat] || 0;
      const diff = valB - valA;
      const percentDiff = valA !== 0 ? (diff / valA) * 100 : 100;

      return {
        category: cat,
        [reportA.name]: Number(valA.toFixed(2)),
        [reportB.name]: Number(valB.toFixed(2)),
        diff: Number(diff.toFixed(2)),
        percentDiff: Number(percentDiff.toFixed(2))
      };
    }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [reportA, reportB]);

  return (
    <div className="space-y-8 mt-8">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <i className="fa-solid fa-code-compare text-indigo-500"></i>
          Spending Comparison: {reportA.name} vs {reportB.name}
        </h3>
        
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              <Legend verticalAlign="top" align="right" height={36} />
              <Bar dataKey={reportA.name} fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey={reportB.name} fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {comparisonData.map(item => (
          <div key={item.category} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold text-slate-700">{item.category}</span>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.diff > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {item.diff > 0 ? '+' : ''}{item.percentDiff}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{reportA.name}</span>
              <span className="font-medium">${item[reportA.name].toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-slate-500">{reportB.name}</span>
              <span className="font-medium">${item[reportB.name].toLocaleString()}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between text-sm font-bold">
              <span className="text-slate-600">Change</span>
              <span className={item.diff > 0 ? 'text-red-600' : 'text-green-600'}>
                {item.diff > 0 ? '+' : ''}${Math.abs(item.diff).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComparisonView;
