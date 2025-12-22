import { SavedReport } from "../types";
import { supabase } from "../lib/supabase";

export const storageService = {
  saveReport: async (report: SavedReport): Promise<void> => {
    const { error } = await supabase
      .from('reports')
      .insert([
        {
          id: report.id,
          name: report.name,
          timestamp: report.timestamp,
          data: report
        }
      ]);

    if (error) {
      console.error('Error saving report to Supabase:', error);
      // Fallback to localStorage if Supabase fails (optional, but good for UX)
      const reports = await storageService.getAllReports();
      reports.unshift(report);
      localStorage.setItem('spendwise_reports_backup', JSON.stringify(reports));
    }
  },

  getAllReports: async (): Promise<SavedReport[]> => {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching reports from Supabase:', error);
      const backup = localStorage.getItem('spendwise_reports_backup');
      return backup ? JSON.parse(backup) : [];
    }

    return (data || []).map(row => row.data as SavedReport);
  },

  deleteReport: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting report from Supabase:', error);
    }

    // Also cleanup backup
    const backup = localStorage.getItem('spendwise_reports_backup');
    if (backup) {
      const reports = JSON.parse(backup) as SavedReport[];
      const filtered = reports.filter(r => r.id !== id);
      localStorage.setItem('spendwise_reports_backup', JSON.stringify(filtered));
    }
  }
};
