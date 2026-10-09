import uuid
import time
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from backend.database import get_db
import backend.models.core as models
from backend.auth_utils import get_optional_current_user
from backend.routers.dashboard import invalidate_dashboard_cache
from backend.routers.notifications import invalidate_notifications_cache
from backend.routers.products import invalidate_products_cache

router = APIRouter(prefix="/api/sales", tags=["Sales Orders"])

# ── Server-side cache (15s TTL) ──────────────────────────────────
_sales_cache = {}  # keyed by customer filter
_sales_cache_time = 0

def invalidate_sales_cache():
    global _sales_cache, _sales_cache_time
    _sales_cache = {}
    _sales_cache_time = 0
    invalidate_dashboard_cache()
    invalidate_notifications_cache()
    invalidate_products_cache()

class OrderItemInput(BaseModel):
    product_sku: str
    quantity: int

class OrderCreate(BaseModel):
    customer: str
    product: str # SKU or product ID
    quantity: int
    status: Optional[str] = "Pending" # Default "Pending" for incoming customer order awaiting supplier acceptance

class RejectInput(BaseModel):
    reason: Optional[str] = "Rejected by supplier"

@router.get("")
def get_sales(customer: Optional[str] = None, db: Session = Depends(get_db)):
    global _sales_cache, _sales_cache_time
    now = time.time()
    cache_key = (customer or "").strip().lower()

    # Return cached result within TTL
    if (now - _sales_cache_time) < 30.0 and cache_key in _sales_cache:
        return _sales_cache[cache_key]

    # Single query with JOINs: orders → items → products (eliminates N+1)
    query = db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.product),
    )
    if customer:
        query = query.filter(models.Order.customer.ilike(f"%{customer.strip()}%"))
    orders = query.order_by(models.Order.date.desc()).all()
    result = []
    for o in orders:
        total_items = sum(item.quantity for item in o.items) if o.items else 1
        items_detail = []
        for item in o.items:
            prod_name = item.product.name if item.product else "Direct Catalog Item"
            prod_sku = item.product.sku if item.product else ""
            items_detail.append({
                "id": item.id,
                "productId": item.product_id,
                "name": prod_name,
                "sku": prod_sku,
                "quantity": item.quantity,
                "price": item.price,
            })
        result.append({
            "id": o.id,
            "invoice": o.invoice,
            "customer": o.customer,
            "items": total_items,
            "itemsDetail": items_detail,
            "total": o.total,
            "status": o.status or "Completed",
            "date": o.date.strftime("%Y-%m-%d") if o.date else datetime.utcnow().strftime("%Y-%m-%d"),
        })

    _sales_cache[cache_key] = result
    _sales_cache_time = now
    return result

@router.post("")
def create_sale(data: OrderCreate, db: Session = Depends(get_db)):
    # Find product by SKU or ID
    product = db.query(models.Product).filter(
        (models.Product.sku == data.product) | (models.Product.id == data.product)
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail=f"Product '{data.product}' not found.")

    qty = int(data.quantity)
    if qty <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0.")

    # Check if stock is sufficient
    if product.quantity < qty:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available: {product.quantity}, requested: {qty}."
        )

    total_price = round(product.price * qty, 2)
    order_id = f"sl_{uuid.uuid4().hex[:8]}"
    invoice_number = f"INV-{10240 + db.query(models.Order).count() + 1}"
    order_status = data.status if data.status in ["Pending", "Accepted", "Completed"] else "Pending"

    # If created directly as Completed (e.g. instant POS sale), deduct stock immediately
    if order_status == "Completed":
        product.quantity -= qty
        tx = models.InventoryTransaction(
            id=f"tx_{uuid.uuid4().hex[:8]}",
            product_id=product.id,
            type="stock-out",
            quantity_change=-qty,
            timestamp=datetime.utcnow(),
            notes=f"Order {invoice_number} sold to {data.customer}",
        )
        db.add(tx)

    # Create Order
    new_order = models.Order(
        id=order_id,
        invoice=invoice_number,
        customer=data.customer.strip(),
        total=total_price,
        status=order_status,
        date=datetime.utcnow(),
    )
    db.add(new_order)

    # Create Order Item
    order_item = models.OrderItem(
        id=f"oi_{uuid.uuid4().hex[:8]}",
        order_id=order_id,
        product_id=product.id,
        quantity=qty,
        price=product.price,
    )
    db.add(order_item)

    # Ensure customer profile entity exists in database
    cust = db.query(models.Customer).filter(models.Customer.name.ilike(data.customer.strip())).first()
    if not cust:
        cust = models.Customer(
            id=f"cu_{uuid.uuid4().hex[:8]}",
            name=data.customer.strip(),
            email=f"{data.customer.lower().replace(' ', '')}@client.local",
            phone="",
            total_orders=1,
            total_spent=total_price,
            last_order_date=datetime.utcnow(),
        )
        db.add(cust)
    else:
        cust.last_order_date = datetime.utcnow()

    db.commit()
    db.refresh(new_order)
    invalidate_sales_cache()

    return {
        "id": new_order.id,
        "invoice": new_order.invoice,
        "customer": new_order.customer,
        "items": qty,
        "itemsDetail": [{
            "id": order_item.id,
            "productId": product.id,
            "name": product.name,
            "sku": product.sku,
            "quantity": qty,
            "price": product.price,
        }],
        "total": new_order.total,
        "status": new_order.status,
        "date": new_order.date.strftime("%Y-%m-%d"),
    }

