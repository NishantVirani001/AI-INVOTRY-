import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
import backend.models.core as models

router = APIRouter(prefix="/api/products", tags=["Products"])

class ProductCreateUpdate(BaseModel):
    name: str
    sku: str
    category: str # name or id
    supplier: str # name or id
    price: float
    cost: float
    quantity: int
    reorderLevel: int

def format_product(p: models.Product, db: Session):
    cat_name = p.category_obj.name if p.category_obj else (p.category_id or "General")
    sup_name = p.supplier_obj.name if p.supplier_obj else (p.supplier_id or "Direct")
    
    if p.quantity <= 0:
        status = "out"
    elif p.quantity <= p.reorder_level:
        status = "low"
    else:
        status = "in"

    # Simple velocity heuristic for now (based on quantity/reorder ratio)
    velocity = "fast" if p.reorder_level >= 15 else "slow"

    return {
        "id": p.id,
        "sku": p.sku,
        "name": p.name,
        "category": cat_name,
        "categoryId": p.category_id,
        "supplier": sup_name,
        "supplierId": p.supplier_id,
        "price": p.price,
        "cost": p.cost,
        "quantity": p.quantity,
        "reorderLevel": p.reorder_level,
        "stockStatus": status,
        "velocity": velocity,
        "expiry": p.expiry_date.strftime("%Y-%m-%d") if p.expiry_date else None,
        "updated": datetime.utcnow().strftime("%Y-%m-%d"),
    }

@router.get("")
def get_products(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(models.Product)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter((models.Product.name.ilike(s)) | (models.Product.sku.ilike(s)))
    
    products = query.all()
    formatted = [format_product(p, db) for p in products]

    if category and category != "all":
        formatted = [p for p in formatted if p["category"] == category or p["categoryId"] == category]

    if status and status != "all":
        formatted = [p for p in formatted if p["stockStatus"] == status]

    return formatted

@router.get("/{product_id}")
def get_product(product_id: str, db: Session = Depends(get_db)):
    p = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return format_product(p, db)

@router.post("", status_code=status.HTTP_201_CREATED)
def create_product(data: ProductCreateUpdate, db: Session = Depends(get_db)):
    # Check duplicate SKU
    existing = db.query(models.Product).filter(models.Product.sku == data.sku.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Product SKU '{data.sku}' already exists.")

    # Match or create category
    cat = db.query(models.Category).filter(
        (models.Category.id == data.category) | (models.Category.name == data.category)
    ).first()
    if not cat:
        cat = models.Category(id=f"c_{uuid.uuid4().hex[:6]}", name=data.category, description="")
        db.add(cat)
        db.commit()
        db.refresh(cat)

    # Match or create supplier
    sup = db.query(models.Supplier).filter(
        (models.Supplier.id == data.supplier) | (models.Supplier.name == data.supplier)
    ).first()
    if not sup:
        sup = models.Supplier(id=f"s_{uuid.uuid4().hex[:6]}", name=data.supplier, contact="", email="", phone="", rating=4.5)
        db.add(sup)
        db.commit()
        db.refresh(sup)

    new_p = models.Product(
        id=f"p_{uuid.uuid4().hex[:8]}",
        sku=data.sku.strip(),
        name=data.name.strip(),
        category_id=cat.id,
        supplier_id=sup.id,
        price=float(data.price),
        cost=float(data.cost),
        quantity=int(data.quantity),
        reorder_level=int(data.reorderLevel),
        safety_stock=max(1, int(int(data.reorderLevel) * 0.3)),
    )
    db.add(new_p)
    db.commit()
    db.refresh(new_p)
    return format_product(new_p, db)

@router.put("/{product_id}")
def update_product(product_id: str, data: ProductCreateUpdate, db: Session = Depends(get_db)):
    p = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")

    # If SKU changed, check uniqueness
    if data.sku.strip() != p.sku:
        existing = db.query(models.Product).filter(models.Product.sku == data.sku.strip()).first()
        if existing and existing.id != product_id:
            raise HTTPException(status_code=400, detail=f"SKU '{data.sku}' is already in use.")

    # Category resolution
    cat = db.query(models.Category).filter(
        (models.Category.id == data.category) | (models.Category.name == data.category)
    ).first()
    if cat:
        p.category_id = cat.id

    # Supplier resolution
    sup = db.query(models.Supplier).filter(
        (models.Supplier.id == data.supplier) | (models.Supplier.name == data.supplier)
    ).first()
    if sup:
        p.supplier_id = sup.id

    p.sku = data.sku.strip()
    p.name = data.name.strip()
    p.price = float(data.price)
    p.cost = float(data.cost)
    p.quantity = int(data.quantity)
    p.reorder_level = int(data.reorderLevel)

    db.commit()
    db.refresh(p)
    return format_product(p, db)

@router.delete("/{product_id}")
def delete_product(product_id: str, db: Session = Depends(get_db)):
    p = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(p)
    db.commit()
    return {"status": "ok", "message": f"Product {product_id} deleted"}

class AdjustStockRequest(BaseModel):
    delta: int
    reason: Optional[str] = "Manual floor scanner adjustment"

@router.post("/{product_id}/adjust")
def adjust_product_stock(product_id: str, data: AdjustStockRequest, db: Session = Depends(get_db)):
    p = db.query(models.Product).filter(
        (models.Product.id == product_id) | (models.Product.sku == product_id)
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")

    new_qty = p.quantity + data.delta
    if new_qty < 0:
        raise HTTPException(status_code=400, detail="Stock cannot be negative")

    p.quantity = new_qty
    tx_type = "stock-in" if data.delta > 0 else "stock-out" if data.delta < 0 else "adjustment"
    tx = models.InventoryTransaction(
        id=f"tx_{uuid.uuid4().hex[:8]}",
        product_id=p.id,
        type=tx_type,
        quantity_change=data.delta,
        timestamp=datetime.utcnow(),
        notes=data.reason,
    )
    db.add(tx)
    db.commit()
    db.refresh(p)
    return format_product(p, db)

class ShelfAuditRequest(BaseModel):
    sku: str
    detected_count: int
    auto_reconcile: bool = False
    notes: Optional[str] = "Mobile Edge CV Shelf Scan"

@router.post("/shelf-audit")
def shelf_audit(data: ShelfAuditRequest, db: Session = Depends(get_db)):
    p = db.query(models.Product).filter(
        (models.Product.sku == data.sku) | (models.Product.id == data.sku)
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail=f"Product with SKU '{data.sku}' not found")

    expected = p.quantity
    detected = data.detected_count
    discrepancy = detected - expected

    reconciled = False
    if data.auto_reconcile and discrepancy != 0:
        p.quantity = detected
        tx = models.InventoryTransaction(
            id=f"tx_{uuid.uuid4().hex[:8]}",
            product_id=p.id,
            type="adjustment",
            quantity_change=discrepancy,
            timestamp=datetime.utcnow(),
            notes=f"{data.notes}: Audited count {detected} (was {expected}, diff: {discrepancy})",
        )
        db.add(tx)
        db.commit()
        db.refresh(p)
        reconciled = True

    return {
        "status": "success",
        "sku": p.sku,
        "productName": p.name,
        "expectedCount": expected,
        "detectedCount": detected,
        "discrepancy": discrepancy,
        "reconciled": reconciled,
        "currentStock": p.quantity,
        "timestamp": datetime.utcnow().isoformat(),
    }
