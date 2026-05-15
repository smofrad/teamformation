from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from pathlib import Path
from zipfile import ZipFile


NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
MONTH_ORDER = [
    ("Jan", 1),
    ("Feb", 2),
    ("Mar", 3),
    ("Apr", 4),
    ("Maj", 5),
    ("Juni", 6),
    ("Jul", 7),
    ("Aug", 8),
    ("Sep", 9),
    ("Okt", 10),
    ("Nov", 11),
    ("Dec", 12),
]


def col_to_num(col: str) -> int:
    value = 0
    for char in col:
        if char.isalpha():
            value = value * 26 + ord(char.upper()) - 64
    return value


def extract_cell_value(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    value = cell.find("a:v", NS)

    if cell_type == "s" and value is not None:
        return shared_strings[int(value.text or "0")].strip()

    if cell_type == "inlineStr":
        inline = cell.find("a:is", NS)
        if inline is None:
            return ""
        return "".join((node.text or "") for node in inline.findall(".//a:t", NS)).strip()

    if value is not None and value.text is not None:
        return value.text.strip()

    return ""


def load_shared_strings(zip_file: ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in zip_file.namelist():
        return []

    root = ET.fromstring(zip_file.read("xl/sharedStrings.xml"))
    strings: list[str] = []
    for item in root.findall("a:si", NS):
        direct_text = item.find("a:t", NS)
        if direct_text is not None:
            strings.append((direct_text.text or "").strip())
            continue

        parts = [(node.text or "") for node in item.findall(".//a:t", NS)]
        strings.append("".join(parts).strip())
    return strings


def main() -> None:
    source = Path("/Users/sammofrad/Downloads/Årshjul ny.xlsx")
    output = Path("build/sheet2_analysis.json")
    output.parent.mkdir(parents=True, exist_ok=True)

    with ZipFile(source) as zip_file:
        shared_strings = load_shared_strings(zip_file)
        sheet_root = ET.fromstring(zip_file.read("xl/worksheets/sheet2.xml"))

    records: list[dict[str, object]] = []

    for row in sheet_root.find("a:sheetData", NS).findall("a:row", NS)[1:]:
        row_values: dict[int, str] = {}
        for cell in row.findall("a:c", NS):
            ref = cell.attrib["r"]
            column = re.sub(r"\d", "", ref)
            row_values[col_to_num(column)] = extract_cell_value(cell, shared_strings)

        month = row_values.get(1, "")
        month_number = row_values.get(2, "")
        method = row_values.get(3, "")
        activity = row_values.get(4, "")
        value = row_values.get(5, "")

        if not (month and month_number.isdigit() and method and activity):
            continue

        records.append(
            {
                "month": month,
                "monthNumber": int(month_number),
                "method": method,
                "activity": activity,
                "value": int(value) if value.isdigit() else 1,
            }
        )

    month_counts = Counter()
    method_counts = Counter()
    matrix = defaultdict(Counter)

    for record in records:
        month = record["month"]
        method = record["method"]
        value = int(record["value"])
        month_counts[month] += value
        method_counts[method] += value
        matrix[method][month] += value

    summary = {
        "records": records,
        "monthOrder": [month for month, _ in MONTH_ORDER],
        "monthCounts": [{"month": month, "count": month_counts[month]} for month, _ in MONTH_ORDER],
        "methodCounts": [
            {"method": method, "count": count} for method, count in method_counts.most_common()
        ],
        "methodMonthMatrix": [
            {
                "method": method,
                **{month: matrix[method][month] for month, _ in MONTH_ORDER},
            }
            for method, _ in method_counts.most_common()
        ],
    }

    output.write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"Wrote {output} with {len(records)} activity rows")


if __name__ == "__main__":
    main()
