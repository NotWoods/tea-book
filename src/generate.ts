import { config } from "https://deno.land/std@0.147.0/dotenv/mod.ts";
import { format as formatDate } from "https://deno.land/std@0.177.0/datetime/format.ts";
import { DatabasePage, NotionClient, RichTextItemResponse } from "./notion.ts";

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

  const topDisplayTeas: DatabasePage[] = [];
  const bottomDisplayTeas: DatabasePage[] = [];
  const pantryTeas: DatabasePage[] = [];
  for await (const page of teaListIterator) {
    if (page.properties.Location.type !== "multi_select") {
      throw new Error(
        `Expected Location to be a multi_select, got ${page.properties.Location.type}`
      );
    }
    const location = page.properties.Location.multi_select
      .map(({ name }) => name)
      .find((name) => name.startsWith("Display"));

    if (location === "Display (top)") {
      topDisplayTeas.push(page);
    } else if (location === "Display (bottom)") {
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

function plainText(richText: readonly RichTextItemResponse[]) {
  return richText.map((text) => text.plain_text).join("");
}

function formatTeaDatabasePage({ properties }: DatabasePage) {
  if (properties.Name.type !== "title") {
    throw new Error(`Expected Name to be a title, got ${properties.Name.type}`);
  } else if (properties.Caffeine.type !== "select") {
    throw new Error(
      `Expected Caffeine to be a select, got ${properties.Caffeine.type}`
    );
  } else if (properties.Temperature.type !== "formula") {
    throw new Error(
      `Expected Temperature to be a formula, got ${properties.Temperature.type}`
    );
  } else if (properties["Steep time"].type !== "formula") {
    throw new Error(
      `Expected Steep time to be a formula, got ${properties["Steep time"].type}`
    );
  } else if (properties.Serving.type !== "rich_text") {
    throw new Error(
      `Expected Serving to be a rich_text, got ${properties.Serving.type}`
    );
  } else if (properties.Type.type !== "select") {
    throw new Error(
      `Expected Type to be a select, got ${properties.Type.type}`
    );
  }

  return {
    name: plainText(properties.Name.title),
    caffine: properties.Caffeine.select?.name ?? "",
    temperature: properties.Temperature.formula.string,
    steepTime: properties["Steep time"].formula.string,
    serving: plainText(properties.Serving.rich_text),
    type: properties.Type.select?.name ?? "",
  };
}

function generateTable(teaList: readonly DatabasePage[]) {
  const items = teaList.map(formatTeaDatabasePage);

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
const date = new Date();

const book = `---
title: Tea
creator: Tiger x Daphne
date: ${formatDate(date, "yyyy-MM-dd")}
lang: en-US
...

Table: Display (top)

${generateTable(topDisplayTeas)}

Table: Display (bottom)

${generateTable(bottomDisplayTeas)}

Table: Pantry

${generateTable(pantryTeas)}`;
await Deno.writeTextFile("tea-list.txt", book);
