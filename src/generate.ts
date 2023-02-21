import { config } from "https://deno.land/std@0.147.0/dotenv/mod.ts";
import { format as formatDate } from "https://deno.land/std@0.177.0/datetime/format.ts";
import { fileUrl, NotionClient } from "./notion.ts";
import {
  caffeineLevels,
  formatTeaDatabasePage,
  FormattedTeaDatabasePage,
  generateSvg,
  plainText,
} from "./svg.ts";

const configData = await config({ safe: true, defaults: undefined });
const notionApi = new NotionClient(configData["NOTION_TOKEN"]);

async function getTeaList() {
  const teaListIterator = notionApi.queryDatabase(configData["NOTION_DB"], {
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
    if (page.properties.Location.type !== "multi_select") {
      throw new Error(
        `Expected Location to be a multi_select, got ${page.properties.Location.type}`
      );
    }
    const location = page.properties.Location.multi_select
      .map(({ name }) => name)
      .find((name) => name.startsWith("Display"));

    const formatted = formatTeaDatabasePage(page);
    if (location === "Display (top)") {
      topDisplayTeas.push(formatted);
    } else if (location === "Display (bottom)") {
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

function objectKeys<Key extends PropertyKey>(obj: Record<Key, unknown>): Key[] {
  return Object.keys(obj) as Key[];
}

function generateTable(items: readonly FormattedTeaDatabasePage[]) {
  const columnLabels = {
    name: "Tea",
    caffine: " Caffeine ",
    temperature: " Temp",
    steepTime: " Steep time",
    serving: "Serving",
    type: "Type",
  } satisfies Partial<Record<keyof FormattedTeaDatabasePage, string>>;

  // Measure the longest string in each column
  const columnCharacterSizes: Record<keyof typeof columnLabels, number> = {
    name: columnLabels.name.length,
    caffine: columnLabels.caffine.length,
    temperature: columnLabels.temperature.length,
    steepTime: columnLabels.steepTime.length,
    serving: columnLabels.serving.length,
    type: columnLabels.type.length,
  };
  for (const item of items) {
    for (const column of objectKeys(columnLabels)) {
      columnCharacterSizes[column] = Math.max(
        columnCharacterSizes[column],
        item[column].length
      );
    }
  }

  function formatRow(
    item: Pick<FormattedTeaDatabasePage, keyof typeof columnLabels>,
    padString?: string
  ) {
    return [
      item.name.padEnd(columnCharacterSizes.name, padString),
      "   ",
      item.caffine.padEnd(columnCharacterSizes.caffine, padString),
      item.temperature.padStart(columnCharacterSizes.temperature, padString),
      item.steepTime.padStart(columnCharacterSizes.steepTime, padString),
      item.serving.padEnd(columnCharacterSizes.serving, padString),
      item.type.padEnd(columnCharacterSizes.type, padString),
    ].join(" ");
  }

  // Generate the table
  const headerRow = formatRow(columnLabels);
  const dividerRow = formatRow(
    {
      name: "",
      caffine: "",
      temperature: "",
      steepTime: "",
      serving: "",
      type: "",
    },
    "-"
  );
  const rows = items.map((item) => formatRow(item));
  return [headerRow, dividerRow, ...rows].join("\n");
}

async function generateChapter(tea: FormattedTeaDatabasePage) {
  const serving = tea.serving.replace(" / ", "/");
  const caffeine = caffeineLevels[tea.caffine] ?? "";

  const content: string[] = [];
  for await (const block of notionApi.blockChildren(tea.id)) {
    switch (block.type) {
      case "paragraph":
        content.push(plainText(block.paragraph.rich_text));
        break;
      case "image": {
        const url = fileUrl(block.image);
        content.push(`![${tea.name}](${url})`);
        break;
      }
      default:
        throw new Error(`Unexpected block type: ${block.type} in ${tea.name}`);
    }
  }

  return `
# ${tea.name}

${tea.type}, ${caffeine} <br />
${serving}, steep ${tea.steepTime}, ${tea.temperature}

${tea.location.join(", ")}

${content.length > 0 ? "---\n" : ""}
${content.join("\n\n")}
`;
}

const { topDisplayTeas, bottomDisplayTeas, pantryTeas } = await getTeaList();
await generateSvg(topDisplayTeas, bottomDisplayTeas);

const book = `---
title: Tea
creator: Tiger x Daphne
date: ${formatDate(new Date(), "yyyy-MM-dd")}
lang: en-US
cover-image: tea.png
...

Table: Display (top)

${generateTable(topDisplayTeas)}

Table: Display (bottom)

${generateTable(bottomDisplayTeas)}

Table: Pantry

${generateTable(pantryTeas)}

${(
  await Promise.all(
    [...topDisplayTeas, ...bottomDisplayTeas, ...pantryTeas].map(
      generateChapter
    )
  )
).join("\n\n")}`;
await Deno.writeTextFile("tea-list.txt", book);
