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
  Type extends NotionObject["type"],
>(
  object: NotionObject,
  type: Type,
): asserts object is NotionObject & { type: Type } {
  if (object.type !== type) {
    const stringified = JSON.stringify(object, null, 2);
    throw new Error(
      `Expected type ${type} but got ${object.type}\n ${stringified}`,
    );
  }
}

/**
 * Converts an array of Notion rich text objects into a single string.
 * @param richText Array of Notion rich text objects.
 * @see https://developers.notion.com/reference/rich-text
 */
export function plainText(richText: readonly { plain_text: string }[]) {
  return richText.map((text) => text.plain_text).join("");
}

/**
 * Extract the URL from a Notion file object.
 * @param file Notion file object.
 * @see https://developers.notion.com/reference/file-object
 */
export function fileUrl(
  file:
    | { type: "external"; external: { url: string } }
    | { type: "file"; file: { url: string } },
) {
  switch (file.type) {
    case "external":
      return file.external.url;
    case "file":
      return file.file.url;
  }
}
