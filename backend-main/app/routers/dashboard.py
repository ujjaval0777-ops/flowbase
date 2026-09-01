from fastapi import APIRouter, Depends
from supabase import Client

from ..core.dependencies import current_supabase, current_user
from ..core.rbac import require_admin_or_owner

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/{shop_id}")
def dashboard(shop_id: int, db: Client = Depends(current_supabase), user=Depends(current_user)):
    require_admin_or_owner(db, user["id"], shop_id)

    sales = db.table("sales").select("total,created_at").eq("shop_id", shop_id).execute().data or []
    expenses = db.table("expenses").select("amount,expense_type,expense_date").eq("shop_id", shop_id).execute().data or []
    products = db.table("products").select("id,name,stock_quantity,low_stock_threshold").eq("shop_id", shop_id).execute().data or []
    members = db.table("shop_members").select("id").eq("shop_id", shop_id).execute().data or []
    sale_items = db.table("sale_items").select(
        "product_id,quantity,sales!inner(shop_id)"
    ).eq("sales.shop_id", shop_id).execute().data or []

    total_sales = sum(float(x["total"] or 0) for x in sales)
    total_expenses = sum(float(x["amount"] or 0) for x in expenses)

    top = {}
    for item in sale_items:
        pid = str(item["product_id"])
        top[pid] = top.get(pid, 0) + float(item["quantity"] or 0)

    product_map = {str(p["id"]): p["name"] for p in products}
    top_products = sorted(
        [
            {"product_id": int(pid), "product_name": product_map.get(pid), "quantity_sold": qty}
            for pid, qty in top.items()
        ],
        key=lambda x: x["quantity_sold"],
        reverse=True,
    )[:10]

    health = {
        "healthy": 0,
        "medium": 0,
        "low": 0,
        "out_of_stock": 0,
    }
    low_stock_products = []

    for p in products:
        stock = float(p["stock_quantity"] or 0)
        threshold = float(p["low_stock_threshold"] or 0)

        if stock <= 0:
            health["out_of_stock"] += 1
            low_stock_products.append(p)
        elif stock <= threshold:
            health["low"] += 1
            low_stock_products.append(p)
        elif threshold and stock <= threshold * 2:
            health["medium"] += 1
        else:
            health["healthy"] += 1

    return {
        "shop_id": shop_id,
        "sales": total_sales,
        "expenses": total_expenses,
        "net_profit": total_sales - total_expenses,
        "total_products": len(products),
        "total_members": len(members),
        "inventory_health": health,
        "low_stock_products": low_stock_products,
        "top_selling_products": top_products,
        "sales_series": sales,
        "expense_series": expenses,
    }
