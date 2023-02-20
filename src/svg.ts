import { DatabasePage, RichTextItemResponse } from "./notion.ts";

function plainText(richText: readonly RichTextItemResponse[]) {
  return richText.map((text) => text.plain_text).join("");
}
export function formatTeaDatabasePage({ properties }: DatabasePage) {
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

export type FormattedTeaDatabasePage = ReturnType<typeof formatTeaDatabasePage>;

const caffeineLevels: Partial<Record<string, string>> = {
  "☆☆☆": "decaf",
  "★☆☆": "low caffeine",
  "★★☆": "moderate caffeine",
  "★★★": "high caffeine",
};

function generateTeaGroup(tea: FormattedTeaDatabasePage, position: string) {
  const serving = tea.serving.replace(" / ", "/");
  const caffeine = caffeineLevels[tea.caffine] ?? "";

  return `<g transform="translate(${position})">
  <text style="font-size: 24px; font-weight: bold">${tea.name}</text>
  <line x1="0" y1="10" x2="220" y2="10" stroke="black" />
  <text y="30" style="font-size: 16px">${tea.type}, ${caffeine}</text>
  <text y="48" style="font-size: 16px">${serving}, steep ${tea.steepTime}, ${tea.temperature}</text>
</g>`;
}

function generateDisplayGroup(
  teaList: readonly FormattedTeaDatabasePage[],
  position: string
) {
  const positions = [
    "30, 85",
    "30, 180",
    "30, 275",
    "322, 85",
    "322, 180",
    "322, 275",
  ];

  return `<g transform="translate(${position})">
  ${teaList
    .map((tea, index) => generateTeaGroup(tea, positions[index]))
    .join("")}
</g>`;
}

export async function generateSvg(
  topDisplayTeas: readonly FormattedTeaDatabasePage[],
  bottomDisplayTeas: readonly FormattedTeaDatabasePage[]
) {
  const svgTemplate = await Deno.readTextFile(
    new URL("./cover.svg", import.meta.url)
  );

  const topGroup = generateDisplayGroup(topDisplayTeas, "8, 8");
  const bottomGroup = generateDisplayGroup(bottomDisplayTeas, "8, 386");
  const groups = `<g id="tea">${[topGroup, bottomGroup].join("")}</g>`;

  const svg = svgTemplate.replace(`<g id="tea" />`, groups);
  if (svg === svgTemplate) {
    throw new Error("Could not find tea group marker in template");
  }

  await Deno.writeTextFile("tea.svg", svg);
}
