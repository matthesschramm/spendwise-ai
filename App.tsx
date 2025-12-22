
import React, { useState, useCallback, useEffect } from 'react';
import { Transaction, AppState, SavedReport } from './types';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import ReportHistory from './components/ReportHistory';
import ComparisonView from './components/ComparisonView';
import { parseCSV } from './utils/csvParser';
import { classifyTransactions } from './services/geminiService';
import { storageService } from './services/storageService';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppState>(AppState.IDLE);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [reportName, setReportName] = useState("");
  const [currentReport, setCurrentReport] = useState<SavedReport | null>(null);
  const [compareReport, setCompareReport] = useState<SavedReport | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load history on mount
  useEffect(() => {
    if (!session) return;
    const loadReports = async () => {
      const reports = await storageService.getAllReports(session.user.id);
      setSavedReports(reports);
    };
    loadReports();
  }, [session]);

  const handleFileUpload = useCallback(async (csvText: string) => {
    setStatus(AppState.PARSING);
    setError(null);

    try {
      const parsedData = parseCSV(csvText);
      if (parsedData.length === 0) {
        throw new Error("No valid transactions found in the CSV.");
      }

      setTransactions(parsedData);
      setStatus(AppState.ANALYZING);

      const chunkSize = 20;
      const analyzedTransactions: Transaction[] = [];

      for (let i = 0; i < parsedData.length; i += chunkSize) {
        const chunk = parsedData.slice(i, i + chunkSize);
        const classifiedChunk = await classifyTransactions(chunk);
        analyzedTransactions.push(...classifiedChunk);
      }

      setTransactions(analyzedTransactions);
      setStatus(AppState.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
      setStatus(AppState.ERROR);
    }
  }, []);

  const saveCurrentAnalysis = async () => {
    if (!reportName.trim()) return;

    const totalSpent = transactions.reduce((acc, t) => acc + t.amount, 0);
    const newReport: SavedReport = {
      id: `report-${Date.now()}`,
      name: reportName,
      timestamp: Date.now(),
      transactions: transactions,
      totalSpent
    };

    await storageService.saveReport(newReport, session!.user.id);
    const reports = await storageService.getAllReports(session!.user.id);
    setSavedReports(reports);
    setReportName("");
    setCurrentReport(newReport);
  };

  const handleSelectReport = (report: SavedReport) => {
    console.log(`Selecting report: ${report.name}`, report);
    if (!report.transactions || report.transactions.length === 0) {
      console.warn('Report has no transactions:', report);
    }
    setCurrentReport(report);
    setTransactions(report.transactions || []);
    setStatus(AppState.COMPLETED);
    setCompareReport(null);
  };

  const handleDeleteReport = async (id: string) => {
    await storageService.deleteReport(id, session!.user.id);
    const reports = await storageService.getAllReports(session!.user.id);
    setSavedReports(reports);
    if (currentReport?.id === id) reset();
  };

  const handleCompareTrigger = (report: SavedReport) => {
    if (!currentReport) {
      handleSelectReport(report);
      return;
    }
    if (currentReport.id === report.id) {
      setCompareReport(null);
      return;
    }
    setCompareReport(report);
    setStatus(AppState.COMPARING);
  };

  const reset = () => {
    setStatus(AppState.IDLE);
    setTransactions([]);
    setError(null);
    setCurrentReport(null);
    setCompareReport(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    reset();
  };

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={reset}>
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <i className="fa-solid fa-wallet text-xl"></i>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">SpendWise <span className="text-blue-600">AI</span></h1>
          </div>
          <div className="flex items-center gap-4">
            {status !== AppState.IDLE && (
              <button
                onClick={reset}
                className="text-sm text-slate-600 hover:text-slate-900 font-medium px-4 py-2 flex items-center gap-2"
              >
                <i className="fa-solid fa-arrow-left"></i>
                Home
              </button>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-slate-500 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all flex items-center gap-2 border border-transparent hover:border-red-100"
            >
              <i className="fa-solid fa-arrow-right-from-bracket"></i>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-10">
        {status === AppState.IDLE && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Financial Insight Hub</h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Analyze your monthly statements with Gemini's AI or compare your historical spending trends.
              </p>
            </div>

            <div className="max-w-xl mx-auto mb-16">
              <FileUpload onFileSelect={handleFileUpload} disabled={status !== AppState.IDLE} />
            </div>

            <ReportHistory
              reports={savedReports}
              onSelect={handleSelectReport}
              onDelete={handleDeleteReport}
              onCompare={handleCompareTrigger}
              selectedForComparison={currentReport?.id || null}
            />
          </div>
        )}

        {(status === AppState.PARSING || status === AppState.ANALYZING) && (
          <div className="flex flex-col items-center justify-center p-20 text-center">
            <div className="relative mb-8">
              <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="fa-solid fa-brain text-blue-600 animate-pulse text-xl"></i>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800">
              {status === AppState.PARSING ? "Reading your statement..." : "AI Classification in progress..."}
            </h3>
          </div>
        )}

        {status === AppState.ERROR && (
          <div className="max-w-xl mx-auto bg-red-50 border border-red-200 p-8 rounded-2xl text-center">
            <h3 className="text-xl font-bold text-red-900">Analysis Failed</h3>
            <p className="text-red-700 mt-2">{error}</p>
            <button onClick={reset} className="mt-6 bg-red-600 text-white px-6 py-2 rounded-xl">Try Again</button>
          </div>
        )}

        {status === AppState.COMPLETED && (
          <div className="animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">
                  {currentReport ? currentReport.name : "New Expenditure Analysis"}
                </h2>
                <p className="text-slate-500">Categorized by Gemini AI</p>
              </div>

              {!currentReport && (
                <div className="flex gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    placeholder="Report Name (e.g. Jan 2024)"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    className="flex-1 md:w-64 px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={saveCurrentAnalysis}
                    disabled={!reportName.trim()}
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors"
                  >
                    Save Report
                  </button>
                </div>
              )}
            </div>

            <Dashboard transactions={transactions} />
            <TransactionList transactions={transactions} />

            {savedReports.length > 1 && (
              <div className="mt-12 pt-12 border-t border-slate-100">
                <ReportHistory
                  reports={savedReports.filter(r => r.id !== currentReport?.id)}
                  onSelect={handleSelectReport}
                  onDelete={handleDeleteReport}
                  onCompare={handleCompareTrigger}
                  selectedForComparison={null}
                />
              </div>
            )}
          </div>
        )}

        {status === AppState.COMPARING && currentReport && compareReport && (
          <div className="animate-in slide-in-from-bottom duration-500">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Month-on-Month Comparison</h2>
              <button onClick={() => setStatus(AppState.COMPLETED)} className="text-slate-500 hover:text-slate-800 font-medium">
                Back to Details
              </button>
            </div>
            <ComparisonView reportA={currentReport} reportB={compareReport} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
