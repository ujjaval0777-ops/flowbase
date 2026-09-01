from fastapi import APIRouter, Depends
from supabase import Client

from ..core.dependencies import current_supabase, current_user
from ..core.errors import execute_or_400
from ..core.rbac import membership, require_admin_or_owner
from ..schemas import CategoryCreate, CategoryUpdate

router = APIRouter(prefix="/shops/{shop_id}/categories", tags=["Categories"])


@router.get("")
def list_categories(shop_id: int, db: Client = Depends(current_supabase), user=Depends(current_user)):
    membership(db, user["id"], shop_id)
    return db.table("categories").select("*").eq("shop_id", shop_id).order("name").execute().data


@router.post("")
def create_category(shop_id: int, body: CategoryCreate, db: Client = Depends(current_supabase), user=Depends(current_user)):
    require_admin_or_owner(db, user["id"], shop_id)
    payload = body.model_dump(exclude_none=True)
    payload["shop_id"] = shop_id
    return execute_or_400(lambda: db.table("categories").insert(payload).execute()).data[0]


@router.patch("/{category_id}")
def update_category(shop_id: int, category_id: int, body: CategoryUpdate, db: Client = Depends(current_supabase), user=Depends(current_user)):
    require_admin_or_owner(db, user["id"], shop_id)
    payload = body.model_dump(exclude_none=True)
    return execute_or_400(
        lambda: db.table("categories").update(payload).eq("id", category_id).eq("shop_id", shop_id).execute()
    ).data[0]


@router.delete("/{category_id}")
def delete_category(shop_id: int, category_id: int, db: Client = Depends(current_supabase), user=Depends(current_user)):
    require_admin_or_owner(db, user["id"], shop_id)
    execute_or_400(lambda: db.table("categories").delete().eq("id", category_id).eq("shop_id", shop_id).execute())
    return {"message": "Category deleted"}
