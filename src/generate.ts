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
import { generateSvg } from "./svg.tsx";

/**
 * Downloads all the teas from Notion and formats them into lists.
 * @returns A list of teas, grouped by location.
 */
async function getTeaList() {
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
 * Generate markdown chapter content for a specific tea.
 * Chapters are signified by a heading 1 (`#`).
 */
async function generateChapterMarkdown(tea: FormattedTeaDatabasePage) {
  const content: string[] = await fetchTeaPageContent(tea);

  return `${generateChapterPropertiesMarkdown(tea)}

${content.length > 0 ? "---\n" : ""}
${content.join("\n\n")}
`;
}

const { topDisplayTeas, bottomDisplayTeas, pantryTeas } = await getTeaList();

// Generate the cover image SVG
const svg = await generateSvg(topDisplayTeas, bottomDisplayTeas);
await Deno.writeTextFile("tea.svg", svg);

// Generate the markdown file that represents the ebook
const book = `---
title: Tea
creator: Tiger x Daphne
date: ${formatDate(new Date(), "yyyy-MM-dd")}
lang: en-US
cover-image: tea.png
css: assets/epub.css
...

${generateTeaTableHtml("Display (top)", topDisplayTeas, 1)}

${
  generateTeaTableHtml(
    "Display (bottom)",
    bottomDisplayTeas,
    topDisplayTeas.length + 1,
  )
}

${
  generateTeaTableHtml(
    "Pantry",
    pantryTeas,
    topDisplayTeas.length + bottomDisplayTeas.length + 1,
  )
}

${
  (
    await Promise.all(
      [...topDisplayTeas, ...bottomDisplayTeas, ...pantryTeas].map(
        generateChapterMarkdown,
      ),
    )
  ).join("\n\n")
}`;
// Write the book file for pandoc
await Deno.writeTextFile("tea-list.txt", book);
