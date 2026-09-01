from fastapi import APIRouter, Depends
from supabase import Client

from ..core.dependencies import current_supabase, current_user
from ..core.errors import execute_or_400
from ..core.rbac import membership, require_admin_or_owner
from ..schemas import SupplierCreate, SupplierUpdate

router = APIRouter(prefix="/shops/{shop_id}/suppliers", tags=["Suppliers"])


@router.get("")
def list_suppliers(shop_id: int, db: Client = Depends(current_supabase), user=Depends(current_user)):
    membership(db, user["id"], shop_id)
    return db.table("suppliers").select("*").eq("shop_id", shop_id).order("name").execute().data


@router.post("")
def create_supplier(shop_id: int, body: SupplierCreate, db: Client = Depends(current_supabase), user=Depends(current_user)):
    require_admin_or_owner(db, user["id"], shop_id)
    payload = body.model_dump(exclude_none=True, mode="json")
    payload["shop_id"] = shop_id
    return execute_or_400(lambda: db.table("suppliers").insert(payload).execute()).data[0]


@router.patch("/{supplier_id}")
def update_supplier(shop_id: int, supplier_id: int, body: SupplierUpdate, db: Client = Depends(current_supabase), user=Depends(current_user)):
    require_admin_or_owner(db, user["id"], shop_id)
    return execute_or_400(
        lambda: db.table("suppliers").update(body.model_dump(exclude_none=True, mode="json"))
        .eq("id", supplier_id).eq("shop_id", shop_id).execute()
    ).data[0]


@router.delete("/{supplier_id}")
def delete_supplier(shop_id: int, supplier_id: int, db: Client = Depends(current_supabase), user=Depends(current_user)):
    require_admin_or_owner(db, user["id"], shop_id)
    execute_or_400(lambda: db.table("suppliers").delete().eq("id", supplier_id).eq("shop_id", shop_id).execute())
    return {"message": "Supplier deleted"}
