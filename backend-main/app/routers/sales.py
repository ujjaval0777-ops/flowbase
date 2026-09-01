from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from ..core.dependencies import current_supabase, current_user
from ..core.errors import execute_or_400
from ..core.rbac import require_billing_role
from ..schemas import SaleCreate

router = APIRouter(prefix="/sales", tags=["Billing / Sales"])


@router.post("")
def create_sale(body: SaleCreate, db: Client = Depends(current_supabase), user=Depends(current_user)):
    require_billing_role(db, user["id"], body.shop_id)

    result = execute_or_400(
        lambda: db.rpc(
            "create_sale",
            {
                "p_shop_id": body.shop_id,
                "p_bill_number": body.bill_number,
                "p_tax": str(body.tax),
                "p_discount": str(body.discount),
                "p_items": [
                    {"product_id": x.product_id, "quantity": str(x.quantity)}
                    for x in body.items
                ],
            },
        ).execute()
    )

    if result.data is None:
        raise HTTPException(status_code=500, detail="Sale creation returned no ID")

    sale_id = result.data
    return db.table("sales").select(
        "*,sale_items(id,product_id,quantity,unit_price,subtotal)"
    ).eq("id", sale_id).single().execute().data


@router.get("/{shop_id}")
def list_sales(shop_id: int, db: Client = Depends(current_supabase), user=Depends(current_user)):
    require_billing_role(db, user["id"], shop_id)
    return db.table("sales").select(
        "*,sale_items(id,product_id,quantity,unit_price,subtotal)"
    ).eq("shop_id", shop_id).order("created_at", desc=True).execute().data


@router.get("/{shop_id}/{sale_id}")
def get_sale(shop_id: int, sale_id: int, db: Client = Depends(current_supabase), user=Depends(current_user)):
    require_billing_role(db, user["id"], shop_id)
    return execute_or_400(
        lambda: db.table("sales").select(
            "*,sale_items(id,product_id,quantity,unit_price,subtotal)"
        ).eq("id", sale_id).eq("shop_id", shop_id).single().execute()
    ).data
