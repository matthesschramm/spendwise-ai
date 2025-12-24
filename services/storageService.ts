import { SavedReport } from "../types";
import { supabase } from "../lib/supabase";

export const storageService = {
  saveReport: async (report: SavedReport, userId: string): Promise<void> => {
    const { error } = await supabase
      .from('reports')
      .upsert([
        {
          id: report.id,
          name: report.name,
          timestamp: report.timestamp,
          data: report, // This is the full SavedReport object
          user_id: userId
        }
      ], { onConflict: 'id' });

    if (error) {
      console.error('Error saving report to Supabase:', error);
      throw error;
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
    if (data && data.length > 0) {
      console.log('First report categorization sample:', data[0].data.transactions?.[0]?.category);
    }

    // Ensure we return a clean SavedReport object
    return (data || []).map(row => {
      const report = row.data as SavedReport;
      return {
        status: 'completed', // Default for legacy reports
        progress: 100,      // Default for legacy reports
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
