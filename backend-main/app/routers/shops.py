from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from ..core.dependencies import current_supabase, current_user
from ..core.errors import execute_or_400
from ..core.rbac import require_owner, membership
from ..schemas import ShopCreate, ShopUpdate

router = APIRouter(prefix="/shops", tags=["Shops"])


@router.post("")
def create_shop(
    body: ShopCreate,
    db: Client = Depends(current_supabase),
    user=Depends(current_user),
):
    # Do NOT insert shops and shop_members separately. The create_shop RPC
    # creates both atomically and makes this user the initial OWNER.
    result = execute_or_400(
        lambda: db.rpc(
            "create_shop",
            {
                "p_name": body.name,
                "p_phone": body.phone,
                "p_email": str(body.email) if body.email else None,
                "p_address": body.address,
            },
        ).execute()
    )

    # Depending on the installed Supabase/PostgREST client version, an RPC
    # returning a scalar bigint may arrive as an int, a one-row dict, or a
    # one-element list. Normalize it before using it in .eq("id", ...).
    shop_id = result.data

    if isinstance(shop_id, list):
        if not shop_id:
            raise HTTPException(status_code=500, detail="Shop creation returned no ID")
        shop_id = shop_id[0]

    if isinstance(shop_id, dict):
        # Support common PostgREST shapes: {id: 9}, {shop_id: 9}, etc.
        shop_id = shop_id.get("id", shop_id.get("shop_id"))

    try:
        shop_id = int(shop_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=500,
            detail=f"Shop creation returned an invalid ID: {shop_id!r}",
        )

    return execute_or_400(
        lambda: db.table("shops")
        .select("*")
        .eq("id", shop_id)
        .single()
        .execute()
    ).data


@router.get("")
def list_my_shops(
    db: Client = Depends(current_supabase),
    user=Depends(current_user),
):
    return (
        db.table("shop_members")
        .select("id,shop_id,role,salary,joined_at,shops(*)")
        .eq("user_id", user["id"])
        .execute()
    ).data


@router.get("/{shop_id}")
def get_shop(
    shop_id: int,
    db: Client = Depends(current_supabase),
    user=Depends(current_user),
):
    membership(db, user["id"], shop_id)
    result = execute_or_400(
        lambda: db.table("shops").select("*").eq("id", shop_id).single().execute()
    )
    return result


@router.patch("/{shop_id}")
def update_shop(
    shop_id: int,
    body: ShopUpdate,
    db: Client = Depends(current_supabase),
    user=Depends(current_user),
):
    require_owner(db, user["id"], shop_id)
    payload = body.model_dump(exclude_none=True, mode="json")
    if not payload:
        return get_shop(shop_id, db, user)
    return execute_or_400(
        lambda: db.table("shops")
        .update(payload)
        .eq("id", shop_id)
        .execute()
    ).data[0]
