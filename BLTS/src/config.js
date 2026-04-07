/**
 * Central configuration for BLTS.
 * Change these values to adapt to different university formats.
 */

// GTU fail grades — subjects with these grades are counted as backlogs
export const FAIL_GRADES = ['F', 'FF', 'I', 'W', 'AB'];

// Maximum number of subjects per row in OR/MFEED files
export const MAX_SUBJECTS_PER_ROW = 10;

// Number of backlogs at which a student is considered DETAINED
export const DETENTION_THRESHOLD = 4;

// Marks breakdown labels (used in export column headers)
export const MARKS_LABELS = {
  theory: 'External(50)',
  mid:    'Internal(50)',
  viva:   'Viva(50)',
};
