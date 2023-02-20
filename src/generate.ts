import { config } from "https://deno.land/std@0.147.0/dotenv/mod.ts";
import { format as formatDate } from "https://deno.land/std@0.177.0/datetime/format.ts";
import { NotionClient } from "./notion.ts";
import {
  formatTeaDatabasePage,
  FormattedTeaDatabasePage,
  generateSvg,
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

function generateTable(items: readonly FormattedTeaDatabasePage[]) {
  const columnLabels = {
    name: "Tea",
    caffine: " Caffeine ",
    temperature: " Temp",
    steepTime: " Steep time",
    serving: "Serving",
    type: "Type",
  };

  // Measure the longest string in each column
  const columnCharacterSizes: Record<
    keyof ReturnType<typeof formatTeaDatabasePage>,
    number
  > = {
    name: columnLabels.name.length,
    caffine: columnLabels.caffine.length,
    temperature: columnLabels.temperature.length,
    steepTime: columnLabels.steepTime.length,
    serving: columnLabels.serving.length,
    type: columnLabels.type.length,
  };
  for (const item of items) {
    for (const [key, value] of Object.entries(item)) {
      columnCharacterSizes[key as keyof typeof columnCharacterSizes] = Math.max(
        columnCharacterSizes[key as keyof typeof columnCharacterSizes],
        value.length
      );
    }
  }

  function formatRow(
    item: ReturnType<typeof formatTeaDatabasePage>,
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

const { topDisplayTeas, bottomDisplayTeas, pantryTeas } = await getTeaList();
await generateSvg(topDisplayTeas, bottomDisplayTeas);

const book = `---
title: Tea
creator: Tiger x Daphne
date: ${formatDate(new Date(), "yyyy-MM-dd")}
lang: en-US
...

Table: Display (top)

${generateTable(topDisplayTeas)}

Table: Display (bottom)

${generateTable(bottomDisplayTeas)}

Table: Pantry

${generateTable(pantryTeas)}`;
await Deno.writeTextFile("tea-list.txt", book);
