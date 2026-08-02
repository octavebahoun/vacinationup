import localforage from 'localforage';
import wflData from './data/wfl_data.js';

const WHO_KEY = 'who_standards';
let cachedStandards = null;

/**
 * Initializes and caches WHO standards in IndexedDB if not present.
 */
export const initWhoStandards = async () => {
  try {
    const stored = await localforage.getItem(WHO_KEY);
    if (!stored) {
      console.log('Caching WHO standards to IndexedDB...');
      await localforage.setItem(WHO_KEY, wflData);
      cachedStandards = wflData;
    } else {
      console.log('WHO standards loaded from IndexedDB.');
      cachedStandards = stored;
    }
  } catch (error) {
    console.error('Error initializing WHO standards in IndexedDB:', error);
    cachedStandards = wflData;
  }
};

/**
 * Gets cached standards, falling back to static JSON if not loaded.
 */
const getStandards = () => {
  return cachedStandards || wflData;
};

/**
 * Retrieves interpolated LMS parameters for a given height and sex.
 * @param {number} height - Height in cm
 * @param {string} sex - 'M' or 'F'
 * @returns {Object|null} { L, M, S } or null
 */
export const getLMSForHeight = (height, sex) => {
  const standards = getStandards();
  const table = sex === 'M' ? standards.boys : standards.girls;
  
  if (!table || table.length === 0) return null;
  
  // Clamp height to the table's range [45.0, 110.0]
  const clampedHeight = Math.max(45.0, Math.min(110.0, height));
  
  // Since the table is sorted by length in steps of 0.1cm from 45.0 to 110.0,
  // we can use a direct O(1) index calculation.
  const index = (clampedHeight - 45.0) * 10;
  const idxFloor = Math.floor(index);
  const idxCeil = Math.ceil(index);
  
  if (idxFloor === idxCeil || idxCeil >= table.length) {
    const entry = table[Math.min(idxFloor, table.length - 1)];
    return { L: entry.L, M: entry.M, S: entry.S };
  }
  
  const entry1 = table[idxFloor];
  const entry2 = table[idxCeil];
  
  const ratio = index - idxFloor;
  
  const L = entry1.L + ratio * (entry2.L - entry1.L);
  const M = entry1.M + ratio * (entry2.M - entry1.M);
  const S = entry1.S + ratio * (entry2.S - entry1.S);
  
  return { L, M, S };
};

/**
 * Calculates Z-score, nutrition status, and closest discrete score for weight-for-length.
 * @param {number|string} weight - Weight in kg
 * @param {number|string} height - Height/Length in cm
 * @param {string} sex - 'M' or 'F'
 * @returns {Object|null} { zScore, discreteScore, status } or null
 */
export const calculateNutritionZScore = (weight, height, sex) => {
  const w = parseFloat(weight);
  const h = parseFloat(height);
  if (isNaN(w) || isNaN(h) || !sex) {
    return null;
  }
  
  const lms = getLMSForHeight(h, sex);
  if (!lms) return null;
  
  const { L, M, S } = lms;
  
  // Calculate Z-score using LMS formula
  let zScore = 0;
  if (L !== 0) {
    zScore = (Math.pow(w / M, L) - 1) / (L * S);
  } else {
    zScore = Math.log(w / M) / S;
  }
  
  // Classify nutrition status
  let status = 'BEN';
  let discreteScore = 0;
  
  if (zScore <= -3) {
    status = 'MAS';
    discreteScore = -3;
  } else if (zScore <= -2) {
    status = 'MAM';
    discreteScore = -2;
  } else {
    status = 'BEN';
    // Map to discrete BEN scores: -1.5, -1, 0, 1, 1.5
    if (zScore <= -1.25) {
      discreteScore = -1.5;
    } else if (zScore <= -0.5) {
      discreteScore = -1;
    } else if (zScore < 0.5) {
      discreteScore = 0;
    } else if (zScore < 1.25) {
      discreteScore = 1;
    } else {
      discreteScore = 1.5;
    }
  }
  
  return {
    zScore: parseFloat(zScore.toFixed(3)),
    discreteScore,
    status
  };
};
