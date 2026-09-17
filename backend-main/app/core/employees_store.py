"""
FlowBase SQLite Employee Store
Stores and manages Employee ID mappings, shop bindings, statuses (Active/Disabled),
and sale attribution without altering existing Postgres schema tables.
"""

import sqlite3
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent.parent.parent / "database" / "flowbase_employees.db"


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    try:
        with conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS employees (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    shop_id INTEGER NOT NULL,
                    user_id TEXT NOT NULL,
                    email TEXT NOT NULL,
                    phone TEXT,
                    salary REAL DEFAULT 0,
                    status TEXT NOT NULL DEFAULT 'Active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(shop_id, employee_id)
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS sale_creators (
                    sale_id INTEGER PRIMARY KEY,
                    shop_id INTEGER NOT NULL,
                    employee_id TEXT,
                    employee_name TEXT,
                    user_id TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
    finally:
        conn.close()


init_db()


def add_employee(
    employee_id: str,
    name: str,
    shop_id: int,
    user_id: str,
    email: str,
    phone: str | None = None,
    salary: float = 0.0,
    status: str = "Active",
) -> dict[str, Any]:
    clean_id = employee_id.strip().upper()
    conn = get_connection()
    try:
        with conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO employees (employee_id, name, shop_id, user_id, email, phone, salary, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(shop_id, employee_id) DO UPDATE SET
                    name = excluded.name,
                    user_id = excluded.user_id,
                    email = excluded.email,
                    phone = excluded.phone,
                    salary = excluded.salary,
                    status = excluded.status
                RETURNING id, employee_id, name, shop_id, user_id, email, phone, salary, status, created_at
                """,
                (clean_id, name.strip(), shop_id, user_id, email.strip().lower(), phone, float(salary or 0), status),
            )
            row = cursor.fetchone()
            return dict(row) if row else {}
    finally:
        conn.close()


def get_employee_by_code(employee_id: str) -> dict[str, Any] | None:
    clean_id = employee_id.strip().upper()
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, employee_id, name, shop_id, user_id, email, phone, salary, status, created_at
            FROM employees
            WHERE UPPER(employee_id) = ?
            """,
            (clean_id,),
        )
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_employee_by_user_id(user_id: str) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, employee_id, name, shop_id, user_id, email, phone, salary, status, created_at
            FROM employees
            WHERE user_id = ?
            """,
            (str(user_id),),
        )
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def list_employees_by_shop(shop_id: int) -> list[dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, employee_id, name, shop_id, user_id, email, phone, salary, status, created_at
            FROM employees
            WHERE shop_id = ?
            ORDER BY employee_id ASC
            """,
            (shop_id,),
        )
        return [dict(r) for r in cursor.fetchall()]
    finally:
        conn.close()


def update_employee_status(user_id_or_code: str, status: str) -> bool:
    clean_status = "Active" if status.lower() == "active" else "Disabled"
    conn = get_connection()
    try:
        with conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE employees
                SET status = ?
                WHERE user_id = ? OR UPPER(employee_id) = ?
                """,
                (clean_status, user_id_or_code, user_id_or_code.upper()),
            )
            return cursor.rowcount > 0
    finally:
        conn.close()


def update_employee(
    user_id_or_code: str,
    name: str | None = None,
    phone: str | None = None,
    salary: float | None = None,
    status: str | None = None,
) -> bool:
    conn = get_connection()
    try:
        fields = []
        values = []
        if name is not None:
            fields.append("name = ?")
            values.append(name.strip())
        if phone is not None:
            fields.append("phone = ?")
            values.append(phone.strip())
        if salary is not None:
            fields.append("salary = ?")
            values.append(float(salary))
        if status is not None:
            clean_status = "Active" if status.lower() == "active" else "Disabled"
            fields.append("status = ?")
            values.append(clean_status)

        if not fields:
            return True

        values.extend([user_id_or_code, user_id_or_code.upper()])
        query = f"UPDATE employees SET {', '.join(fields)} WHERE user_id = ? OR UPPER(employee_id) = ?"

        with conn:
            cursor = conn.cursor()
            cursor.execute(query, tuple(values))
            return cursor.rowcount > 0
    finally:
        conn.close()


def delete_employee(user_id_or_code: str) -> bool:
    conn = get_connection()
    try:
        with conn:
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM employees WHERE user_id = ? OR UPPER(employee_id) = ?",
                (user_id_or_code, user_id_or_code.upper()),
            )
            return cursor.rowcount > 0
    finally:
        conn.close()


def record_sale_creator(sale_id: int, shop_id: int, employee_id: str | None, employee_name: str | None, user_id: str) -> None:
    conn = get_connection()
    try:
        with conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO sale_creators (sale_id, shop_id, employee_id, employee_name, user_id)
                VALUES (?, ?, ?, ?, ?)
                """,
                (sale_id, shop_id, employee_id, employee_name, str(user_id)),
            )
    finally:
        conn.close()


def get_sale_creator(sale_id: int) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT sale_id, shop_id, employee_id, employee_name, user_id, created_at
            FROM sale_creators
            WHERE sale_id = ?
            """,
            (sale_id,),
        )
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_sale_creators_by_shop(shop_id: int) -> dict[int, dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT sale_id, shop_id, employee_id, employee_name, user_id, created_at
            FROM sale_creators
            WHERE shop_id = ?
            """,
            (shop_id,),
        )
        rows = cursor.fetchall()
        return {r["sale_id"]: dict(r) for r in rows}
    finally:
        conn.close()
