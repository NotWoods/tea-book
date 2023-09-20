import { renderToReadableStream } from "react-dom/server";
import { CAFFEINE_LEVELS, FormattedTeaDatabasePage } from "./notion/types.ts";

/**
 * Nook e-readers only support the WGL character set,
 * so we need to replace the stars with something else.
 *
 * @see https://www.nook.com/services/cms/doc/nookpress/us/en_us/faq/formatting-guidelines-epub.html
 * @see https://en.wikipedia.org/wiki/Windows_Glyph_List_4
 *
 * @param level The caffeine level to replace characters in.
 * @returns The caffeine level with the characters replaced.
 */
function changeCaffeineCharacters(level: string) {
  return level.replaceAll("★", "●").replaceAll("☆", "○");
}

/**
 * Creates an HTML table to display the given tea information.
 * @param props.caption The caption to display above the table.
 * @param props.teaList List of tea information to use. Each item will be a row in the table.
 */
export function TeaTable(
  props: {
    caption: string;
    teaList: readonly FormattedTeaDatabasePage[];
    startingIndex: number;
  },
) {
  const { caption, teaList, startingIndex } = props;
  return (
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th className="cell-caffeine">Caffeine</th>
          <th className="cell-temperature">Temp</th>
          <th className="cell-steep-time">Steep time</th>
          <th className="cell-serving">Serving</th>
          <th className="cell-type">Type</th>
        </tr>
      </thead>
      <tbody>
        {teaList.map((tea, index) => {
          const chapterLink = `ch${
            String(index + startingIndex + 1).padStart(3, "0")
          }.xhtml`;
          return (
            <>
              <tr>
                <th className="cell-name" colSpan={5}>
                  <a href={chapterLink}>{tea.name}</a>
                </th>
              </tr>
              <tr>
                <td className="cell-caffeine">
                  {changeCaffeineCharacters(tea.caffeine)}
                </td>
                <td className="cell-temperature">{tea.temperature}</td>
                <td className="cell-steep-time">{tea.steepTime}</td>
                <td className="cell-serving">{tea.serving}</td>
                <td className="cell-type">{tea.type}</td>
              </tr>
            </>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * Creates an HTML table to display the given tea information.
 * @param caption The caption to display above the table.
 * @param teaList List of tea information to use. Each item will be a row in the table.
 */
export function generateTeaTableHtml(
  caption: string,
  teaList: readonly FormattedTeaDatabasePage[],
  startingIndex: number,
): Promise<ReadableStream<string>> {
  return renderToReadableStream(
    <TeaTable
      caption={caption}
      teaList={teaList}
      startingIndex={startingIndex}
    />,
  );
}

const listFormat = new Intl.ListFormat("en", {
  style: "long",
  type: "conjunction",
});
/**
 * Creates markdown to represent the given tea information.
 * This should be displayed above additional description text.
 */
export function generateChapterPropertiesMarkdown(
  tea: FormattedTeaDatabasePage,
) {
  return `
# ${tea.name} {#ch${tea.id}}

- ${tea.type}
- ${changeCaffeineCharacters(tea.caffeine)} (${
    CAFFEINE_LEVELS[tea.caffeine] ?? "unknown caffeine level"
  })
- Boil water to ${tea.temperature}
- Serve ${tea.serving}
- Steep ${tea.steepTime}

_Stored in ${listFormat.format(tea.location)}_

`;
}
