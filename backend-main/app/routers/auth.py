from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from ..core.dependencies import current_supabase, current_user, public_supabase
from ..core.errors import execute_or_400, raise_supabase_error
from ..schemas import LoginRequest, RefreshRequest, SignupRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup")
def signup(body: SignupRequest, db: Client = Depends(public_supabase)):
    """Create a Supabase Auth account. No Authorization header is required."""
    response = execute_or_400(
        lambda: db.auth.sign_up(
            {
                "email": body.email,
                "password": body.password,
                "options": {"data": {"name": body.name, "phone": body.phone}},
            }
        )
    )
    user = response.user
    session = response.session
    return {
        "user": {"id": str(user.id) if user else None, "email": user.email if user else body.email},
        "session": ({
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "expires_in": session.expires_in,
            "token_type": session.token_type,
        } if session else None),
        "email_confirmation_required": session is None,
        "message": "Account created. Verify your email before logging in." if session is None else "Account created and signed in.",
    }


@router.post("/login")
def login(body: LoginRequest, db: Client = Depends(public_supabase)):
    """Password login. No Authorization header is required."""
    response = execute_or_400(
        lambda: db.auth.sign_in_with_password({"email": body.email, "password": body.password})
    )
    if not response.session or not response.user:
        raise HTTPException(status_code=401, detail="Login did not return a session")
    return {
        "user": {"id": str(response.user.id), "email": response.user.email},
        "session": {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "expires_in": response.session.expires_in,
            "token_type": response.session.token_type,
        },
    }


@router.post("/refresh")
def refresh(body: RefreshRequest, db: Client = Depends(public_supabase)):
    """Exchange a refresh token for a new session. No Authorization header is required."""
    try:
        response = db.auth.refresh_session(body.refresh_token)
    except Exception as exc:
        raise_supabase_error(exc)
    if not response.session:
        raise HTTPException(status_code=401, detail="Unable to refresh session")
    return {
        "access_token": response.session.access_token,
        "refresh_token": response.session.refresh_token,
        "expires_in": response.session.expires_in,
        "token_type": response.session.token_type,
    }


@router.get("/me")
def me(db: Client = Depends(current_supabase), user=Depends(current_user)):
    profile = db.table("profiles").select("id,name,email,phone,created_at,updated_at").eq("id", user["id"]).maybe_single().execute()
    memberships = db.table("shop_members").select("id,shop_id,role,salary,joined_at,shops(id,name,phone,email,address)").eq("user_id", user["id"]).execute()
    return {
        "user": {"id": user["id"], "email": user["email"]},
        "profile": profile.data,
        "memberships": memberships.data or [],
    }


@router.post("/logout")
def logout(db: Client = Depends(current_supabase), user=Depends(current_user)):
    try:
        db.auth.sign_out()
    except Exception:
        pass
    return {"message": "Signed out"}
