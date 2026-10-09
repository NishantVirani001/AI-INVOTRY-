from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
import backend.models.core as models

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

# In-memory dismissed notification set to respect dismissal during session
_dismissed_ids = set()

@router.get("")
def get_notifications(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    notifications = []

    now = datetime.utcnow()

    # 1. Out of stock products
    for p in products:
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

    # 2. Low stock products (below reorder level)
    for p in products:
        if 0 < p.quantity <= p.reorder_level:
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

    # 3. Expiry dates within 30 days
    for p in products:
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

    # 4. Pending purchase orders
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

    # 5. Incoming customer orders awaiting supplier acceptance
    pending_orders = db.query(models.Order).filter(models.Order.status == "Pending").order_by(models.Order.date.desc()).all()
    for o in pending_orders:
        notif_id = f"notif_order_{o.id}"
        if notif_id not in _dismissed_ids:
            item_summary = ", ".join([f"{it.quantity}x {it.product.name if it.product else 'Item'}" for it in o.items]) if o.items else "Order items"
            notifications.append({
                "id": notif_id,
                "type": "order_pending",
                "title": f"Incoming Order {o.invoice} from {o.customer} (₹{o.total:,.2f})",
                "time": f"Awaiting your acceptance • {item_summary}",
                "orderId": o.id,
                "invoice": o.invoice,
                "customer": o.customer,
                "total": o.total,
            })

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
