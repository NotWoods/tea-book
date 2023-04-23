import h from "vhtml";
import { CAFFEINE_LEVELS, FormattedTeaDatabasePage } from "./notion/types.ts";

/** String with x and y space separated values */
type TranslatePosition = `${number} ${number}`;

/**
 * Create a group of SVG text that summarizes the given tea information.
 * @param tea Tea information to use.
 * @param position Where to position the group in the parent SVG element.
 * @returns SVG group element containing the tea information.
 */
function TeaInfo(props: {
  tea: FormattedTeaDatabasePage;
  position: TranslatePosition;
}) {
  const { tea } = props;
  const serving = tea.serving.replace(" / ", "/");
  const caffeine = CAFFEINE_LEVELS[tea.caffeine] ?? "";
  const name = tea.name;

  // Use condensed font if name is too long
  let transform: string | undefined = undefined;
  if (name.length > 20) {
    transform = "scale(0.9 1)";
  }

  return (
    <g transform={`translate(${props.position})`}>
      <text transform={transform} class="name">
        {name}
      </text>
      <line x1="0" y1="10" x2="220" y2="10" stroke="black" />
      <text y="30" class="desc">
        {tea.type}, {caffeine}
      </text>
      <text y="48" class="desc">
        {serving}, steep {tea.steepTime}, {tea.temperature}
      </text>
    </g>
  );
}

/**
 * Create a set of SVG groups that summarizes all the given tea information.
 * @param teaList List of tea information to use. Should be 6 items or less.
 * @param position Where to position the group in the parent SVG element.
 * @returns SVG group element containing one group per tea.
 */
function TeaDisplayGroup(props: {
  teaList: readonly FormattedTeaDatabasePage[];
  position: TranslatePosition;
}) {
  const positions = [
    "30 85",
    "30 180",
    "30 275",
    "322 85",
    "322 180",
    "322 275",
  ] as const;

  return (
    <g transform={`translate(${props.position})`}>
      {props.teaList.map((tea, index) => (
        <TeaInfo tea={tea} position={positions[index]} />
      ))}
    </g>
  );
}

/** Matches <slot /> and <slot/> */
const SLOT_REGEX = /<slot\s*\/>/;

/**
 * Creates an SVG file to the current directory to use as an ebook cover.
 * The image contains a summary of the given tea information.
 *
 * The cover is generated from a template SVG file.
 * The template must contain the element `<slot />` where the tea information will be inserted.
 *
 * @param topDisplayTeas Items displayed on the top half of the cover.
 * @param bottomDisplayTeas Items displayed on the bottom half of the cover.
 * @returns Promise that resolves once the cover image is written.
 */
export async function generateSvg(
  topDisplayTeas: readonly FormattedTeaDatabasePage[],
  bottomDisplayTeas: readonly FormattedTeaDatabasePage[],
) {
  // Open template file
  const svgTemplate = await Deno.readTextFile(
    new URL("../assets/cover.svg", import.meta.url),
  );

  const groups: string = (
    <g id="tea">
      <TeaDisplayGroup teaList={topDisplayTeas} position="8 8" />
      <TeaDisplayGroup teaList={bottomDisplayTeas} position="8 360" />
    </g>
  );

  const svg = svgTemplate.replace(SLOT_REGEX, groups);
  if (svg === svgTemplate) {
    throw new Error("Could not find <slot /> marker element in template");
  }

  return svg;
}
