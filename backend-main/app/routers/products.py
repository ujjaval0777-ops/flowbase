from fastapi import APIRouter, Depends, Query
from supabase import Client

from ..core.dependencies import current_supabase, current_user
from ..core.errors import execute_or_400
from ..core.rbac import membership, require_admin_or_owner
from ..schemas import ProductCreate, ProductUpdate

router = APIRouter(prefix="/shops/{shop_id}/products", tags=["Products"])


@router.get("")
def list_products(
    shop_id: int,
    search: str | None = Query(default=None),
    low_stock: bool = False,
    db: Client = Depends(current_supabase),
    user=Depends(current_user),
):
    membership(db, user["id"], shop_id)
    q = db.table("products").select("*").eq("shop_id", shop_id)
    if search:
        q = q.ilike("name", f"%{search}%")
    if low_stock:
        q = q.lte("stock_quantity", "low_stock_threshold")
    return q.order("name").execute().data


@router.get("/{product_id}")
def get_product(shop_id: int, product_id: int, db: Client = Depends(current_supabase), user=Depends(current_user)):
    membership(db, user["id"], shop_id)
    return execute_or_400(
        lambda: db.table("products").select("*").eq("id", product_id).eq("shop_id", shop_id).single().execute()
    ).data


@router.post("")
def create_product(shop_id: int, body: ProductCreate, db: Client = Depends(current_supabase), user=Depends(current_user)):
    require_admin_or_owner(db, user["id"], shop_id)
    payload = body.model_dump(exclude_none=True, mode="json")
    payload["shop_id"] = shop_id
    return execute_or_400(lambda: db.table("products").insert(payload).execute()).data[0]


@router.patch("/{product_id}")
def update_product(shop_id: int, product_id: int, body: ProductUpdate, db: Client = Depends(current_supabase), user=Depends(current_user)):
    require_admin_or_owner(db, user["id"], shop_id)
    payload = body.model_dump(exclude_none=True, mode="json")
    return execute_or_400(
        lambda: db.table("products").update(payload).eq("id", product_id).eq("shop_id", shop_id).execute()
    ).data[0]


@router.delete("/{product_id}")
def delete_product(shop_id: int, product_id: int, db: Client = Depends(current_supabase), user=Depends(current_user)):
    require_admin_or_owner(db, user["id"], shop_id)
    execute_or_400(
        lambda: db.table("products").delete().eq("id", product_id).eq("shop_id", shop_id).execute()
    )
    return {"message": "Product deleted"}
