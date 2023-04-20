/**
 * Map of caffeine levels as defined in Notion to english strings for display.
 */
export const CAFFEINE_LEVELS: Partial<Record<string, string>> = {
  "☆☆☆": "decaf",
  "★☆☆": "low caffeine",
  "★★☆": "moderate caffeine",
  "★★★": "high caffeine",
};

/**
 * Simplified representation of a tea page's properties from Notion.
 */
export interface FormattedTeaDatabasePage {
  /** Notion page ID */
  id: string;
  /** Name of the tea */
  name: string;
  /** Caffeine level. Will match one of the keys in `CAFFEINE_LEVELS`. */
  caffeine: string;
  /** Temperature to steep the tea at. */
  temperature: string;
  /** How long to steep the tea for. */
  steepTime: string;
  /** How many tea leaves to use per amount of water. */
  serving: string;
  /** Type of tea, such as "Black tea" or "Herbal tea". */
  type: string;
  /** Where in the house the tea is located at. */
  location: readonly string[];
}
