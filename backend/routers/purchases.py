import time
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from backend.database import get_db
import backend.models.core as models
from backend.routers.dashboard import invalidate_dashboard_cache

router = APIRouter(prefix="/api/purchases", tags=["Purchase Orders"])

_purchases_cache = None
_purchases_cache_time = 0

def invalidate_purchases_cache():
    global _purchases_cache, _purchases_cache_time
    _purchases_cache = None
    _purchases_cache_time = 0

class PurchaseCreate(BaseModel):
    supplier: str # Name or ID
    product: str # SKU or ID
    quantity: int

@router.get("")
def get_purchases(db: Session = Depends(get_db)):
    global _purchases_cache, _purchases_cache_time
    now = time.time()
    if _purchases_cache is not None and (now - _purchases_cache_time) < 30.0:
        return _purchases_cache

    # Single SQL query with JOINs for supplier and items (eliminates N+1)
    pos = (
        db.query(models.PurchaseOrder)
        .options(
            joinedload(models.PurchaseOrder.supplier),
            joinedload(models.PurchaseOrder.items),
        )
        .order_by(models.PurchaseOrder.date.desc())
        .all()
    )
    result = []
    for po in pos:
        supplier_name = po.supplier.name if po.supplier else "Direct"
        total_qty = sum(item.quantity for item in po.items) if po.items else 1
        result.append({
            "id": po.id,
            "po": po.po_number,
            "supplier": supplier_name,
            "items": total_qty,
            "total": po.total,
            "status": po.status or "Pending",
            "date": po.date.strftime("%Y-%m-%d") if po.date else datetime.utcnow().strftime("%Y-%m-%d"),
        })

    _purchases_cache = result
    _purchases_cache_time = now
    return result

@router.post("")
def create_purchase(data: PurchaseCreate, db: Session = Depends(get_db)):
    # Find supplier
    sup = db.query(models.Supplier).filter(
        (models.Supplier.name == data.supplier) | (models.Supplier.id == data.supplier)
    ).first()
    if not sup:
        sup = models.Supplier(id=f"s_{uuid.uuid4().hex[:6]}", name=data.supplier, rating=4.5)
        db.add(sup)
        db.commit()
        db.refresh(sup)

    # Find product
    prod = db.query(models.Product).filter(
        (models.Product.sku == data.product) | (models.Product.id == data.product)
    ).first()
    if not prod:
        raise HTTPException(status_code=404, detail=f"Product '{data.product}' not found.")

    qty = int(data.quantity)
    if qty <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0.")

    total_cost = round(prod.cost * qty, 2)
    po_id = f"pu_{uuid.uuid4().hex[:8]}"
    po_num = f"PO-{5580 + db.query(models.PurchaseOrder).count() + 1}"

    new_po = models.PurchaseOrder(
        id=po_id,
        po_number=po_num,
        supplier_id=sup.id,
        total=total_cost,
        status="Pending",
        date=datetime.utcnow(),
    )
    db.add(new_po)

    po_item = models.PurchaseOrderItem(
        id=f"poi_{uuid.uuid4().hex[:8]}",
        po_id=po_id,
        product_id=prod.id,
        quantity=qty,
        cost=prod.cost,
    )
    db.add(po_item)

    db.commit()
    db.refresh(new_po)
    invalidate_purchases_cache()
    invalidate_dashboard_cache()

    return {
        "id": new_po.id,
        "po": new_po.po_number,
        "supplier": sup.name,
        "items": qty,
        "total": new_po.total,
        "status": new_po.status,
        "date": new_po.date.strftime("%Y-%m-%d"),
    }

@router.put("/{po_id}/receive")
def receive_purchase_order(po_id: str, db: Session = Depends(get_db)):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.status == "Received":
        return {"status": "ok", "message": "Already received"}

    po.status = "Received"

    # Increment stock for items
    for item in po.items:
        prod = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if prod:
            prod.quantity += item.quantity
            # Record inventory audit transaction
            tx = models.InventoryTransaction(
                id=f"tx_{uuid.uuid4().hex[:8]}",
                product_id=prod.id,
                type="stock-in",
                quantity_change=item.quantity,
                timestamp=datetime.utcnow(),
                notes=f"Received PO {po.po_number}",
            )
            db.add(tx)

    db.commit()
    invalidate_purchases_cache()
    invalidate_dashboard_cache()
    from backend.routers.products import invalidate_products_cache
    invalidate_products_cache()
    return {"status": "ok", "message": f"PO {po.po_number} marked as Received and inventory updated."}
