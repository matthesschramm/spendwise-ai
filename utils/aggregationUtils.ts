import { Transaction, SavedReport } from '../types';
import { parseStructuredDate, getPeriodRange, getTransactionPeriod, getPeriodSortValue } from './dateUtils';

/**
 * Aggregates transactions from multiple reports, filters by period. 
 * Note: Deduplication is explicitly disabled as per user request to ensure simplicity.
 */
export const getAggregatedTransactions = (
    reports: SavedReport[],
    periodKey: string,
    mode: 'calendar' | 'mid-month'
): Transaction[] => {
    const { start, end } = getPeriodRange(periodKey, mode);

    return reports.flatMap(report =>
        report.transactions.filter(t => {
            const d = parseStructuredDate(t.date);
            if (isNaN(d.getTime())) return false;
            return d >= start && d <= end;
        })
    );
};

/**
 * Extracts all unique "Month Year" strings from a set of reports for the selector.
 */
export const getUniqueMonthsFromReports = (reports: SavedReport[]): string[] => {
    const months = new Set<string>();

    reports.forEach(report => {
        report.transactions.forEach(t => {
            const d = parseStructuredDate(t.date);
            if (!isNaN(d.getTime())) {
                // We add BOTH potential periods to the set so the user can see mid-month options
                months.add(getTransactionPeriod(d, 'calendar'));
                // Mid-month cycles also need to be discoverable
                const monthKey = getTransactionPeriod(d, 'mid-month') + (' (Mid-Month)');
                months.add(monthKey);
            }
        });
    });

    // Sort them chronologically
    return Array.from(months).sort((a, b) => {
        return getPeriodSortValue(b) - getPeriodSortValue(a); // Newest first
    });
};
