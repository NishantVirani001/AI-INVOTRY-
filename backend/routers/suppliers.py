import time
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database import get_db
import backend.models.core as models

router = APIRouter(prefix="/api/suppliers", tags=["Suppliers"])

_suppliers_cache = None
_suppliers_cache_time = 0

def invalidate_suppliers_cache():
    global _suppliers_cache, _suppliers_cache_time
    _suppliers_cache = None
    _suppliers_cache_time = 0
    try:
        from backend.routers.dashboard import invalidate_dashboard_cache
        invalidate_dashboard_cache()
    except Exception:
        pass
    try:
        from backend.routers.products import invalidate_products_cache
        invalidate_products_cache()
    except Exception:
        pass

class SupplierCreate(BaseModel):
    name: str
    contact: str = ""
    email: str = ""
    phone: str = ""
    rating: float = 4.5

@router.get("")
def get_suppliers(db: Session = Depends(get_db)):
    global _suppliers_cache, _suppliers_cache_time
    now = time.time()
    if _suppliers_cache is not None and (now - _suppliers_cache_time) < 60.0:
        return _suppliers_cache

    suppliers = db.query(models.Supplier).all()
    # Batch query product counts per supplier
    counts = dict(
        db.query(models.Product.supplier_id, func.count(models.Product.id))
        .filter(models.Product.supplier_id.isnot(None))
        .group_by(models.Product.supplier_id)
        .all()
    )

    result = [
        {
            "id": s.id,
            "name": s.name,
            "contact": s.contact or "",
            "email": s.email or "",
            "phone": s.phone or "",
            "rating": s.rating or 4.0,
            "productsSupplied": counts.get(s.id, 0),
        }
        for s in suppliers
    ]
    _suppliers_cache = result
    _suppliers_cache_time = now
    return result

@router.post("")
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db)):
    new_s = models.Supplier(
        id=f"s_{uuid.uuid4().hex[:6]}",
        name=data.name.strip(),
        contact=data.contact.strip(),
        email=data.email.strip(),
        phone=data.phone.strip(),
        rating=float(data.rating),
    )
    db.add(new_s)
    db.commit()
    db.refresh(new_s)
    invalidate_suppliers_cache()
    return {
        "id": new_s.id,
        "name": new_s.name,
        "contact": new_s.contact,
        "email": new_s.email,
        "phone": new_s.phone,
        "rating": new_s.rating,
        "productsSupplied": 0,
    }

@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: str, db: Session = Depends(get_db)):
    s = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    in_use = db.query(models.Product).filter(models.Product.supplier_id == supplier_id).count()
    if in_use > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete supplier: {in_use} products linked.")

    db.delete(s)
    db.commit()
    invalidate_suppliers_cache()
    return {"status": "ok"}
