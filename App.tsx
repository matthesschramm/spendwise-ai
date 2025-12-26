
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
import MonthlySpreadsheet from './components/MonthlySpreadsheet';
import LandingPage from './components/LandingPage';
import { Session } from '@supabase/supabase-js';
import { getAggregatedTransactions, getUniqueMonthsFromReports } from './utils/aggregationUtils';
import PeriodDashboard from './components/PeriodDashboard';

// New specialized components for UX 2.0
const ProcessingBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 p-4 animate-in slide-in-from-bottom duration-300 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
    <div className="max-w-6xl mx-auto flex items-center justify-between gap-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
          <i className="fa-solid fa-brain text-blue-600 animate-pulse"></i>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">AI Background Analysis</p>
          <p className="text-xs text-slate-500">Categorizing transactions for you...</p>
        </div>
      </div>
      <div className="flex-1 max-w-md">
        <div className="flex justify-between text-xs mb-1.5 font-bold">
          <span className="text-blue-600">{progress}%</span>
          <span className="text-slate-400">Complete</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [status, setStatus] = useState<AppState>(AppState.IDLE);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [reportName, setReportName] = useState("");
  const [currentReport, setCurrentReport] = useState<SavedReport | null>(null);
  const [compareReport, setCompareReport] = useState<SavedReport | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempReportName, setTempReportName] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [currentBudget, setCurrentBudget] = useState<number>(0);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [selectedPeriodMode, setSelectedPeriodMode] = useState<'calendar' | 'mid-month'>('calendar');
  const [aggregatedTransactions, setAggregatedTransactions] = useState<Transaction[]>([]);
  const [showPeriodSelector, setShowPeriodSelector] = useState(false);

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
    if (!session) return;
    setStatus(AppState.PARSING);
    setError(null);
    setIsAnalysisComplete(false);
    setAnalysisProgress(0);

    try {
      const parsedData = parseCSV(csvText);
      if (parsedData.length === 0) {
        throw new Error("No valid transactions found in the CSV.");
      }

      // 1. Create the Pending Report & Trigger Instant Autosave
      const newReportId = `report-${Date.now()}`;
      const defaultName = `Report ${new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`;

      const newReport: SavedReport = {
        id: newReportId,
        name: defaultName,
        timestamp: Date.now(),
        transactions: parsedData, // Initially all categorized as 'Other' by default in parser
        totalSpent: parsedData.reduce((acc, t) => acc + (t.amount < 0 ? Math.abs(t.amount) : 0), 0),
        status: 'processing',
        progress: 0
      };

      setTransactions(parsedData);
      setCurrentReport(newReport);
      setSavedReports(prev => [newReport, ...prev]);
      setStatus(AppState.COMPLETED); // We jump straight to dashboard view

      await storageService.saveReport(newReport, session.user.id);

      // 2. Start Background Analysis (Non-blocking)
      // We use a local variable to keep track of the latest transactions list
      // this avoids the issues with functional setStates and side-effects.
      let currentParsedList = [...parsedData];

      classifyTransactions(parsedData, session.user.id, (progress, batch) => {
        setAnalysisProgress(progress);

        // Update local list
        batch.forEach(newTx => {
          const idx = currentParsedList.findIndex(t => t.id === newTx.id);
          if (idx !== -1) currentParsedList[idx] = newTx;
        });

        // Create the fully updated report object
        const latestTransactions = [...currentParsedList];
        const updatedReport: SavedReport = {
          ...newReport,
          transactions: latestTransactions,
          status: progress === 100 ? 'completed' : 'processing',
          progress: progress
        };

        // Batch the state updates synchronously
        setTransactions(latestTransactions);
        setCurrentReport(updatedReport);
        setSavedReports(prevReports =>
          prevReports.map(r => r.id === newReportId ? updatedReport : r)
        );

        // Autosave the incremental progress to Supabase
        storageService.saveReport(updatedReport, session.user.id);

        if (progress === 100) {
          setIsAnalysisComplete(true);
          setTimeout(() => setIsAnalysisComplete(false), 5000);
        }
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
      setStatus(AppState.ERROR);
    }
  }, [session]);

  const saveCurrentAnalysis = async (customReport?: SavedReport) => {
    // If customReport is an Event (like from onClick), ignore it
    const actualReport = (customReport && 'id' in customReport) ? customReport : undefined;
    if (!actualReport && !reportName.trim()) return;

    setIsSaving(true);
    try {
      const reportToSave: SavedReport = actualReport || {
        id: `report-${Date.now()}`,
        name: reportName,
        timestamp: Date.now(),
        transactions: transactions,
        totalSpent: transactions.reduce((acc, t) => acc + (t.amount < 0 ? Math.abs(t.amount) : 0), 0),
        status: 'completed',
        progress: 100
      };

      await storageService.saveReport(reportToSave, session!.user.id);

      const reports = await storageService.getAllReports(session!.user.id);
      setSavedReports(reports);

      if (!customReport) {
        setReportName("");
        setCurrentReport(reportToSave);
      } else {
        setCurrentReport(reportToSave);
      }

      // Show success feedback
      setShowSavedFeedback(true);
      setTimeout(() => setShowSavedFeedback(false), 3000);
    } catch (err: any) {
      console.error('Failed to save report:', err);
      alert(`Error saving: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditTransactionCategory = (txId: string, newCategory: string) => {
    const transaction = transactions.find(t => t.id === txId);
    const updatedTransactions = transactions.map(t =>
      t.id === txId ? { ...t, category: newCategory } : t
    );
    setTransactions(updatedTransactions);

    // If we're looking at a saved report, we mark it as modified in the UI state
    if (currentReport) {
      setCurrentReport({
        ...currentReport,
        transactions: updatedTransactions,
        totalSpent: updatedTransactions.reduce((acc, t) => acc + (t.amount < 0 ? Math.abs(t.amount) : 0), 0)
      });
    }

    // SpendWise Learning Loop: Persist this preference to Supabase
    if (session && transaction) {
      storageService.saveUserRule(session.user.id, transaction.description, newCategory)
        .catch(err => console.error('Failed to save learning rule:', err));
    }
  };

  const handleSelectReport = async (report: SavedReport) => {
    console.log(`Selecting report: ${report.name}`, report);
    if (!report.transactions || report.transactions.length === 0) {
      console.warn('Report has no transactions:', report);
    }
    setCurrentReport(report);
    setTransactions(report.transactions || []);
    setStatus(AppState.COMPLETED);
    setCompareReport(null);

    if (session) {
      const budget = await storageService.getBudget(session.user.id, report.name);
      setCurrentBudget(budget);
    }
  };

  const handleUpdateBudget = async (amount: number) => {
    if (!session) return;
    const monthKey = status === AppState.PERIOD_DASHBOARD ? selectedPeriod : (currentReport?.name || "Global");
    try {
      await storageService.saveBudget(session.user.id, monthKey, amount);
      setCurrentBudget(amount);
    } catch (err) {
      console.error('Failed to update budget:', err);
    }
  };

  const handleViewPeriodDashboard = async (period: string, mode: 'calendar' | 'mid-month') => {
    if (!session) return;
    const agg = getAggregatedTransactions(savedReports, period, mode);
    setAggregatedTransactions(agg);
    setSelectedPeriod(period);
    setSelectedPeriodMode(mode);
    setShowPeriodSelector(false);
    setStatus(AppState.PERIOD_DASHBOARD);

    try {
      const budget = await storageService.getBudget(session.user.id, period);
      setCurrentBudget(budget);
    } catch (err) {
      console.error('Failed to fetch period budget:', err);
    }
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

  const handleRenameReport = async () => {
    if (!currentReport || !tempReportName.trim()) {
      setIsEditingName(false);
      return;
    }

    const updatedReport: SavedReport = {
      ...currentReport,
      name: tempReportName
    };

    setCurrentReport(updatedReport);
    setSavedReports(prev => prev.map(r => r.id === updatedReport.id ? updatedReport : r));
    setIsEditingName(false);

    try {
      await storageService.saveReport(updatedReport, session!.user.id);
    } catch (err) {
      console.error('Failed to rename report:', err);
    }
  };

  const toggleEditName = () => {
    if (currentReport) {
      setTempReportName(currentReport.name);
      setIsEditingName(true);
    }
  };

  if (!session) {
    if (showAuth) {
      return <Auth />;
    }
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center cursor-pointer h-full py-2" onClick={reset}>
            <img src="/logo.jpg" alt="SpendWise Logo" className="h-20 w-auto object-contain rounded-xl shadow-sm border border-slate-50" />
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
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Financial Insight Hub</h2>
              <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                Take control of your finances. Import new data for AI analysis or dive deep into your spending trends across time.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              {/* Action Pillar 1: Import */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                <div className="w-24 h-24 mb-4">
                  <img src="/import-hero.jpg" alt="Import Icon" className="w-full h-full object-contain rounded-2xl shadow-sm border border-slate-50" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Direct Import</h3>
                <p className="text-slate-500 text-sm mb-8">
                  Upload a new CSV statement to classify transactions with Gemini AI.
                </p>
                <div className="w-full">
                  <FileUpload onFileSelect={handleFileUpload} disabled={status !== AppState.IDLE} />
                </div>
              </div>

              {/* Action Pillar 2: Analysis */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-full">
                <div className="flex flex-col items-center text-center flex-1">
                  <div className="w-24 h-24 mb-4">
                    <img src="/analysis-hero.jpg" alt="Analysis Icon" className="w-full h-full object-contain rounded-2xl shadow-sm border border-slate-50" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Global Analysis</h3>
                  <p className="text-slate-500 text-sm mb-8">
                    View your entire spending history in a high-density spreadsheet format.
                  </p>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={() => setShowPeriodSelector(!showPeriodSelector)}
                    disabled={savedReports.length === 0}
                    className="w-full group bg-blue-600 text-white p-6 rounded-2xl flex items-center justify-between hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-chart-line text-blue-200"></i>
                      </div>
                      <div className="text-left">
                        <p className="font-bold">View Period Dashboard</p>
                        <p className="text-xs text-blue-200">Aggregated cross-report summary</p>
                      </div>
                    </div>
                    <i className={`fa-solid fa-chevron-${showPeriodSelector ? 'down' : 'right'} text-blue-400 transition-transform`}></i>
                  </button>

                  {showPeriodSelector && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-in slide-in-from-top duration-300">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-3 text-center">Select Aggregation Period</p>
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {getUniqueMonthsFromReports(savedReports).map(period => {
                          const isMidMonth = period.endsWith(' (Mid-Month)');
                          const mode = isMidMonth ? 'mid-month' : 'calendar';
                          const label = period.replace(' (Mid-Month)', '');

                          return (
                            <button
                              key={period}
                              onClick={() => handleViewPeriodDashboard(label, mode)}
                              className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group/period ${isMidMonth
                                ? 'bg-indigo-50/50 border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50'
                                : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                                }`}
                            >
                              <div>
                                <p className="text-xs font-black text-slate-800 tracking-tight">{label}</p>
                                <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${isMidMonth ? 'text-indigo-400' : 'text-slate-400'}`}>
                                  {isMidMonth ? 'Mid-Month Cycle' : 'Calendar Month'}
                                </p>
                              </div>
                              <i className={`fa-solid fa-chevron-right text-[10px] opacity-0 group-hover/period:opacity-100 transition-all ${isMidMonth ? 'text-indigo-300' : 'text-blue-300'}`}></i>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setStatus(AppState.MONTHLY_VIEW)}
                    disabled={savedReports.length === 0}
                    className="w-full group bg-slate-900 text-white p-6 rounded-2xl flex items-center justify-between hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:grayscale"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-table-list text-slate-400"></i>
                      </div>
                      <div className="text-left">
                        <p className="font-bold">Calendar View</p>
                        <p className="text-xs text-slate-400">Standard monthly comparison</p>
                      </div>
                    </div>
                    <i className="fa-solid fa-chevron-right text-slate-600 group-hover:translate-x-1 transition-transform"></i>
                  </button>

                  <button
                    onClick={() => setStatus(AppState.MID_MONTH_VIEW)}
                    disabled={savedReports.length === 0}
                    className="w-full group bg-blue-600 text-white p-6 rounded-2xl flex items-center justify-between hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50 disabled:grayscale"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-calendar-day text-blue-200"></i>
                      </div>
                      <div className="text-left">
                        <p className="font-bold">Mid-Month View</p>
                        <p className="text-xs text-blue-200">Period: 15th to 14th</p>
                      </div>
                    </div>
                    <i className="fa-solid fa-chevron-right text-blue-400 group-hover:translate-x-1 transition-transform"></i>
                  </button>
                </div>

                {savedReports.length === 0 && (
                  <p className="text-center text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-widest">
                    Upload a report to unlock analysis
                  </p>
                )}
              </div>
            </div>

            <div className="pt-12 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-8">
                <i className="fa-solid fa-clock-rotate-left text-slate-400"></i>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Recent Reports</h3>
              </div>
              <ReportHistory
                reports={savedReports}
                onSelect={handleSelectReport}
                onDelete={handleDeleteReport}
                onCompare={handleCompareTrigger}
                selectedForComparison={currentReport?.id || null}
              />
            </div>
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
              <div className="max-w-full overflow-hidden">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      className="text-2xl font-extrabold text-slate-900 border-b-2 border-blue-500 bg-transparent focus:outline-none min-w-[200px]"
                      value={tempReportName}
                      onChange={(e) => setTempReportName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRenameReport()}
                      autoFocus
                    />
                    <button
                      onClick={handleRenameReport}
                      className="text-blue-600 hover:text-blue-800 p-1"
                    >
                      <i className="fa-solid fa-check"></i>
                    </button>
                    <button
                      onClick={() => setIsEditingName(false)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                ) : (
                  <h2
                    className="text-2xl font-extrabold text-slate-900 cursor-pointer flex items-center gap-2 group"
                    onClick={toggleEditName}
                  >
                    {currentReport ? currentReport.name : "New Expenditure Analysis"}
                    <i className="fa-solid fa-pen text-slate-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity"></i>
                  </h2>
                )}
                <div className="flex items-center gap-2">
                  <p className="text-slate-500">
                    {currentReport?.status === 'processing'
                      ? `AI Analysis in progress (${currentReport.progress}%)...`
                      : 'Categorized by Gemini AI'}
                  </p>
                  {currentReport && (
                    <button
                      onClick={() => saveCurrentAnalysis(currentReport)}
                      disabled={isSaving}
                      className={`text-xs px-2 py-1 rounded border transition-all flex items-center gap-1 ${showSavedFeedback
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                        }`}
                    >
                      {isSaving ? (
                        <i className="fa-solid fa-circle-notch animate-spin"></i>
                      ) : showSavedFeedback ? (
                        <i className="fa-solid fa-check"></i>
                      ) : (
                        <i className="fa-solid fa-save"></i>
                      )}
                      {isSaving ? 'Saving...' : showSavedFeedback ? 'Saved!' : 'Save Changes'}
                    </button>
                  )}
                </div>
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
                    onClick={() => saveCurrentAnalysis()}
                    disabled={!reportName.trim()}
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors"
                  >
                    Save Report
                  </button>
                </div>
              )}
            </div>

            <Dashboard
              transactions={transactions}
              budgetAmount={currentBudget}
              onUpdateBudget={handleUpdateBudget}
            />
            <TransactionList
              transactions={transactions}
              onEditCategory={handleEditTransactionCategory}
            />

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
        {status === AppState.MONTHLY_VIEW && (
          <div className="animate-in fade-in slide-in-from-bottom duration-500">
            <MonthlySpreadsheet
              reports={savedReports}
              onBack={() => setStatus(AppState.IDLE)}
              mode="calendar"
              userId={session?.user?.id}
            />
          </div>
        )}
        {status === AppState.MID_MONTH_VIEW && (
          <div className="animate-in fade-in slide-in-from-bottom duration-500">
            <MonthlySpreadsheet
              reports={savedReports}
              onBack={() => setStatus(AppState.IDLE)}
              mode="mid-month"
              userId={session?.user?.id}
            />
          </div>
        )}
        {status === AppState.PERIOD_DASHBOARD && (
          <PeriodDashboard
            transactions={aggregatedTransactions}
            periodName={selectedPeriod}
            periodKey={selectedPeriod}
            mode={selectedPeriodMode!}
            onBack={() => setStatus(AppState.IDLE)}
            budgetAmount={currentBudget}
            onUpdateBudget={(amt) => handleUpdateBudget(amt)}
            allReports={savedReports}
          />
        )}
      </main>

      {/* UX 2.0 Global Notifications */}
      {currentReport?.status === 'processing' && status === AppState.COMPLETED && (
        <ProcessingBar progress={analysisProgress} />
      )}

      {isAnalysisComplete && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
              <i className="fa-solid fa-check text-xs"></i>
            </div>
            <span className="text-sm font-bold">AI Analysis Complete & Autosaved</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
