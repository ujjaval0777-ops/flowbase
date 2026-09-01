from fastapi import APIRouter, Depends
from supabase import Client

from ..core.dependencies import current_supabase, current_user
from ..core.errors import execute_or_400
from ..schemas import ProfileUpdate

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("")
def get_profile(db: Client = Depends(current_supabase), user=Depends(current_user)):
    profile = (
        db.table("profiles")
        .select("*")
        .eq("id", user["id"])
        .single()
        .execute()
    )
    return profile.data


@router.patch("")
def update_profile(
    body: ProfileUpdate,
    db: Client = Depends(current_supabase),
    user=Depends(current_user),
):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        return get_profile(db, user)

    return execute_or_400(
        lambda: db.table("profiles")
        .update(payload)
        .eq("id", user["id"])
        .execute()
    ).data[0]
