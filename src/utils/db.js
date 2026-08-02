import localforage from 'localforage';

// Configure localForage
localforage.config({
  name: 'suivi-vaccin-db',
  storeName: 'vaccination_records'
});

// Keys
const KEYS = {
  KIDS: 'kids_records',
  SETTINGS: 'app_settings'
};

/**
 * Get all kids records from database
 * @returns {Promise<Array>} List of kids
 */
export const getKids = async () => {
  try {
    const kids = await localforage.getItem(KEYS.KIDS);
    return kids;
  } catch (error) {
    console.error('Error fetching kids records from DB:', error);
    return [];
  }
};

/**
 * Save all kids records to database
 * @param {Array} kids List of kids to save
 * @returns {Promise<boolean>} Success status
 */
export const saveKids = async (kids) => {
  try {
    await localforage.setItem(KEYS.KIDS, kids);
    return true;
  } catch (error) {
    console.error('Error saving kids records to DB:', error);
    return false;
  }
};

/**
 * Get settings from database
 * @returns {Promise<Object>} Settings object
 */
export const getSettings = async () => {
  try {
    const settings = await localforage.getItem(KEYS.SETTINGS);
    return settings || {
      nurseName: '',
      facilityName: '',
      defaultQuartier: '',
      autoCalculateScore: true,
      geminiApiKey: '',
      ocrEngine: 'local',
      customScoresTable: null
    };
  } catch (error) {
    console.error('Error fetching settings from DB:', error);
    return {};
  }
};

/**
 * Save settings to database
 * @param {Object} settings Settings object to save
 * @returns {Promise<boolean>} Success status
 */
export const saveSettings = async (settings) => {
  try {
    await localforage.setItem(KEYS.SETTINGS, settings);
    return true;
  } catch (error) {
    console.error('Error saving settings to DB:', error);
    return false;
  }
};
