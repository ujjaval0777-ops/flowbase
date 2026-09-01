from fastapi import APIRouter, Depends
from supabase import Client

from ..core.dependencies import current_supabase, current_user
from ..core.rbac import membership

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("/{shop_id}/transactions")
def list_inventory_transactions(
    shop_id: int,
    product_id: int | None = None,
    db: Client = Depends(current_supabase),
    user=Depends(current_user),
):
    membership(db, user["id"], shop_id)
    q = db.table("inventory_transactions").select("*").eq("shop_id", shop_id)
    if product_id is not None:
        q = q.eq("product_id", product_id)
    return q.order("created_at", desc=True).execute().data
