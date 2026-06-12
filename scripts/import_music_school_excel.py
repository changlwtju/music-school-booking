#!/usr/bin/env python3
"""Import music school campus, teacher, and student data from the Excel template.

The script intentionally uses only Python's standard library so it can run on the
NAS, the Tencent Cloud server, and local development machines without installing
extra packages.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "docs/data-templates/music-school-import/music-school-import-current-yidian.xlsx"
DEFAULT_DATABASE = ROOT / "backend/data/spinach-music.json"

SPREADSHEET_NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"


def stable_id(prefix: str, *parts: Any) -> str:
    raw = "|".join(str(part or "").strip() for part in parts)
    digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:12]
    return f"{prefix}-{digest}"


def clean(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if text.endswith(".0") and text[:-2].isdigit():
        text = text[:-2]
    return text


def col_letters(ref: str) -> str:
    return "".join(char for char in ref if char.isalpha())


def col_index(letters: str) -> int:
    index = 0
    for char in letters.upper():
        index = index * 26 + ord(char) - 64
    return max(0, index - 1)


def excel_date(value: str) -> str:
    text = clean(value)
    if not text:
        return ""
    if re.fullmatch(r"\d{4}-\d{1,2}-\d{1,2}", text):
        year, month, day = text.split("-")
        return f"{int(year):04d}-{int(month):02d}-{int(day):02d}"
    if re.fullmatch(r"\d+(\.\d+)?", text):
        # Excel's 1900 date system, with the conventional leap-year offset.
        date = datetime(1899, 12, 30) + timedelta(days=float(text))
        return date.strftime("%Y-%m-%d")
    return text


def number(value: str, default: int | None = 0) -> int | None:
    text = clean(value)
    if not text:
        return default
    try:
        return int(float(text))
    except ValueError:
        return default


def split_courses(value: str) -> list[str]:
    return [item.strip() for item in re.split(r"[,，、/]", clean(value)) if item.strip()]


def status_student(value: str) -> str:
    text = clean(value)
    if text in {"停用", "已停用"}:
        return "inactive"
    if text in {"已到期", "到期"}:
        return "expired"
    if text == "体验课":
        return "trial"
    return "active"


def status_teacher(value: str) -> str:
    text = clean(value)
    if text in {"离职", "已离职"}:
        return "left"
    if text in {"停用", "已停用"}:
        return "inactive"
    return "active"


def payment_status(value: str) -> str:
    text = clean(value)
    if text in {"分期", "未付清"}:
        return "installment"
    if text == "体验课":
        return "trial"
    if text in {"待确认", "未知"}:
        return "pending"
    return "paid"


def contract_mode(value: str) -> str:
    return "book" if clean(value) == "按册学习" else "fixed20"


def read_xlsx(path: Path) -> dict[str, list[dict[str, str]]]:
    with ZipFile(path) as archive:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root.findall("a:si", SPREADSHEET_NS):
                shared_strings.append("".join(node.text or "" for node in item.findall(".//a:t", SPREADSHEET_NS)))

        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        rel_map = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels.findall(f"{{{REL_NS}}}Relationship")}

        sheets: dict[str, list[list[str]]] = {}
        for sheet in workbook.find("a:sheets", SPREADSHEET_NS):
            name = sheet.attrib["name"]
            rel_id = sheet.attrib[f"{{{SPREADSHEET_NS['r']}}}id"]
            target = rel_map[rel_id]
            worksheet_path = "xl/" + target.lstrip("/") if not target.startswith("xl/") else target
            root = ET.fromstring(archive.read(worksheet_path))
            rows: list[list[str]] = []
            for row in root.findall(".//a:sheetData/a:row", SPREADSHEET_NS):
                values: list[str] = []
                for cell in row.findall("a:c", SPREADSHEET_NS):
                    idx = col_index(col_letters(cell.attrib.get("r", "A")))
                    while len(values) <= idx:
                        values.append("")
                    values[idx] = read_cell(cell, shared_strings)
                rows.append(values)
            sheets[name] = rows

    return {name: rows_to_dicts(rows) for name, rows in sheets.items()}


def read_cell(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        return clean("".join(node.text or "" for node in cell.findall(".//a:t", SPREADSHEET_NS)))
    value = cell.find("a:v", SPREADSHEET_NS)
    if value is None:
        return ""
    text = value.text or ""
    if cell_type == "s":
        return clean(shared_strings[int(text)] if text else "")
    return clean(text)


def rows_to_dicts(rows: list[list[str]]) -> list[dict[str, str]]:
    rows = [row for row in rows if any(clean(value) for value in row)]
    if not rows:
        return []
    headers = [clean(value) for value in rows[0]]
    result: list[dict[str, str]] = []
    for row in rows[1:]:
        item = {headers[index]: clean(row[index] if index < len(row) else "") for index in range(len(headers)) if headers[index]}
        if any(item.values()):
            result.append(item)
    return result


def empty_store() -> dict[str, Any]:
    return {
        "courses": [
            {"id": "course-piano", "name": "钢琴", "icon": "🎹", "iconClass": "piano", "desc": "启蒙、考级与作品练习"},
            {"id": "course-guitar", "name": "吉他", "icon": "🎸", "iconClass": "guitar", "desc": "弹唱、和弦与节奏训练"},
            {"id": "course-drum", "name": "架子鼓", "icon": "🥁", "iconClass": "drum", "desc": "节拍、律动与乐队配合"},
        ],
        "campuses": [],
        "users": [{"id": "user-admin", "openid": "demo-admin", "name": "管理员", "phone": "13800000000", "role": "admin", "status": "active"}],
        "students": [],
        "teachers": [],
        "contracts": [],
        "bindings": [],
        "appointments": [],
        "teacherAvailability": [],
        "lessonRecords": [],
        "adminLogs": [],
    }


def load_store(path: Path) -> dict[str, Any]:
    if path.exists():
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)
    return empty_store()


def ensure_collections(store: dict[str, Any]) -> None:
    fresh = empty_store()
    for key, value in fresh.items():
        store.setdefault(key, copy.deepcopy(value))


def upsert_by_id(items: list[dict[str, Any]], item: dict[str, Any]) -> bool:
    for existing in items:
        if existing.get("id") == item["id"]:
            existing.update(item)
            return False
    items.append(item)
    return True


def import_data(rows: dict[str, list[dict[str, str]]], store: dict[str, Any]) -> dict[str, int | list[str]]:
    ensure_collections(store)
    stats = {
        "campuses_created": 0,
        "campuses_updated": 0,
        "teachers_created": 0,
        "teachers_updated": 0,
        "students_created": 0,
        "students_updated": 0,
        "contracts_created": 0,
        "contracts_updated": 0,
        "bindings_created": 0,
        "bindings_updated": 0,
        "warnings": [],
    }

    campus_alias: dict[str, str] = {}
    for index, row in enumerate(rows.get("校区信息", []), start=2):
        name = clean(row.get("校区名称"))
        short = clean(row.get("校区简称"))
        if not name or not short:
            stats["warnings"].append(f"校区信息第 {index} 行缺少校区名称或简称，已跳过")
            continue
        campus_id = stable_id("campus", short or name)
        campus_alias[short] = campus_id
        campus = {
            "id": campus_id,
            "name": name,
            "short_name": short,
            "address": clean(row.get("校区地址")),
            "phone": clean(row.get("联系电话")) or "请联系校区老师",
            "latitude": 0,
            "longitude": 0,
            "hours": clean(row.get("营业时间")) or "周二至周日 12:00-20:00",
            "image": "/assets/brand/brand-display.png",
            "release_time": "20:00",
            "status": "active",
            "sort_order": len(campus_alias),
            "desc": clean(row.get("备注")),
        }
        created = upsert_by_id(store["campuses"], campus)
        stats["campuses_created" if created else "campuses_updated"] += 1

    teacher_by_key: dict[tuple[str, str], str] = {}
    for index, row in enumerate(rows.get("老师信息", []), start=2):
        campus_key = clean(row.get("所属校区"))
        teacher_name = clean(row.get("老师姓名"))
        campus_id = campus_alias.get(campus_key)
        if not campus_id or not teacher_name:
            stats["warnings"].append(f"老师信息第 {index} 行缺少所属校区或老师姓名，已跳过")
            continue
        teacher_id = stable_id("teacher", campus_id, teacher_name)
        courses = split_courses(row.get("可授课程")) or split_courses(row.get("主授课程"))
        teacher_by_key[(campus_key, teacher_name)] = teacher_id
        teacher = {
            "id": teacher_id,
            "user_id": "",
            "campus_id": campus_id,
            "name": teacher_name,
            "phone": clean(row.get("手机号")),
            "avatar": "/assets/brand/avatar.png",
            "primary_course": clean(row.get("主授课程")) or (courses[0] if courses else ""),
            "courses": courses,
            "dingtalk_user_id": "",
            "status": status_teacher(row.get("在职状态")),
            "notes": clean(row.get("备注")),
        }
        created = upsert_by_id(store["teachers"], teacher)
        stats["teachers_created" if created else "teachers_updated"] += 1

    for index, row in enumerate(rows.get("学生信息", []), start=2):
        campus_key = clean(row.get("所属校区"))
        student_name = clean(row.get("学生姓名"))
        course = clean(row.get("课程名称"))
        teacher_name = clean(row.get("授课老师"))
        campus_id = campus_alias.get(campus_key)
        teacher_id = teacher_by_key.get((campus_key, teacher_name))
        if not campus_id or not student_name or not course or not teacher_id:
            stats["warnings"].append(f"学生信息第 {index} 行缺少校区、姓名、课程或授课老师，已跳过")
            continue

        phone = clean(row.get("联系电话"))
        student_id = stable_id("student", phone or student_name, campus_id)
        student = {
            "id": student_id,
            "user_id": "",
            "campus_id": campus_id,
            "name": student_name,
            "phone": phone,
            "avatar": "/assets/brand/avatar.png",
            "enrolled_at": excel_date(row.get("报名日期")),
            "expires_at": excel_date(row.get("到期日期")),
            "payment_status": payment_status(row.get("缴费状态")),
            "status": status_student(row.get("在读状态")),
            "notes": clean(row.get("备注")),
        }
        created = upsert_by_id(store["students"], student)
        stats["students_created" if created else "students_updated"] += 1

        mode = contract_mode(row.get("课程类型"))
        contract_id = stable_id("contract", student_id, course, teacher_id)
        completed = number(row.get("已上课时"), 0) or 0
        total = number(row.get("总课时"), None)
        contract = {
            "id": contract_id,
            "contract_no": f"IMP-{contract_id.removeprefix('contract-').upper()}",
            "student_id": student_id,
            "campus_id": campus_id,
            "course": course,
            "mode": mode,
            "book_level": clean(row.get("按册级别")),
            "total_lessons": total if mode == "fixed20" else None,
            "completed_lessons": completed,
            "valid_lessons": completed,
            "invalid_lessons": 0,
            "progress": clean(row.get("当前进度")),
            "signed_at": excel_date(row.get("报名日期")),
            "expires_at": excel_date(row.get("到期日期")),
            "status": "active" if status_student(row.get("在读状态")) == "active" else "expired",
            "attachment_url": "",
        }
        created = upsert_by_id(store["contracts"], contract)
        stats["contracts_created" if created else "contracts_updated"] += 1

        binding_id = stable_id("binding", student_id, teacher_id, course)
        binding = {
            "id": binding_id,
            "student_id": student_id,
            "teacher_id": teacher_id,
            "campus_id": campus_id,
            "contract_id": contract_id,
            "course": course,
            "status": "active" if status_student(row.get("在读状态")) == "active" else "expired",
            "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }
        created = upsert_by_id(store["bindings"], binding)
        stats["bindings_created" if created else "bindings_updated"] += 1

    return stats


def write_store(path: Path, store: dict[str, Any], backup: bool = True) -> Path | None:
    path.parent.mkdir(parents=True, exist_ok=True)
    backup_path = None
    if backup and path.exists():
        backup_path = path.with_suffix(path.suffix + f".bak-{datetime.now().strftime('%Y%m%d%H%M%S')}")
        shutil.copy2(path, backup_path)
    with path.open("w", encoding="utf-8") as file:
        json.dump(store, file, ensure_ascii=False, indent=2)
        file.write("\n")
    return backup_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Import music school Excel data into the JSON database.")
    parser.add_argument("--input", default=str(DEFAULT_INPUT), help="Path to music-school-import-template/current Excel file.")
    parser.add_argument("--database", default=str(DEFAULT_DATABASE), help="Path to spinach-music.json.")
    parser.add_argument("--output", help="Write imported JSON to another file instead of overwriting --database.")
    parser.add_argument("--dry-run", action="store_true", help="Parse and report changes without writing JSON.")
    parser.add_argument("--no-backup", action="store_true", help="Do not create a .bak file before overwriting the database.")
    args = parser.parse_args()

    input_path = Path(args.input).resolve()
    database_path = Path(args.database).resolve()
    output_path = Path(args.output).resolve() if args.output else database_path

    rows = read_xlsx(input_path)
    store = load_store(database_path)
    stats = import_data(rows, store)

    print(json.dumps(stats, ensure_ascii=False, indent=2))
    if args.dry_run:
      print("dry-run: no files written")
      return

    backup_path = write_store(output_path, store, backup=not args.no_backup and output_path == database_path)
    if backup_path:
        print(f"backup: {backup_path}")
    print(f"written: {output_path}")


if __name__ == "__main__":
    main()
