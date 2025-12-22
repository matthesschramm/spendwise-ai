
import { SavedReport } from "../types";

const STORAGE_KEY = 'spendwise_reports';

export const storageService = {
  saveReport: (report: SavedReport): void => {
    const reports = storageService.getAllReports();
    reports.unshift(report);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  },

  getAllReports: (): SavedReport[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  deleteReport: (id: string): void => {
    const reports = storageService.getAllReports();
    const filtered = reports.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
};
