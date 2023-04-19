import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { assertType, plainText } from "./utils.ts";

/**
 * Map of caffeine levels as defined in Notion to english strings for display.
 */
export const CAFFEINE_LEVELS: Partial<Record<string, string>> = {
  "☆☆☆": "decaf",
  "★☆☆": "low caffeine",
  "★★☆": "moderate caffeine",
  "★★★": "high caffeine",
};

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

/**
 * Convert a Notion page object into a simplified format.
 */
export function formatTeaDatabasePage({
  id,
  properties,
}: PageObjectResponse): FormattedTeaDatabasePage {
  assertType(properties.Name, "title");
  assertType(properties.Caffeine, "select");
  assertType(properties.Temperature, "formula");
  assertType(properties.Temperature.formula, "string");
  assertType(properties["Steep time"], "formula");
  assertType(properties["Steep time"].formula, "string");
  assertType(properties.Serving, "rich_text");
  assertType(properties.Type, "select");
  assertType(properties.Location, "multi_select");

  return {
    id,
    name: plainText(properties.Name.title),
    caffeine: properties.Caffeine.select?.name ?? "",
    temperature: properties.Temperature.formula.string ?? "",
    steepTime: properties["Steep time"].formula.string ?? "",
    serving: plainText(properties.Serving.rich_text),
    type: properties.Type.select?.name ?? "",
    location: properties.Location.multi_select.map(({ name }) => name),
  };
}
