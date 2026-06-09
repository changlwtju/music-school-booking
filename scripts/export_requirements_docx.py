#!/usr/bin/env python3
"""Export the requirements Markdown document to a simple Word .docx file.

This intentionally uses only the Python standard library so the project can
regenerate the shareable Word copy without installing Pandoc or LibreOffice.
"""

from __future__ import annotations

import argparse
import html
import re
import zipfile
from pathlib import Path


NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def run_text(text: str, *, bold: bool = False, italic: bool = False, size: int | None = None) -> str:
    props = []
    if bold:
        props.append("<w:b/>")
    if italic:
        props.append("<w:i/>")
    if size:
        props.append(f'<w:sz w:val="{size}"/><w:szCs w:val="{size}"/>')
    props.append('<w:rFonts w:ascii="Microsoft YaHei" w:hAnsi="Microsoft YaHei" w:eastAsia="Microsoft YaHei"/>')
    prop_xml = f"<w:rPr>{''.join(props)}</w:rPr>" if props else ""
    preserve = ' xml:space="preserve"' if text[:1].isspace() or text[-1:].isspace() else ""
    return f"<w:r>{prop_xml}<w:t{preserve}>{esc(text)}</w:t></w:r>"


def paragraph(
    text: str = "",
    *,
    style: str | None = None,
    bold: bool = False,
    italic: bool = False,
    size: int | None = None,
) -> str:
    ppr = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ""
    return f"<w:p>{ppr}{run_text(text, bold=bold, italic=italic, size=size)}</w:p>"


def table(rows: list[list[str]]) -> str:
    if not rows:
        return ""
    col_count = max(len(row) for row in rows)
    grid = "".join('<w:gridCol w:w="2400"/>' for _ in range(col_count))
    tr_xml = []
    for row_index, row in enumerate(rows):
        cells = []
        for col_index in range(col_count):
            text = row[col_index].strip() if col_index < len(row) else ""
            shade = '<w:shd w:fill="F2F2F2"/>' if row_index == 0 else ""
            cell_props = (
                '<w:tcPr>'
                '<w:tcW w:w="2400" w:type="dxa"/>'
                '<w:tcBorders>'
                '<w:top w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>'
                '<w:left w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>'
                '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>'
                '<w:right w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>'
                '</w:tcBorders>'
                f"{shade}"
                "</w:tcPr>"
            )
            cells.append(f"<w:tc>{cell_props}{paragraph(text, bold=row_index == 0)}</w:tc>")
        tr_xml.append(f"<w:tr>{''.join(cells)}</w:tr>")
    tbl_props = (
        "<w:tblPr>"
        '<w:tblW w:w="0" w:type="auto"/>'
        '<w:tblBorders>'
        '<w:top w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>'
        '<w:left w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>'
        '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>'
        '<w:right w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>'
        '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>'
        '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>'
        '</w:tblBorders>'
        "</w:tblPr>"
    )
    return f"<w:tbl>{tbl_props}<w:tblGrid>{grid}</w:tblGrid>{''.join(tr_xml)}</w:tbl>"


def is_table_separator(line: str) -> bool:
    cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
    return bool(cells) and all(re.fullmatch(r":?-{3,}:?", cell or "") for cell in cells)


def parse_table(lines: list[str], start: int) -> tuple[str, int]:
    raw_rows = []
    index = start
    while index < len(lines) and lines[index].strip().startswith("|"):
        if not is_table_separator(lines[index]):
            raw_rows.append([cell.strip() for cell in lines[index].strip().strip("|").split("|")])
        index += 1
    return table(raw_rows), index


def markdown_to_body(markdown: str) -> str:
    lines = markdown.splitlines()
    blocks: list[str] = []
    index = 0
    while index < len(lines):
        line = lines[index].rstrip()
        stripped = line.strip()

        if not stripped:
            index += 1
            continue

        if stripped.startswith("|"):
            tbl, index = parse_table(lines, index)
            blocks.append(tbl)
            continue

        heading = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if heading:
            level = min(len(heading.group(1)), 3)
            text = heading.group(2).strip()
            size = {1: 32, 2: 26, 3: 22}[level]
            blocks.append(paragraph(text, style=f"Heading{level}", bold=True, size=size))
            index += 1
            continue

        if stripped.startswith(">"):
            text = stripped.lstrip(">").strip().replace("`", "")
            blocks.append(paragraph(text, style="Quote", italic=True))
            index += 1
            continue

        unordered = re.match(r"^[-*]\s+(.*)$", stripped)
        if unordered:
            blocks.append(paragraph(f"• {unordered.group(1).strip()}"))
            index += 1
            continue

        ordered = re.match(r"^(\d+\.)\s+(.*)$", stripped)
        if ordered:
            blocks.append(paragraph(f"{ordered.group(1)} {ordered.group(2).strip()}"))
            index += 1
            continue

        blocks.append(paragraph(stripped.replace("`", "")))
        index += 1

    return "".join(blocks)


def content_types() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
"""


def package_rels() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
"""


def document_rels() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
"""


def styles_xml() -> str:
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="{NS_W}">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:rFonts w:ascii="Microsoft YaHei" w:hAnsi="Microsoft YaHei" w:eastAsia="Microsoft YaHei"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="220" w:after="100"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="180" w:after="80"/></w:pPr><w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:rPr><w:i/><w:color w:val="666666"/></w:rPr></w:style>
</w:styles>
"""


def document_xml(body: str) -> str:
    sect = (
        "<w:sectPr>"
        '<w:pgSz w:w="11906" w:h="16838"/>'
        '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>'
        "</w:sectPr>"
    )
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="{NS_W}" xmlns:r="{NS_R}">
  <w:body>{body}{sect}</w:body>
</w:document>
"""


def core_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>琴行约课小程序需求文档</dc:title>
  <dc:creator>Codex</dc:creator>
</cp:coreProperties>
"""


def app_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex Markdown Exporter</Application>
</Properties>
"""


def export_docx(source: Path, output: Path) -> None:
    markdown = source.read_text(encoding="utf-8")
    body = markdown_to_body(markdown)
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as docx:
        docx.writestr("[Content_Types].xml", content_types())
        docx.writestr("_rels/.rels", package_rels())
        docx.writestr("word/_rels/document.xml.rels", document_rels())
        docx.writestr("word/document.xml", document_xml(body))
        docx.writestr("word/styles.xml", styles_xml())
        docx.writestr("docProps/core.xml", core_xml())
        docx.writestr("docProps/app.xml", app_xml())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", nargs="?", default="docs/requirements/product-requirements-draft.md")
    parser.add_argument("output", nargs="?", default="docs/requirements/product-requirements-draft.docx")
    args = parser.parse_args()

    export_docx(Path(args.source), Path(args.output))
    print(f"Generated {args.output}")


if __name__ == "__main__":
    main()
