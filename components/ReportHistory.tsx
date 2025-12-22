
import React from 'react';
import { SavedReport } from '../types';

interface ReportHistoryProps {
  reports: SavedReport[];
  onSelect: (report: SavedReport) => void;
  onDelete: (id: string) => void;
  onCompare: (report: SavedReport) => void;
  selectedForComparison: string | null;
}

const ReportHistory: React.FC<ReportHistoryProps> = ({ 
  reports, 
  onSelect, 
  onDelete, 
  onCompare,
  selectedForComparison 
}) => {
  if (reports.length === 0) return null;

  return (
    <div className="mt-12">
      <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <i className="fa-solid fa-clock-rotate-left text-blue-500"></i>
        Saved Reports
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <div 
            key={report.id} 
            className={`bg-white rounded-2xl border transition-all hover:shadow-md p-6 group ${
              selectedForComparison === report.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-100'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-slate-900 text-lg">{report.name}</h4>
                <p className="text-xs text-slate-400">
                  {new Date(report.timestamp).toLocaleDateString()} • {report.transactions.length} items
                </p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(report.id); }}
                className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <i className="fa-solid fa-trash-can"></i>
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-slate-500">Total Expenditure</p>
              <p className="text-2xl font-bold text-slate-800">${report.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => onSelect(report)}
                className="flex-1 bg-slate-50 text-slate-700 py-2 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors"
              >
                View Details
              </button>
              <button 
                onClick={() => onCompare(report)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  selectedForComparison === report.id 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                {selectedForComparison === report.id ? 'Comparing...' : 'Compare'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportHistory;
