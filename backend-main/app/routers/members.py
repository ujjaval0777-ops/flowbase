from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from ..core.dependencies import current_supabase, current_user
from ..core.errors import execute_or_400
from ..core.rbac import require_owner, membership
from ..core.supabase import get_admin_client
from ..schemas import EmployeeCreate, MemberAddExisting, MemberUpdate

router = APIRouter(prefix="/shops/{shop_id}/members", tags=["Employees / Members"])


@router.get("")
def list_members(
    shop_id: int,
    db: Client = Depends(current_supabase),
    user=Depends(current_user),
):
    membership(db, user["id"], shop_id)
    return (
        db.table("shop_members")
        .select("id,shop_id,user_id,role,salary,joined_at,profiles(id,name,email,phone)")
        .eq("shop_id", shop_id)
        .execute()
    ).data


@router.post("/existing")
def add_existing_user(
    shop_id: int,
    body: MemberAddExisting,
    db: Client = Depends(current_supabase),
    user=Depends(current_user),
):
    require_owner(db, user["id"], shop_id)

    if body.user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Owner is already a shop member")

    payload = {
        "shop_id": shop_id,
        "user_id": body.user_id,
        "role": body.role,
        "salary": str(body.salary) if body.salary is not None else None,
    }
    return execute_or_400(
        lambda: db.table("shop_members").insert(payload).execute()
    ).data[0]


@router.post("/new")
def create_employee(
    shop_id: int,
    body: EmployeeCreate,
    db: Client = Depends(current_supabase),
    user=Depends(current_user),
):
    require_owner(db, user["id"], shop_id)

    admin = get_admin_client()

    try:
        auth_response = admin.auth.admin.create_user(
            {
                "email": body.email,
                "password": body.password,
                "email_confirm": False,
                "user_metadata": {
                    "name": body.name,
                    "phone": body.phone,
                },
            }
        )
    except Exception as exc:
        from ..core.errors import raise_supabase_error
        raise_supabase_error(exc)

    new_user = auth_response.user
    if not new_user:
        raise HTTPException(status_code=500, detail="Supabase did not return the new user")

    # The profiles trigger creates the profile asynchronously within the same DB
    # transaction on auth.users INSERT. The membership is inserted with the
    # caller's JWT so the normal RLS owner policy is enforced.
    membership_payload = {
        "shop_id": shop_id,
        "user_id": str(new_user.id),
        "role": body.role,
        "salary": str(body.salary) if body.salary is not None else None,
    }

    try:
        member = db.table("shop_members").insert(membership_payload).execute()
    except Exception as exc:
        # Avoid leaving an orphan Auth user if membership insertion fails.
        try:
            admin.auth.admin.delete_user(str(new_user.id))
        except Exception:
            pass
        from ..core.errors import raise_supabase_error
        raise_supabase_error(exc)

    return {
        "user": {
            "id": str(new_user.id),
            "email": new_user.email,
        },
        "membership": member.data[0],
        "message": "Employee account created. Email confirmation may be required before login.",
    }


@router.patch("/{member_id}")
def update_member(
    shop_id: int,
    member_id: int,
    body: MemberUpdate,
    db: Client = Depends(current_supabase),
    user=Depends(current_user),
):
    require_owner(db, user["id"], shop_id)
    payload = body.model_dump(exclude_none=False, mode="json")
    return execute_or_400(
        lambda: db.table("shop_members")
        .update(payload)
        .eq("id", member_id)
        .eq("shop_id", shop_id)
        .execute()
    ).data[0]


@router.delete("/{member_id}")
def delete_member(
    shop_id: int,
    member_id: int,
    db: Client = Depends(current_supabase),
    user=Depends(current_user),
):
    require_owner(db, user["id"], shop_id)
    row = execute_or_400(
        lambda: db.table("shop_members")
        .select("id,user_id,role")
        .eq("id", member_id)
        .eq("shop_id", shop_id)
        .single()
        .execute()
    ).data

    if row["role"] == "OWNER":
        raise HTTPException(status_code=400, detail="The shop owner cannot be removed")

    execute_or_400(
        lambda: db.table("shop_members")
        .delete()
        .eq("id", member_id)
        .eq("shop_id", shop_id)
        .execute()
    )
    return {"message": "Shop member removed"}
