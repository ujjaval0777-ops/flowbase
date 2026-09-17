from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.core.dependencies import current_supabase, current_user
from app.core.errors import execute_or_400
from app.core.rbac import require_admin_or_owner, require_owner, membership
from app.schemas import ShopCreate, ShopUpdate

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
    require_admin_or_owner(db, user["id"], shop_id)
    payload = body.model_dump(exclude_none=True, mode="json")
    if not payload:
        return get_shop(shop_id, db, user)
    return execute_or_400(
        lambda: db.table("shops")
        .update(payload)
        .eq("id", shop_id)
        .execute()
    ).data[0]


@router.post("/{shop_id}/join")
def join_shop(
    shop_id: int,
    db: Client = Depends(current_supabase),
    user=Depends(current_user),
):
    """Allows a user to join an existing store with strictly STAFF (employee) permissions."""
    from app.core.supabase import get_admin_client
    admin = get_admin_client()

    # 1. Verify shop exists
    shop_res = execute_or_400(
        lambda: admin.table("shops").select("*").eq("id", shop_id).maybe_single().execute()
    )
    if not shop_res or not shop_res.data:
        raise HTTPException(status_code=404, detail=f"Shop ID #{shop_id} not found. Please verify the ID with your shop owner.")

    shop_data = shop_res.data

    # 2. Check if already a member
    existing = execute_or_400(
        lambda: admin.table("shop_members").select("*").eq("shop_id", shop_id).eq("user_id", user["id"]).maybe_single().execute()
    )
    if existing and existing.data:
        return {
            "message": "You are already a member of this shop",
            "shop": shop_data,
            "membership": existing.data,
            "role": existing.data.get("role", "EMPLOYEE"),
            "user_id": user["id"],
        }

    # 3. Add user with strictly EMPLOYEE role (never OWNER or ADMIN)
    new_member = execute_or_400(
        lambda: admin.table("shop_members").insert({
            "shop_id": shop_id,
            "user_id": user["id"],
            "role": "EMPLOYEE",
            "salary": None,
        }).execute()
    )

    return {
        "message": "Successfully joined shop",
        "shop": shop_data,
        "membership": new_member.data[0] if new_member.data else {},
        "role": "EMPLOYEE",
        "user_id": user["id"],
    }

