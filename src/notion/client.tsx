import {
  Client,
  collectPaginatedAPI,
  isFullBlock,
  isFullPage,
} from "@notionhq/client";
import { load } from "std/dotenv/mod.ts";
import h from "vhtml";
import {
  formatTeaDatabasePage,
  type FormattedTeaDatabasePage,
} from "./format-page.ts";
import { fileUrl, plainText } from "./utils.ts";

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

  return teaList.filter(isFullPage).map(formatTeaDatabasePage);
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
        return plainText(block.paragraph.rich_text);
      case "image": {
        const url = fileUrl(block.image);
        return <img src={url} height="200" />;
      }
      default:
        throw new Error(`Unexpected block type: ${block.type} in ${tea.name}`);
    }
  });
}
