import { SavedReport } from "../types";
import { supabase } from "../lib/supabase";

export const storageService = {
  saveReport: async (report: SavedReport, userId: string): Promise<void> => {
    console.log('Saving report to Supabase:', report.id);
    const { error } = await supabase
      .from('reports')
      .insert([
        {
          id: report.id,
          name: report.name,
          timestamp: report.timestamp,
          data: report, // This is the full SavedReport object
          user_id: userId
        }
      ]);

    if (error) {
      console.error('Error saving report to Supabase:', error);
    }
  },

  getAllReports: async (userId: string): Promise<SavedReport[]> => {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching reports from Supabase:', error);
      return [];
    }

    console.log(`Fetched ${data?.length || 0} reports from Supabase`);
    // Ensure we return a clean SavedReport object
    return (data || []).map(row => {
      const report = row.data as SavedReport;
      return {
        ...report,
        id: row.id, // Column takes precedence
        name: row.name,
        timestamp: row.timestamp
      };
    });
  },

  deleteReport: async (id: string, userId: string): Promise<void> => {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting report from Supabase:', error);
    }
  }
};
