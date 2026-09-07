import { GeneratedImage } from '../types';

const HISTORY_KEY = 'ai_image_studio_history';

// Type guard to check if an object is a valid GeneratedImage after parsing from JSON
const isGeneratedImage = (obj: any): obj is GeneratedImage => {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof obj.id === 'string' &&
        typeof obj.base64 === 'string' &&
        typeof obj.prompt === 'string' &&
        typeof obj.createdAt === 'string' // Dates are stringified by JSON.stringify
    );
};

/**
 * Saves the user's image generation history to local storage.
 * @param history - The array of GeneratedImage objects to save.
 */
export const saveHistoryToLocalStorage = (history: GeneratedImage[]): void => {
    try {
        // Limit the history to 50 items to avoid exceeding local storage limits.
        const historyToSave = history.slice(0, 50);
        const historyString = JSON.stringify(historyToSave);
        localStorage.setItem(HISTORY_KEY, historyString);
    } catch (error) {
        console.error("Error saving history to local storage:", error);
        // This can happen if local storage is full or disabled.
    }
};

/**
 * Loads the user's image generation history from local storage.
 * @returns An array of GeneratedImage objects, or an empty array if none is found or an error occurs.
 */
export const loadHistoryFromLocalStorage = (): GeneratedImage[] => {
    try {
        const historyString = localStorage.getItem(HISTORY_KEY);
        if (historyString) {
            const parsedHistory = JSON.parse(historyString);
            
            // Validate that the loaded data is an array and its items are valid
            if (Array.isArray(parsedHistory)) {
                return parsedHistory
                    .filter(isGeneratedImage) // Filter out any invalid or corrupted entries
                    .map(item => ({
                        ...item,
                        createdAt: new Date(item.createdAt), // Convert date string back to Date object
                    }));
            }
        }
        return [];
    } catch (error) {
        console.error("Error loading history from local storage:", error);
        return [];
    }
};
