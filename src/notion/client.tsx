import {
  Client,
  collectPaginatedAPI,
  isFullBlock,
  isFullPage,
} from "@notionhq/client";
import { load } from "std/dotenv/mod.ts";
import type { FormattedTeaDatabasePage } from "./types.ts";
import { assertType, fileUrl, plainText } from "./utils.ts";

// Read .env file
const env = await load({
  restrictEnvAccessTo: ["NOTION_TOKEN", "NOTION_DB"],
  defaultsPath: "",
});
const notion = new Client({ auth: env["NOTION_TOKEN"] });

/**
 * Downloads all the rows in the tea database from Notion and formats them into plain objects.
 */
export async function fetchTeaDatabasePages() {
  const teaList = await collectPaginatedAPI(notion.databases.query, {
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

  return teaList
    .filter(isFullPage)
    .map(({ id, properties }): FormattedTeaDatabasePage => {
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
    });
}

/**
 * Returns lines from the given tea's page content in Notion.
 */
export async function fetchTeaPageContent(tea: FormattedTeaDatabasePage) {
  const blocks = await collectPaginatedAPI(notion.blocks.children.list, {
    block_id: tea.id,
  });

  return blocks.filter(isFullBlock).map((block) => {
    switch (block.type) {
      case "paragraph":
        // Convert text span objects into plain string
        return plainText(block.paragraph.rich_text);
      case "image": {
        // Convert image object into HTML image
        const url = fileUrl(block.image);
        return `<img src="${url}" height="200" />`;
      }
      default:
        throw new Error(`Unexpected block type: ${block.type} in ${tea.name}`);
    }
  });
}
