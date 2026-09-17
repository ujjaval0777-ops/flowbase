from fastapi import HTTPException
from supabase import Client


from .employees_store import get_employee_by_user_id


def membership(db: Client, user_id: str, shop_id: int) -> dict:
    try:
        result = (
            db.table("shop_members")
            .select("id,shop_id,user_id,role,salary,joined_at")
            .eq("shop_id", shop_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=403, detail="Unable to verify shop membership")

    if not result.data:
        raise HTTPException(status_code=403, detail="You are not a member of this shop")

    row = result.data

    # If member is an EMPLOYEE, verify status is active
    if row.get("role") == "EMPLOYEE":
        emp = get_employee_by_user_id(user_id)
        if emp and emp.get("status") == "Disabled":
            raise HTTPException(
                status_code=403,
                detail="Employee account is disabled. Please contact your shop owner.",
            )

    return row


def require_role(db: Client, user_id: str, shop_id: int, roles: list[str]) -> dict:
    row = membership(db, user_id, shop_id)
    if row["role"] not in roles:
        raise HTTPException(status_code=403, detail="Insufficient shop permissions")
    return row


def require_owner(db: Client, user_id: str, shop_id: int) -> dict:
    return require_role(db, user_id, shop_id, ["OWNER"])


def require_admin_or_owner(db: Client, user_id: str, shop_id: int) -> dict:
    return require_role(db, user_id, shop_id, ["OWNER", "ADMIN"])


def require_billing_role(db: Client, user_id: str, shop_id: int) -> dict:
    return require_role(db, user_id, shop_id, ["OWNER", "ADMIN", "EMPLOYEE"])
