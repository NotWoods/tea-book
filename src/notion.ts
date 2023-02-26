import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

/**
 * Asserts that an object has a specific `type` field.
 * Throws an error if the type is incorrect.
 *
 * @example
 * assertType({ type: 'foo' }, 'foo') // passes
 * assertType({ type: 'foo' }, 'bar') // throws
 *
 * @param property The object to check.
 * @param type The expected type.
 */
export function assertType<
  NotionObject extends { type: string },
  Type extends NotionObject["type"]
>(
  object: NotionObject,
  type: Type
): asserts object is NotionObject & { type: Type } {
  if (object.type !== type) {
    const stringified = JSON.stringify(object, null, 2);
    throw new Error(
      `Expected type ${type} but got ${object.type}\n ${stringified}`
    );
  }
}

/**
 * Converts an array of Notion rich text objects into a single string.
 */
export function plainText(richText: readonly { plain_text: string }[]) {
  return richText.map((text) => text.plain_text).join("");
}

type FileObject =
  | { type: "external"; external: { url: string } }
  | { type: "file"; file: { url: string } };

/**
 * Extract the URL from a Notion file object.
 */
export function fileUrl(file: FileObject) {
  switch (file.type) {
    case "external":
      return file.external.url;
    case "file":
      return file.file.url;
  }
}

export interface FormattedTeaDatabasePage {
  /** Notion page ID */
  id: string;
  /** Name of the tea */
  name: string;
  /** Caffeine level. Will match one of the entires in `CAFFEINE_LEVELS`. */
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
  location: string[];
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

/**
 * Map of caffeine levels as defined in Notion to english strings for display.
 */
export const CAFFEINE_LEVELS: Partial<Record<string, string>> = {
  "☆☆☆": "decaf",
  "★☆☆": "low caffeine",
  "★★☆": "moderate caffeine",
  "★★★": "high caffeine",
};
