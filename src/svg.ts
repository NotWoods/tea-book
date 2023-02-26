import type { PageObjectResponse } from "npm:@notionhq/client/build/src/api-endpoints";
import { assertType, plainText } from "./notion.ts";

export function formatTeaDatabasePage({ id, properties }: PageObjectResponse) {
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
    caffine: properties.Caffeine.select?.name ?? "",
    temperature: properties.Temperature.formula.string ?? "",
    steepTime: properties["Steep time"].formula.string ?? "",
    serving: plainText(properties.Serving.rich_text),
    type: properties.Type.select?.name ?? "",
    location: properties.Location.multi_select.map(({ name }) => name),
  };
}

export type FormattedTeaDatabasePage = ReturnType<typeof formatTeaDatabasePage>;

export const caffeineLevels: Partial<Record<string, string>> = {
  "☆☆☆": "decaf",
  "★☆☆": "low caffeine",
  "★★☆": "moderate caffeine",
  "★★★": "high caffeine",
};

function generateTeaGroup(tea: FormattedTeaDatabasePage, position: string) {
  const serving = tea.serving.replace(" / ", "/");
  const caffeine = caffeineLevels[tea.caffine] ?? "";
  const name = tea.name;
  let transform = "";
  if (name.length > 20) {
    transform += "scale(0.9 1)";
  }

  return `<g transform="translate(${position})">
  <text transform="${transform}" class="name">${name}</text>
  <line x1="0" y1="10" x2="220" y2="10" stroke="black" />
  <text y="30" class="desc">${tea.type}, ${caffeine}</text>
  <text y="48" class="desc">${serving}, steep ${tea.steepTime}, ${tea.temperature}</text>
</g>`;
}

function generateDisplayGroup(
  teaList: readonly FormattedTeaDatabasePage[],
  position: `${number} ${number}`
) {
  const positions = [
    "30 85",
    "30 180",
    "30 275",
    "322 85",
    "322 180",
    "322 275",
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
    new URL("../assets/cover.svg", import.meta.url)
  );

  const topGroup = generateDisplayGroup(topDisplayTeas, "8 8");
  const bottomGroup = generateDisplayGroup(bottomDisplayTeas, "8 360");
  const groups = `<g id="tea">${[topGroup, bottomGroup].join("")}</g>`;

  const svg = svgTemplate.replace(`<g id="tea" />`, groups);
  if (svg === svgTemplate) {
    throw new Error("Could not find tea group marker in template");
  }

  await Deno.writeTextFile("tea.svg", svg);
}
