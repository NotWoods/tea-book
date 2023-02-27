import {
  Client,
  isFullBlock,
  isFullPage,
  iteratePaginatedAPI,
} from "npm:@notionhq/client";
import { format as formatDate } from "std/datetime/format.ts";
import { load } from "std/dotenv/mod.ts";
import {
  generateChapterPropertiesMarkdown,
  generateTeaTableHtml,
} from "./book.ts";
import {
  fileUrl,
  formatTeaDatabasePage,
  FormattedTeaDatabasePage,
  plainText,
} from "./notion.ts";
import { generateSvg } from "./svg.ts";

const env = await load({
  restrictEnvAccessTo: ["NOTION_TOKEN", "NOTION_DB"],
  defaultsPath: "",
});
const notion = new Client({ auth: env["NOTION_TOKEN"] });

/**
 * Downloads all the teas from Notion and formats them into lists.
 * @returns A list of teas, grouped by location.
 */
async function getTeaList() {
  const teaListIterator = iteratePaginatedAPI(notion.databases.query, {
    database_id: env["NOTION_DB"],
    sorts: [
      {
        property: "Location",
        direction: "ascending",
      },
    ],
    filter: {
      property: "Location",
      multi_select: {
        is_not_empty: true,
      },
    },
  });

  const topDisplayTeas: FormattedTeaDatabasePage[] = [];
  const bottomDisplayTeas: FormattedTeaDatabasePage[] = [];
  const pantryTeas: FormattedTeaDatabasePage[] = [];
  for await (const page of teaListIterator) {
    if (!isFullPage(page)) {
      continue;
    }

    if (page.properties.Location.type !== "multi_select") {
      throw new Error(
        `Expected Location to be a multi_select, got ${page.properties.Location.type}`
      );
    }
    const formatted = formatTeaDatabasePage(page);

    const locations = new Set(
      page.properties.Location.multi_select.map(({ name }) => name)
    );
    if (locations.has("Display (top)")) {
      topDisplayTeas.push(formatted);
    } else if (locations.has("Display (bottom)")) {
      bottomDisplayTeas.push(formatted);
    } else {
      pantryTeas.push(formatted);
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
  const blocksIterator = iteratePaginatedAPI(notion.blocks.children.list, {
    block_id: tea.id,
  });

  const content: string[] = [];
  for await (const block of blocksIterator) {
    if (!isFullBlock(block)) {
      continue;
    }

    switch (block.type) {
      case "paragraph":
        content.push(plainText(block.paragraph.rich_text));
        break;
      case "image": {
        const url = fileUrl(block.image);
        content.push(`<img src="${url}" height="200" />`);
        break;
      }
      default:
        throw new Error(`Unexpected block type: ${block.type} in ${tea.name}`);
    }
  }

  return `${generateChapterPropertiesMarkdown(tea)}

${content.length > 0 ? "---\n" : ""}
${content.join("\n\n")}
`;
}

const { topDisplayTeas, bottomDisplayTeas, pantryTeas } = await getTeaList();

// Generate the cover image SVG
await generateSvg(topDisplayTeas, bottomDisplayTeas);

const book = `---
title: Tea
creator: Tiger x Daphne
date: ${formatDate(new Date(), "yyyy-MM-dd")}
lang: en-US
cover-image: tea.png
css: assets/epub.css
...

${generateTeaTableHtml("Display (top)", topDisplayTeas)}

${generateTeaTableHtml("Display (bottom)", bottomDisplayTeas)}

${generateTeaTableHtml("Pantry", pantryTeas)}

${(
  await Promise.all(
    [...topDisplayTeas, ...bottomDisplayTeas, ...pantryTeas].map(
      generateChapterMarkdown
    )
  )
).join("\n\n")}`;
// Write the book file for pandoc
await Deno.writeTextFile("tea-list.txt", book);
