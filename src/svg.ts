import { CAFFEINE_LEVELS, FormattedTeaDatabasePage } from "./notion.ts";

/**
 * Create a set of SVG text that summarizes the given tea information.
 * @param tea Tea information to use.
 * @param position Where to position the group in the parent SVG element.
 * @returns SVG group element containing the tea information.
 */
function generateTeaGroup(tea: FormattedTeaDatabasePage, position: string) {
  const serving = tea.serving.replace(" / ", "/");
  const caffeine = CAFFEINE_LEVELS[tea.caffeine] ?? "";
  const name = tea.name;

  // Use condensed font if name is too long
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

/**
 * Create a set of SVG groups that summarizes all the given tea information.
 * @param teaList List of tea information to use. Should be 6 items or less.
 * @param position Where to position the group in the parent SVG element.
 * @returns SVG group element containing one group per tea.
 */
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

/**
 * Writes an SVG file to the current directory to use as an ebook cover.
 * The image contains a summary of the given tea information.
 *
 * The cover is generated from a template SVG file.
 * The template must contain the slot `<g id="tea" />` where the tea information will be inserted.
 *
 * @param topDisplayTeas Items displayed on the top half of the cover.
 * @param bottomDisplayTeas Items displayed on the bottom half of the cover.
 * @returns Promise that resolves once the cover image is written.
 */
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
