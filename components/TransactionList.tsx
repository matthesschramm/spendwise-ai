
import React from 'react';
import { Transaction } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions }) => {
  return (
    <div className="bg-white mt-8 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-bold text-slate-800">Analyzed Transactions</h3>
        <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium">
          {transactions.length} items
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">AI Insight</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-600">{t.date}</td>
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-slate-800">{t.description}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {t.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-slate-800 text-right">
                  ${t.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4">
                   {t.groundingSources ? (
                     <div className="flex flex-wrap gap-2">
                       {t.groundingSources.slice(0, 2).map((s, idx) => (
                         <a 
                           key={idx} 
                           href={s.uri} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-100"
                           title={s.title}
                         >
                           <i className="fa-brands fa-google"></i>
                           Search Result
                         </a>
                       ))}
                     </div>
                   ) : (
                     <span className="text-xs text-slate-400 italic">Direct Identification</span>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionList;
