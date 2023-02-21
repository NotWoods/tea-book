## Generate summary image

```powershell
deno run --allow-net --allow-env --allow-read --allow-write .\src\generate.ts
inkscape --export-type="png" tea.svg
```

## Generate details ebook

```powershell
deno run --allow-net --allow-env --allow-read --allow-write .\src\generate.ts
pandoc tea-list.txt -o tea.epub
```
