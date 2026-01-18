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

export interface TrendDataPoint {
    month: string;
    discretionary: number;
    nonDiscretionary: number;
    categories: Record<string, number>; // Breakdown by category
}

/**
 * Determines a consistent classification for each category across all reports.
 * Prioritizes explicit user settings if available.
 */
export const getCategoryClassification = (
    reports: SavedReport[],
    userSettings?: Record<string, boolean>
): Record<string, boolean> => {
    const classification: Record<string, boolean> = {};

    reports.forEach(report => {
        report.transactions.forEach(t => {
            if (t.amount >= 0) return;
            const cat = t.category || 'Other';

            // 1. Explicit user settings take top priority
            if (userSettings && userSettings[cat] !== undefined) {
                classification[cat] = userSettings[cat];
                return;
            }

            // 2. Already marked as non-discretionary (false) in this pass? keep it.
            if (classification[cat] === false) return;

            // 3. Set based on transaction-level flag
            classification[cat] = t.discretionary !== false;
        });
    });

    return classification;
};

/**
 * Aggregates expense data across all reports, grouped by month and discretionary status.
 */
export const aggregateTrendData = (
    reports: SavedReport[],
    mode: 'calendar' | 'mid-month',
    categoryClassification?: Record<string, boolean>
): TrendDataPoint[] => {
    const monthMap: Record<string, { discretionary: number; nonDiscretionary: number; categories: Record<string, number> }> = {};

    // Use provided classification or calculate it
    const classification = categoryClassification || getCategoryClassification(reports);

    reports.forEach(report => {
        report.transactions.forEach(t => {
            if (t.amount >= 0) return; // Only expenses

            const d = parseStructuredDate(t.date);
            if (isNaN(d.getTime())) return;

            const month = getTransactionPeriod(d, mode);
            if (!monthMap[month]) {
                monthMap[month] = { discretionary: 0, nonDiscretionary: 0, categories: {} };
            }

            const absAmount = Math.abs(t.amount);
            const cat = t.category || 'Other';
            const isDiscretionary = classification[cat] !== false;

            // Track total by discretionary status
            if (isDiscretionary) {
                monthMap[month].discretionary += absAmount;
            } else {
                monthMap[month].nonDiscretionary += absAmount;
            }

            // Track category-specific total
            monthMap[month].categories[cat] = (monthMap[month].categories[cat] || 0) + absAmount;
        });
    });

    return Object.entries(monthMap)
        .map(([month, data]) => ({
            month,
            ...data
        }))
        .sort((a, b) => getPeriodSortValue(a.month) - getPeriodSortValue(b.month));
};
