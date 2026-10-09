import time
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from backend.database import get_db
import backend.models.core as models

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

# Short 2-second throttle only to protect against rapid DDoS burst, while ensuring updates reflect immediately
_stats_cache = None
_stats_cache_time = 0

def invalidate_dashboard_cache():
    global _stats_cache, _stats_cache_time
    _stats_cache = None
    _stats_cache_time = 0

@router.get("/stats")
def get_dashboard_stats(
    refresh: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    global _stats_cache, _stats_cache_time
    now = time.time()
    force_refresh = bool(refresh and refresh.lower() in ("1", "true"))
    
    # Bypass cache if forced or older than 2 seconds (near instant live data)
    if not force_refresh and _stats_cache is not None and (now - _stats_cache_time) < 2.0:
        return _stats_cache

    # 1. Fetch products with eager-loaded category and supplier (single query)
    products = (
        db.query(models.Product)
        .options(joinedload(models.Product.category_obj), joinedload(models.Product.supplier_obj))
        .all()
    )

    total_products = len(products)
    total_value = sum(float(p.quantity or 0) * float(p.price or 0.0) for p in products)
    total_units = sum(int(p.quantity or 0) for p in products)
    out_of_stock = sum(1 for p in products if (p.quantity or 0) <= 0)
    low_stock = sum(1 for p in products if 0 < (p.quantity or 0) <= (p.reorder_level or 10))
    in_stock = sum(1 for p in products if (p.quantity or 0) > (p.reorder_level or 10))
    reorder_alerts = low_stock + out_of_stock

    # Real Product Stock array for live dashboard charts
    product_stock = [
        {
            "id": p.id,
            "sku": p.sku,
            "name": p.name,
            "category": p.category_obj.name if p.category_obj else "General",
            "quantity": int(p.quantity or 0),
            "reorderLevel": int(p.reorder_level or 10),
            "stockStatus": "out" if (p.quantity or 0) <= 0 else "low" if (p.quantity or 0) <= (p.reorder_level or 10) else "in",
            "price": float(p.price or 0.0),
            "value": round(float((p.quantity or 0) * (p.price or 0.0)), 2),
        }
        for p in products
    ]

    # 2. Categories & Category Distribution
    categories = db.query(models.Category).all()
    total_categories = len(categories)

    cat_distribution = []
    for c in categories:
        cat_prods = [p for p in products if p.category_id == c.id]
        cat_count = len(cat_prods)
        cat_units = sum(int(p.quantity or 0) for p in cat_prods)
        cat_val = sum(float(p.quantity or 0) * float(p.price or 0.0) for p in cat_prods)
        cat_distribution.append({
            "name": c.name,
            "count": cat_count,
            "units": cat_units,
            "value": round(cat_val, 2),
        })

    uncat_prods = [p for p in products if not p.category_id]
    if uncat_prods:
        uncat_count = len(uncat_prods)
        uncat_units = sum(int(p.quantity or 0) for p in uncat_prods)
        uncat_val = sum(float(p.quantity or 0) * float(p.price or 0.0) for p in uncat_prods)
        cat_distribution.append({
            "name": "Uncategorized",
            "count": uncat_count,
            "units": uncat_units,
            "value": round(uncat_val, 2),
        })

    # 3. Suppliers count
    total_suppliers = db.query(models.Supplier.id).count()

    # 4. Orders: sales count, revenue, pending orders, and 7-day sales trend
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=6)
    start_dt = datetime.combine(start_date, datetime.min.time())

    orders = db.query(models.Order).all()
    total_sales_count = len(orders)
    total_revenue = sum(float(o.total or 0.0) for o in orders if o.status in ["Completed", "Accepted"])
    pending_orders_count = sum(1 for o in orders if o.status == "Pending")

    # 5. Purchase Orders
    purchase_orders = db.query(models.PurchaseOrder).all()
    pending_pos = sum(1 for po in purchase_orders if po.status == "Pending")

    # 6. Real 7-day sales vs purchases trend
    sales_trend = []
    for i in range(6, -1, -1):
        day_date = today - timedelta(days=i)
        day_name = day_date.strftime("%a")
        day_label = day_date.strftime("%b %d")

        day_sales = sum(
            float(o.total or 0.0)
            for o in orders
            if o.date and (o.date.date() if hasattr(o.date, "date") else str(o.date)[:10]) == str(day_date)
        )

        day_purch = sum(
            float(p.total or 0.0)
            for p in purchase_orders
            if p.date and (p.date.date() if hasattr(p.date, "date") else str(p.date)[:10]) == str(day_date)
        )

        sales_trend.append({
            "day": day_name,
            "date": day_label,
            "sales": round(day_sales, 2),
            "purchases": round(day_purch, 2),
        })

    # 7. Recent transactions eager-loaded with Product
    recent_txs = (
        db.query(models.InventoryTransaction)
        .options(joinedload(models.InventoryTransaction.product))
        .order_by(models.InventoryTransaction.timestamp.desc())
        .limit(8)
        .all()
    )
    activities = [
        {
            "id": tx.id,
            "type": tx.type,
            "item": tx.product.name if tx.product else "Inventory Item",
            "change": f"+{tx.quantity_change}" if (tx.quantity_change or 0) > 0 else str(tx.quantity_change or 0),
            "time": tx.timestamp.strftime("%Y-%m-%d %H:%M") if tx.timestamp else "Recently",
            "notes": tx.notes or "",
        }
        for tx in recent_txs
    ]

    # 8. Monthly Inventory Levels
    inv_levels = []
    for i in range(5, -1, -1):
        m_offset = today.month - i
        y_offset = today.year
        while m_offset <= 0:
            m_offset += 12
            y_offset -= 1
        month_dt = datetime(y_offset, m_offset, 1)
        month_name = month_dt.strftime("%b")

        if i == 0:
            inv_levels.append({
                "month": month_name,
                "level": int(total_units),
            })
        else:
            # Check transaction deltas after this month
            next_m = m_offset + 1
            next_y = y_offset
            if next_m > 12:
                next_m = 1
                next_y += 1
            end_of_month = datetime(next_y, next_m, 1)
            future_delta = sum(
                (tx.quantity_change or 0)
                for tx in recent_txs
                if tx.timestamp and tx.timestamp.replace(tzinfo=None) >= end_of_month
            )
            hist_level = max(0, total_units - future_delta)
            inv_levels.append({
                "month": month_name,
                "level": int(hist_level if hist_level > 0 else total_units),
            })

    result = {
        "totalProducts": total_products,
        "totalCategories": total_categories,
        "totalSuppliers": total_suppliers,
        "totalSalesCount": total_sales_count,
        "totalInventoryValue": round(total_value, 2),
        "totalRevenue": round(float(total_revenue), 2),
        "lowStockCount": low_stock,
        "outOfStockCount": out_of_stock,
        "inStockCount": in_stock,
        "reorderAlerts": reorder_alerts,
        "pendingPOs": pending_pos,
        "pendingOrders": pending_orders_count,
        "categoryDistribution": cat_distribution,
        "recentActivities": activities,
        "salesTrend": sales_trend,
        "inventoryLevels": inv_levels,
        "productStock": product_stock,
    }
    _stats_cache = result
    _stats_cache_time = now
    return result

