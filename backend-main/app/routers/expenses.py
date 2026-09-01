from fastapi import APIRouter, Depends
from supabase import Client

from ..core.dependencies import current_supabase, current_user
from ..core.errors import execute_or_400
from ..core.rbac import require_admin_or_owner
from ..schemas import ExpenseCreate

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.post("")
def create_expense(body: ExpenseCreate, db: Client = Depends(current_supabase), user=Depends(current_user)):
    require_admin_or_owner(db, user["id"], body.shop_id)
    payload = body.model_dump(exclude_none=True, mode="json")
    payload["created_by"] = user["id"]
    return execute_or_400(lambda: db.table("expenses").insert(payload).execute()).data[0]


@router.get("/{shop_id}")
def list_expenses(shop_id: int, db: Client = Depends(current_supabase), user=Depends(current_user)):
    require_admin_or_owner(db, user["id"], shop_id)
    return db.table("expenses").select("*").eq("shop_id", shop_id).order("expense_date", desc=True).execute().data
