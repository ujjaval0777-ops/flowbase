from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.core.dependencies import current_supabase, current_user, public_supabase
from app.core.employees_store import get_employee_by_code, get_employee_by_user_id
from app.core.errors import execute_or_400, raise_supabase_error
from app.schemas import EmployeeLoginRequest, LoginRequest, RefreshRequest, SignupRequest

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


@router.post("/employee-login")
def employee_login(body: EmployeeLoginRequest, db: Client = Depends(public_supabase)):
    """Employee ID + Password login. Redirects to billing."""
    emp = get_employee_by_code(body.employee_id)
    if not emp:
        raise HTTPException(status_code=401, detail="Invalid Employee ID or password")

    if emp.get("status") == "Disabled":
        raise HTTPException(status_code=403, detail="Employee account is disabled. Please contact your shop owner.")

    email = emp["email"]
    response = execute_or_400(
        lambda: db.auth.sign_in_with_password({"email": email, "password": body.password})
    )
    if not response.session or not response.user:
        raise HTTPException(status_code=401, detail="Login did not return a session")

    # Fetch shop name for convenience
    shop_name = f"Store #{emp['shop_id']}"
    try:
        shop_res = db.table("shops").select("id,name").eq("id", emp["shop_id"]).maybe_single().execute()
        if shop_res and shop_res.data and shop_res.data.get("name"):
            shop_name = shop_res.data["name"]
    except Exception:
        pass

    return {
        "role": "EMPLOYEE",
        "employee_id": emp["employee_id"],
        "name": emp["name"],
        "shop_id": emp["shop_id"],
        "shop_name": shop_name,
        "user": {
            "id": str(response.user.id),
            "email": response.user.email,
            "name": emp["name"],
            "employee_id": emp["employee_id"],
        },
        "session": {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "expires_in": response.session.expires_in,
            "token_type": response.session.token_type,
        },
    }


@router.post("/login")
def login(body: LoginRequest, db: Client = Depends(public_supabase)):
    """Password login supporting both Owner email and Employee ID."""
    # Check if this is an employee login by employee_id or username without @
    target_emp_code = body.employee_id
    if not target_emp_code and body.email and "@" not in body.email:
        target_emp_code = body.email.strip()

    if target_emp_code:
        return employee_login(
            EmployeeLoginRequest(employee_id=target_emp_code, password=body.password),
            db=db,
        )

    if not body.email:
        raise HTTPException(status_code=400, detail="Email address or Employee ID is required")

    response = execute_or_400(
        lambda: db.auth.sign_in_with_password({"email": body.email, "password": body.password})
    )
    if not response.session or not response.user:
        raise HTTPException(status_code=401, detail="Login did not return a session")

    user_id = str(response.user.id)

    # Check if user is an employee in employees_store
    emp = get_employee_by_user_id(user_id)
    if emp:
        if emp.get("status") == "Disabled":
            raise HTTPException(status_code=403, detail="Employee account is disabled. Please contact your shop owner.")
        return {
            "role": "EMPLOYEE",
            "employee_id": emp["employee_id"],
            "name": emp["name"],
            "shop_id": emp["shop_id"],
            "user": {
                "id": user_id,
                "email": response.user.email,
                "name": emp["name"],
                "employee_id": emp["employee_id"],
            },
            "session": {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "expires_in": response.session.expires_in,
                "token_type": response.session.token_type,
            },
        }

    return {
        "role": "OWNER",
        "user": {"id": user_id, "email": response.user.email},
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

    emp = get_employee_by_user_id(user["id"])
    role = "EMPLOYEE" if emp else "OWNER"
    employee_id = emp["employee_id"] if emp else None
    status = emp["status"] if emp else "Active"

    # Also check membership role
    if not emp and memberships.data:
        has_owner = any(m.get("role") in ["OWNER", "ADMIN"] for m in memberships.data)
        role = "OWNER" if has_owner else "EMPLOYEE"

    return {
        "user": {"id": user["id"], "email": user["email"]},
        "role": role,
        "employee_id": employee_id,
        "status": status,
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
