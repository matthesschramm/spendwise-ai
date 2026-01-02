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
  },

  saveUserRule: async (userId: string, merchant: string, category: string): Promise<void> => {
    const { error } = await supabase
      .from('user_rules')
      .upsert([
        {
          user_id: userId,
          merchant_pattern: merchant.trim(),
          preferred_category: category,
          created_at: new Date().toISOString()
        }
      ], { onConflict: 'user_id,merchant_pattern' });

    if (error) {
      console.error('Error saving user rule:', error);
      throw error;
    }
  },

  getUserRules: async (userId: string): Promise<any[]> => {
    const { data, error } = await supabase
      .from('user_rules')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user rules:', error);
      return [];
    }

    return data || [];
  },

  saveBudget: async (userId: string, monthKey: string, amount: number, category: string = 'Total'): Promise<void> => {
    const { error } = await supabase
      .from('user_budgets')
      .upsert([
        {
          user_id: userId,
          month_key: monthKey,
          category: category,
          budget_amount: amount,
          updated_at: new Date().toISOString()
        }
      ], { onConflict: 'user_id,month_key,category' });

    if (error) {
      console.error('Error saving budget:', error);
      throw error;
    }
  },

  getBudget: async (userId: string, monthKey: string, category: string = 'Total'): Promise<number> => {
    const { data, error } = await supabase
      .from('user_budgets')
      .select('budget_amount')
      .eq('user_id', userId)
      .eq('month_key', monthKey)
      .eq('category', category)
      .single();

    if (error) {
      // It's normal for a budget to not exist yet
      if (error.code !== 'PGRST116') {
        console.error('Error fetching budget:', error);
      }
      return 0;
    }

    return data?.budget_amount || 0;
  },

  getCategoryBudgets: async (userId: string, monthKey: string): Promise<Record<string, number>> => {
    const { data, error } = await supabase
      .from('user_budgets')
      .select('category, budget_amount')
      .eq('user_id', userId)
      .eq('month_key', monthKey);

    if (error) {
      console.error('Error fetching category budgets:', error);
      return {};
    }

    return (data || []).reduce((acc: Record<string, number>, row: any) => {
      acc[row.category] = row.budget_amount;
      return acc;
    }, {});
  },

  getAllBudgets: async (userId: string): Promise<any[]> => {
    const { data, error } = await supabase
      .from('user_budgets')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching all budgets:', error);
      return [];
    }

    return data || [];
  },

  saveCategorySetting: async (userId: string, category: string, isDiscretionary: boolean): Promise<void> => {
    const { error } = await supabase
      .from('category_settings')
      .upsert([
        {
          user_id: userId,
          category_name: category,
          is_discretionary: isDiscretionary,
          updated_at: new Date().toISOString()
        }
      ], { onConflict: 'user_id,category_name' });

    if (error) {
      console.error('Error saving category setting:', error);
      throw error;
    }
  },

  getCategorySettings: async (userId: string): Promise<Record<string, boolean>> => {
    const { data, error } = await supabase
      .from('category_settings')
      .select('category_name, is_discretionary')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching category settings:', error);
      return {};
    }

    return (data || []).reduce((acc: Record<string, boolean>, row: any) => {
      acc[row.category_name] = row.is_discretionary;
      return acc;
    }, {});
  }
};
