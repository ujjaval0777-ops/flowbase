from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .core.config import get_settings
from .routers import (
    auth,
    profile,
    shops,
    members,
    categories,
    products,
    suppliers,
    sales,
    purchases,
    expenses,
    salaries,
    inventory,
    dashboard,
)

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Business Management System API backed by Supabase Auth + Postgres/RLS.",
)

# Universal CORS for seamless frontend-backend communication across localhost, 127.0.0.1 and custom ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list if settings.cors_list else ["*"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

prefix = settings.api_prefix

app.include_router(auth.router, prefix=prefix)
app.include_router(profile.router, prefix=prefix)
app.include_router(shops.router, prefix=prefix)
app.include_router(members.router, prefix=prefix)
app.include_router(categories.router, prefix=prefix)
app.include_router(products.router, prefix=prefix)
app.include_router(suppliers.router, prefix=prefix)
app.include_router(sales.router, prefix=prefix)
app.include_router(purchases.router, prefix=prefix)
app.include_router(expenses.router, prefix=prefix)
app.include_router(salaries.router, prefix=prefix)
app.include_router(inventory.router, prefix=prefix)
app.include_router(dashboard.router, prefix=prefix)


@app.get("/health", tags=["System"])
def health():
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
    }


# Frontend static files integration
frontend_dir = Path(__file__).resolve().parent.parent.parent

if (frontend_dir / "css").is_dir():
    app.mount("/css", StaticFiles(directory=str(frontend_dir / "css")), name="css")

if (frontend_dir / "js").is_dir():
    app.mount("/js", StaticFiles(directory=str(frontend_dir / "js")), name="js")


@app.get("/", include_in_schema=False)
async def serve_index():
    index_file = frontend_dir / "index.html"
    if index_file.is_file():
        return FileResponse(str(index_file))
    login_file = frontend_dir / "login.html"
    if login_file.is_file():
        return FileResponse(str(login_file))
    return {"message": "FlowBase API running"}


@app.get("/{page_name}.html", include_in_schema=False)
async def serve_html_page(page_name: str):
    file_path = frontend_dir / f"{page_name}.html"
    if file_path.is_file():
        return FileResponse(str(file_path))
    raise HTTPException(status_code=404, detail="Page not found")