@router.put("/{order_id}/accept")
def accept_sale_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_current_user)
):
    """
    Manager/Staff accepts an incoming customer order:
    1. Forbids Customer role from self-accepting.
    2. Validates that the order exists and is currently Pending.
    3. Checks product inventory stock.
    4. Atomically deducts product stock.
    5. Writes stock-out transaction to inventory audit ledger.
    6. Sets order status to 'Accepted'.
    7. Updates customer purchase metrics.
    """
    if current_user and current_user.role == "Customer":
        raise HTTPException(
            status_code=403,
            detail="Permission denied: Customers cannot accept orders. Only warehouse managers or administrators can accept orders."
        )

    order = db.query(models.Order).filter(
        (models.Order.id == order_id) | (models.Order.invoice == order_id)
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status == "Accepted":
        return {"status": "ok", "message": f"Order {order.invoice} is already accepted.", "order": {"id": order.id, "status": order.status}}

    if order.status == "Completed":
        return {"status": "ok", "message": f"Order {order.invoice} is already completed.", "order": {"id": order.id, "status": order.status}}

    if order.status == "Rejected":
        raise HTTPException(status_code=400, detail=f"Cannot accept order {order.invoice} because it was previously rejected.")

    # Deduct stock for all items
    for item in order.items:
        prod = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if prod:
            if prod.quantity < item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot accept order: Insufficient stock for {prod.name} ({prod.sku}). Available: {prod.quantity}, Required: {item.quantity}"
                )
            prod.quantity -= item.quantity

            # Audit ledger
            tx = models.InventoryTransaction(
                id=f"tx_{uuid.uuid4().hex[:8]}",
                product_id=prod.id,
                type="stock-out",
                quantity_change=-item.quantity,
                timestamp=datetime.utcnow(),
                notes=f"Supplier accepted customer order {order.invoice} for {order.customer}",
            )
            db.add(tx)

    order.status = "Accepted"

    # Update customer metrics if customer exists
    customer = db.query(models.Customer).filter(models.Customer.name.ilike(order.customer.strip())).first()
    if customer:
        customer.total_orders = (customer.total_orders or 0) + 1
        customer.total_spent = round((customer.total_spent or 0.0) + order.total, 2)
        customer.last_order_date = datetime.utcnow()

    db.commit()
    db.refresh(order)
    invalidate_sales_cache()

    return {
        "status": "ok",
        "id": order.id,
        "invoice": order.invoice,
        "customer": order.customer,
        "total": order.total,
        "orderStatus": order.status,
        "message": f"Order {order.invoice} accepted! Inventory stock has been deducted.",
    }

@router.put("/{order_id}/reject")
def reject_sale_order(
    order_id: str,
    data: Optional[RejectInput] = None,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_current_user)
):
    """
    Manager rejects a customer order.
    If the order was already accepted, stock is refunded back into inventory.
    """
    if current_user and current_user.role == "Customer":
        raise HTTPException(
            status_code=403,
            detail="Permission denied: Customers cannot reject orders. Only warehouse managers or administrators can reject orders."
        )

    order = db.query(models.Order).filter(
        (models.Order.id == order_id) | (models.Order.invoice == order_id)
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # If was accepted or completed, restore stock
    if order.status in ["Accepted", "Completed"]:
        for item in order.items:
            prod = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            if prod:
                prod.quantity += item.quantity
                tx = models.InventoryTransaction(
                    id=f"tx_{uuid.uuid4().hex[:8]}",
                    product_id=prod.id,
                    type="stock-in",
                    quantity_change=item.quantity,
                    timestamp=datetime.utcnow(),
                    notes=f"Restored stock from rejected order {order.invoice}",
                )
                db.add(tx)

    order.status = "Rejected"
    db.commit()
    db.refresh(order)
    invalidate_sales_cache()

    return {
        "status": "ok",
        "id": order.id,
        "invoice": order.invoice,
        "customer": order.customer,
        "orderStatus": order.status,
        "message": f"Order {order.invoice} has been rejected.",
    }

@router.put("/{order_id}/complete")
def complete_sale_order(order_id: str, db: Session = Depends(get_db)):
    """
    Supplier marks an accepted order as Completed / Fulfilled.
    """
    order = db.query(models.Order).filter(
        (models.Order.id == order_id) | (models.Order.invoice == order_id)
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = "Completed"
    db.commit()
    db.refresh(order)
    invalidate_sales_cache()

    return {
        "status": "ok",
        "id": order.id,
        "invoice": order.invoice,
        "customer": order.customer,
        "orderStatus": order.status,
        "message": f"Order {order.invoice} marked as Completed / Delivered.",
    }
