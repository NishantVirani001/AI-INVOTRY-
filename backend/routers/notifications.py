import time
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from backend.database import get_db
import backend.models.core as models

from backend.auth_utils import get_optional_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

# In-memory dismissed notification set to respect dismissal during session
_dismissed_ids = set()
_notif_cache = {}
_notif_cache_time = 0

def invalidate_notifications_cache():
    global _notif_cache, _notif_cache_time
    _notif_cache = {}
    _notif_cache_time = 0

@router.get("")
def get_notifications(
    customer: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_current_user)
):
    global _notif_cache, _notif_cache_time
    now_ts = time.time()
    cache_key = f"{customer or ''}:{current_user.name if current_user else 'anon'}:{current_user.role if current_user else ''}"
    if (now_ts - _notif_cache_time) < 15.0 and cache_key in _notif_cache:
        return _notif_cache[cache_key]

    notifications = []
    now = datetime.utcnow()

    # Determine customer identity if authenticated as Customer or explicitly queried
    is_customer_view = (current_user and current_user.role == "Customer") or bool(customer)
    customer_identifier = customer or (current_user.name if current_user and current_user.role == "Customer" else None)

    # ==========================================
    # CUSTOMER NOTIFICATIONS: Personal Order Updates Only
    # ==========================================
    if is_customer_view:
        query = db.query(models.Order).options(
            joinedload(models.Order.items).joinedload(models.OrderItem.product)
        )
        if customer_identifier:
            query = query.filter(models.Order.customer.ilike(f"%{customer_identifier.strip()}%"))
        my_orders = query.order_by(models.Order.date.desc()).limit(15).all()

        for o in my_orders:
            item_summary = ", ".join([f"{it.quantity}x {it.product.name if it.product else 'Item'}" for it in o.items]) if o.items else "Catalog products"
            notif_id = f"cust_notif_{o.id}_{o.status}"
            if notif_id in _dismissed_ids:
                continue

            if o.status == "Pending":
                notifications.append({
                    "id": notif_id,
                    "type": "customer_pending",
                    "title": f"Order {o.invoice} Submitted (₹{o.total:,.2f})",
                    "time": f"Awaiting warehouse manager review • {item_summary}",
                    "invoice": o.invoice,
                    "status": "Pending",
                    "isCustomer": True,
                })
            elif o.status == "Accepted":
                notifications.append({
                    "id": notif_id,
                    "type": "customer_accepted",
                    "title": f"Order {o.invoice} Approved by Manager",
                    "time": f"Warehouse stock allocated • Fulfillment in progress",
                    "invoice": o.invoice,
                    "status": "Accepted",
                    "isCustomer": True,
                })
            elif o.status == "Completed":
                notifications.append({
                    "id": notif_id,
                    "type": "customer_completed",
                    "title": f"Order {o.invoice} Fulfilled & Delivered",
                    "time": f"Completed on {o.date.strftime('%Y-%m-%d') if o.date else 'Recently'}",
                    "invoice": o.invoice,
                    "status": "Completed",
                    "isCustomer": True,
                })
            elif o.status == "Rejected":
                notifications.append({
                    "id": notif_id,
                    "type": "customer_rejected",
                    "title": f"Order {o.invoice} Declined",
                    "time": f"Warehouse management could not fulfill this order",
                    "invoice": o.invoice,
                    "status": "Rejected",
                    "isCustomer": True,
                })

        _notif_cache[cache_key] = notifications
        _notif_cache_time = now_ts
        return notifications

    # ==========================================
    # OPERATIONS / MANAGER NOTIFICATIONS: Warehouse Alerts & Incoming Orders
    # ==========================================
    # Filter only relevant products in SQL rather than full table scan
    alert_products = db.query(models.Product).filter(
        or_(
            models.Product.quantity <= models.Product.reorder_level,
            models.Product.expiry_date.isnot(None)
        )
    ).all()

    # 1. Out of stock & low stock
    for p in alert_products:
        if p.quantity <= 0:
            notif_id = f"notif_out_{p.id}"
            if notif_id not in _dismissed_ids:
                notifications.append({
                    "id": notif_id,
                    "type": "out",
                    "title": f"{p.name} ({p.sku}) is completely out of stock",
                    "time": "Immediate attention",
                    "productId": p.id,
                    "sku": p.sku,
                })
        elif p.quantity <= p.reorder_level:
            notif_id = f"notif_low_{p.id}"
            if notif_id not in _dismissed_ids:
                notifications.append({
                    "id": notif_id,
                    "type": "low",
                    "title": f"{p.name} below reorder level ({p.quantity}/{p.reorder_level} units)",
                    "time": "Action recommended",
                    "productId": p.id,
                    "sku": p.sku,
                })

    # 2. Expiry dates within 30 days
    for p in alert_products:
        if p.expiry_date:
            days_left = (p.expiry_date - now).days
            if 0 <= days_left <= 30:
                notif_id = f"notif_exp_{p.id}"
                if notif_id not in _dismissed_ids:
                    notifications.append({
                        "id": notif_id,
                        "type": "expiry",
                        "title": f"{p.name} expires in {days_left} day{'s' if days_left != 1 else ''}",
                        "time": f"Exp: {p.expiry_date.strftime('%Y-%m-%d')}",
                        "productId": p.id,
                        "sku": p.sku,
                    })

    # 3. Pending purchase orders
    pending_pos = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.status == "Pending").all()
    for po in pending_pos:
        notif_id = f"notif_po_{po.id}"
        if notif_id not in _dismissed_ids:
            notifications.append({
                "id": notif_id,
                "type": "low",
                "title": f"Purchase Order {po.po_number} is pending vendor fulfillment",
                "time": po.date.strftime("%Y-%m-%d") if po.date else "Recent",
                "poId": po.id,
            })

    # 4. Incoming customer orders awaiting supplier/manager acceptance (with eager loading)
    pending_orders = (
        db.query(models.Order)
        .options(joinedload(models.Order.items).joinedload(models.OrderItem.product))
        .filter(models.Order.status == "Pending")
        .order_by(models.Order.date.desc())
        .limit(20)
        .all()
    )
    for o in pending_orders:
        notif_id = f"notif_order_{o.id}"
        if notif_id not in _dismissed_ids:
            item_summary = ", ".join([f"{it.quantity}x {it.product.name if it.product else 'Item'}" for it in o.items]) if o.items else "Order items"
            notifications.append({
                "id": notif_id,
                "type": "order_pending",
                "title": f"Incoming Order {o.invoice} from {o.customer} (₹{o.total:,.2f})",
                "time": f"Awaiting manager acceptance • {item_summary}",
                "orderId": o.id,
                "invoice": o.invoice,
                "customer": o.customer,
                "total": o.total,
            })

    _notif_cache[cache_key] = notifications
    _notif_cache_time = now_ts
    return notifications

@router.delete("/{notification_id}")
def dismiss_notification(notification_id: str):
    _dismissed_ids.add(notification_id)
    return {"status": "ok", "dismissed": notification_id}

@router.delete("")
def clear_all_notifications():
    global _dismissed_ids
    # Fetch all current IDs
    # Mark all currently generated as dismissed
    _dismissed_ids.add("CLEAR_ALL")
    return {"status": "ok", "message": "All notifications cleared"}
