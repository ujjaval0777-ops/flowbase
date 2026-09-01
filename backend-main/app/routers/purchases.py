from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from ..core.dependencies import current_supabase, current_user
from ..core.errors import execute_or_400
from ..core.rbac import require_admin_or_owner
from ..schemas import StockPurchaseCreate

router = APIRouter(prefix="/purchases", tags=["Purchases"])


@router.post("")
def create_purchase(body: StockPurchaseCreate, db: Client = Depends(current_supabase), user=Depends(current_user)):
    require_admin_or_owner(db, user["id"], body.shop_id)

    result = execute_or_400(
        lambda: db.rpc(
            "create_stock_purchase",
            {
                "p_shop_id": body.shop_id,
                "p_supplier_id": body.supplier_id,
                "p_reference_number": body.reference_number,
                "p_description": body.description,
                "p_items": [
                    {
                        "product_id": x.product_id,
                        "quantity": str(x.quantity),
                        "unit_cost": str(x.unit_cost),
                    }
                    for x in body.items
                ],
            },
        ).execute()
    )

    if result.data is None:
        raise HTTPException(status_code=500, detail="Purchase creation returned no ID")

    purchase_id = result.data
    return db.table("purchases").select(
        "*,purchase_items(id,product_id,quantity,unit_cost,subtotal)"
    ).eq("id", purchase_id).single().execute().data


@router.get("/{shop_id}")
def list_purchases(shop_id: int, db: Client = Depends(current_supabase), user=Depends(current_user)):
    require_admin_or_owner(db, user["id"], shop_id)
    return db.table("purchases").select(
        "*,purchase_items(id,product_id,quantity,unit_cost,subtotal)"
    ).eq("shop_id", shop_id).order("purchase_date", desc=True).execute().data
