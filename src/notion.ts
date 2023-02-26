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
