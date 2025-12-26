/**
 * Parses a date string in DD/MM/YYYY or YYYY-MM-DD format.
 * Prioritizes DD/MM/YYYY (common for non-US locales) when slashes are present.
 */
export const parseStructuredDate = (dateStr: string): Date => {
    if (!dateStr) return new Date(NaN);

    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length >= 3) {
            const d = parseInt(parts[0]);
            const m = parseInt(parts[1]) - 1;
            let y = parseInt(parts[2]);

            // Handle YY vs YYYY
            if (parts[2].length === 2) {
                y += 2000;
            }

            return new Date(y, m, d);
        }
    }

    // Fallback to native parsing for ISO strings or other formats
    return new Date(dateStr);
};

/**
 * Formats a date to a string suitable for keys (YYYY-MM-DD)
 */
export const toISODateKey = (date: Date): string => {
    if (isNaN(date.getTime())) return 'invalid';
    return date.toISOString().split('T')[0];
};

/**
 * Checks if a date falls within a mid-month period (15th of prev to 14th of current)
 */
export const isDateInMidMonthPeriod = (date: Date, year: number, monthIdx: number): boolean => {
    const { start, end } = getPeriodRange(`${getMonthName(monthIdx)} ${year}`, 'mid-month');
    return date >= start && date <= end;
};

/**
 * Returns the Accounting Period label for a given date.
 * Calendar: "January 2024"
 * Mid-Month: 15 Dec 2023 - 14 Jan 2024 is "January 2024"
 */
export const getTransactionPeriod = (date: Date, mode: 'calendar' | 'mid-month'): string => {
    if (isNaN(date.getTime())) return 'Unknown';

    const targetDate = new Date(date);
    if (mode === 'mid-month') {
        // 15th of Month A to 14th of Month B is labeled "Month B"
        if (date.getDate() >= 15) {
            // Anchor to the 1st day to avoid overflow roll-over (e.g., Oct 31 -> Nov has only 30 days)
            targetDate.setDate(1);
            targetDate.setMonth(targetDate.getMonth() + 1);
        }
    }

    return `${getMonthName(targetDate.getMonth())} ${targetDate.getFullYear()}`;
};

/**
 * Returns the start and end boundaries for a given period label.
 * Forces 00:00:00 for start and 23:59:59 for end to be boundary-safe.
 */
export const getPeriodRange = (periodKey: string, mode: 'calendar' | 'mid-month'): { start: Date, end: Date } => {
    const [monthName, yearStr] = periodKey.split(' ');
    const year = parseInt(yearStr);
    const monthIdx = getMonthIndex(monthName);

    if (mode === 'calendar') {
        const start = new Date(year, monthIdx, 1, 0, 0, 0, 0);
        const end = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
        return { start, end };
    } else {
        // Mid-month: From 15th of previous month to 14th of current month
        const end = new Date(year, monthIdx, 14, 23, 59, 59, 999);
        const start = new Date(year, monthIdx, 1, 0, 0, 0, 0);
        start.setMonth(start.getMonth() - 1);
        start.setDate(15);
        return { start, end };
    }
};

/**
 * Returns a sortable timestamp for a period label.
 */
export const getPeriodSortValue = (periodKey: string): number => {
    const cleanLabel = periodKey.replace(' (Mid-Month)', '');
    const [monthName, yearStr] = cleanLabel.split(' ');
    const year = parseInt(yearStr);
    const monthIdx = getMonthIndex(monthName);

    // Use the middle of the month for sorting so mid-month/calendar for same month are near each other
    // but mid-month (which starts earlier) could be sorted slightly differently if needed.
    // For now, just month-year is enough for chronological grouping.
    let base = new Date(year, monthIdx, 1).getTime();
    if (periodKey.includes('(Mid-Month)')) base += 1; // Sort mid-month just after calendar
    return base;
};

const getMonthName = (idx: number): string => {
    return [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ][idx];
};

const getMonthIndex = (name: string): number => {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months.indexOf(name);
};
