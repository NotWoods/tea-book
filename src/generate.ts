import { format as formatDate } from "std/datetime/format.ts";
import {
  generateChapterPropertiesMarkdown,
  generateTeaTableHtml,
} from "./book.tsx";
import {
  fetchTeaDatabasePages,
  fetchTeaPageContent,
} from "./notion/client.tsx";
import type { FormattedTeaDatabasePage } from "./notion/types.ts";
import { generateSvgCover } from "./cover.tsx";

interface TeaCollection {
  topDisplayTeas: readonly FormattedTeaDatabasePage[];
  bottomDisplayTeas: readonly FormattedTeaDatabasePage[];
  pantryTeas: readonly FormattedTeaDatabasePage[];
}

/**
 * Downloads all the teas from Notion and formats them into lists.
 * @returns A list of teas, grouped by location.
 */
async function getTeaCollection(): Promise<TeaCollection> {
  const topDisplayTeas: FormattedTeaDatabasePage[] = [];
  const bottomDisplayTeas: FormattedTeaDatabasePage[] = [];
  const pantryTeas: FormattedTeaDatabasePage[] = [];

  for (const page of await fetchTeaDatabasePages()) {
    const locations = new Set(page.location);
    if (locations.has("Display (top)")) {
      topDisplayTeas.push(page);
    } else if (locations.has("Display (bottom)")) {
      bottomDisplayTeas.push(page);
    } else {
      pantryTeas.push(page);
    }
  }

  return {
    topDisplayTeas,
    bottomDisplayTeas,
    pantryTeas,
  };
}

/**
 * Generate markdown chapter content for each specific tea.
 * Chapters are signified by a heading 1 (`#`).
 */
async function* generateChapterMarkdown(
  teas: readonly FormattedTeaDatabasePage[],
) {
  const pageContentArray = teas.map(fetchTeaPageContent);

  for (const [index, tea] of teas.entries()) {
    const content: string[] = await pageContentArray[index];

    yield "\n\n";
    yield `${generateChapterPropertiesMarkdown(tea)}

${content.length > 0 ? "---\n" : ""}
${content.join("\n\n")}
`;
  }
}

async function writeTextFile(input: AsyncIterable<string>, fileName: string) {
  const file = await Deno.open(fileName, { write: true, create: true });
  await ReadableStream.from(input)
    .pipeThrough(new TextEncoderStream())
    .pipeTo(file.writable);
}

/**
 * Generate the markdown file that represents the ebook.
 */
async function* generateBookMarkdown(
  { topDisplayTeas, bottomDisplayTeas, pantryTeas }: TeaCollection,
): AsyncIterableIterator<string> {
  // YAML frontmatter
  yield `---
title: Tea
creator: Tiger x Daphne
date: ${formatDate(new Date(), "yyyy-MM-dd")}
lang: en-US
cover-image: tea.png
css: assets/epub.css
...`;

  yield "\n\n";
  yield* await generateTeaTableHtml("Display (top)", topDisplayTeas, 1);

  yield "\n\n";
  yield* await generateTeaTableHtml(
    "Display (bottom)",
    bottomDisplayTeas,
    topDisplayTeas.length + 1,
  );

  yield "\n\n";
  yield* await generateTeaTableHtml(
    "Pantry",
    pantryTeas,
    topDisplayTeas.length + bottomDisplayTeas.length + 1,
  );

  yield* generateChapterMarkdown([
    ...topDisplayTeas,
    ...bottomDisplayTeas,
    ...pantryTeas,
  ]);
}

const teaCollection = await getTeaCollection();
const { topDisplayTeas, bottomDisplayTeas } = teaCollection;

// Generate the cover image SVG
await writeTextFile(
  generateSvgCover(topDisplayTeas, bottomDisplayTeas),
  "tea.svg",
);

// Write the book file for pandoc
writeTextFile(generateBookMarkdown(teaCollection), "tea-list.txt");
