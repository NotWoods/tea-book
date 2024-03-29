import h from "vhtml";
import { CAFFEINE_LEVELS, FormattedTeaDatabasePage } from "./notion/types.ts";

/** String with x and y space separated values */
type TranslatePosition = `${number} ${number}`;

/**
 * Create a group of SVG text that summarizes the given tea information.
 * @param props.tea Tea information to use.
 * @param props.position Where to position the group in the parent SVG element.
 * @returns SVG group element containing the tea information.
 */
function TeaInfo(props: {
  tea: FormattedTeaDatabasePage;
  position: TranslatePosition;
}) {
  const { tea, position } = props;
  const serving = tea.serving.replace(" / ", "/");
  const caffeine = CAFFEINE_LEVELS[tea.caffeine] ?? "";

  const name = tea.name;
  // Use condensed font if name is too long
  let transform: string | undefined = undefined;
  if (name.length > 20) {
    transform = "scale(0.9 1)";
  }

  return (
    <g transform={`translate(${position})`}>
      {/* Name of the tea */}
      <text transform={transform} class="name">
        {name}
      </text>
      <line x1="0" y1="10" x2="220" y2="10" stroke="black" />
      {/* Tea type (ie black tea, green tea) and caffeine level */}
      <text y="30" class="desc">
        {tea.type}, {caffeine}
      </text>
      {/* Serving size, how long to steep the tea for, and what temperature water to use */}
      <text y="48" class="desc">
        {serving}, steep {tea.steepTime}, {tea.temperature}
      </text>
    </g>
  );
}

/**
 * Create a set of SVG groups that summarizes all the given tea information.
 * @param props.teaList List of tea information to use. Should be 6 items or less.
 * @param props.position Where to position the group in the parent SVG element.
 * @returns SVG group element containing one group per tea.
 */
function TeaDisplayGroup(props: {
  teaList: readonly FormattedTeaDatabasePage[];
  position: TranslatePosition;
}) {
  // Hardcoded positions to layout each tea in a 2x3 grid
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

/**
 * Creates an SVG file to the current directory to use as an ebook cover.
 * The image contains a summary of the given tea information.
 *
 * The cover is generated from a template SVG file.
 * The template must contain a closing `</svg>` tag where the tea information will be inserted.
 *
 * @param topDisplayTeas Items displayed on the top half of the cover.
 * @param bottomDisplayTeas Items displayed on the bottom half of the cover.
 * @returns Promise that resolves once the cover image is written.
 */
export async function generateSvgCover(
  topDisplayTeas: readonly FormattedTeaDatabasePage[],
  bottomDisplayTeas: readonly FormattedTeaDatabasePage[],
) {
  // Open template file
  const svgTemplate = await Deno.readTextFile(
    new URL("../assets/cover.svg", import.meta.url),
  );

  const closingTagIndex = svgTemplate.lastIndexOf("</svg");
  if (!closingTagIndex) {
    throw new Error("Could not find </svg> tag in template");
  }
  const templatePrefix = svgTemplate.slice(0, closingTagIndex);
  const templateSuffix = svgTemplate.slice(closingTagIndex);

  const generatedText: string = (
    <g id="tea">
      <TeaDisplayGroup teaList={topDisplayTeas} position="8 8" />
      <TeaDisplayGroup teaList={bottomDisplayTeas} position="8 360" />
    </g>
  );

  // Insert the generated content just before the closing </svg> tag
  return templatePrefix + generatedText + templateSuffix;
}
