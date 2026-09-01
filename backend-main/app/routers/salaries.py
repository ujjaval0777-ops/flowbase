from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from ..core.dependencies import current_supabase, current_user
from ..core.errors import execute_or_400
from ..core.rbac import require_owner
from ..schemas import SalaryCreate

router = APIRouter(prefix="/salaries", tags=["Salaries"])


@router.post("")
def record_salary(body: SalaryCreate, db: Client = Depends(current_supabase), user=Depends(current_user)):
    member = execute_or_400(
        lambda: db.table("shop_members")
        .select("id,shop_id,user_id,role")
        .eq("id", body.shop_member_id)
        .single()
        .execute()
    ).data

    require_owner(db, user["id"], member["shop_id"])

    result = execute_or_400(
        lambda: db.rpc(
            "record_salary",
            {
                "p_shop_member_id": body.shop_member_id,
                "p_amount": str(body.amount),
                "p_salary_month": body.salary_month.isoformat(),
            },
        ).execute()
    )

    if result.data is None:
        raise HTTPException(status_code=500, detail="Salary creation returned no ID")

    return db.table("employee_salaries").select("*").eq("id", result.data).single().execute().data


@router.get("/{shop_id}")
def list_salaries(shop_id: int, db: Client = Depends(current_supabase), user=Depends(current_user)):
    require_owner(db, user["id"], shop_id)
    return db.table("employee_salaries").select(
        "*,shop_members(id,user_id,role,profiles(id,name,email))"
    ).eq("shop_members.shop_id", shop_id).execute().data
