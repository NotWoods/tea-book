import h from "vhtml";
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
 * @param caption The caption to display above the table.
 * @param teaList List of tea information to use. Each item will be a row in the table.
 */
export function generateTeaTableHtml(
  caption: string,
  teaList: readonly FormattedTeaDatabasePage[],
  startingIndex: number,
) {
  return (
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th class="cell-caffeine">Caffeine</th>
          <th class="cell-temperature">Temp</th>
          <th class="cell-steep-time">Steep time</th>
          <th class="cell-serving">Serving</th>
          <th class="cell-type">Type</th>
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
                <th class="cell-name" colspan={5}>
                  <a href={chapterLink}>{tea.name}</a>
                </th>
              </tr>
              <tr>
                <td class="cell-caffeine">
                  {changeCaffeineCharacters(tea.caffeine)}
                </td>
                <td class="cell-temperature">{tea.temperature}</td>
                <td class="cell-steep-time">{tea.steepTime}</td>
                <td class="cell-serving">{tea.serving}</td>
                <td class="cell-type">{tea.type}</td>
              </tr>
            </>
          );
        })}
      </tbody>
    </table>
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
