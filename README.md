## Generate summary image

```powershell
deno run --allow-net --allow-env --allow-read --allow-write .\src\generate.ts
inkscape --export-type="png" tea.svg
```

## Generate details ebook

```powershell
deno run --allow-net --allow-env --allow-read --allow-write .\src\generate.ts
pandoc tea-list.txt -o tea.epub --epub-title-page=false
```

Validate result with https://epub-reader.online

https://www.nook.com/services/cms/doc/nookpress/us/en_us/faq/formatting-guidelines-epub.html
