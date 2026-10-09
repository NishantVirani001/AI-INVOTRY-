import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
import backend.models.core as models

router = APIRouter(prefix="/api/suppliers", tags=["Suppliers"])

class SupplierCreate(BaseModel):
    name: str
    contact: str = ""
    email: str = ""
    phone: str = ""
    rating: float = 4.5

@router.get("")
def get_suppliers(db: Session = Depends(get_db)):
    suppliers = db.query(models.Supplier).all()
    result = []
    for s in suppliers:
        count = db.query(models.Product).filter(models.Product.supplier_id == s.id).count()
        result.append({
            "id": s.id,
            "name": s.name,
            "contact": s.contact or "",
            "email": s.email or "",
            "phone": s.phone or "",
            "rating": s.rating or 4.0,
            "productsSupplied": count,
        })
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
    return {"status": "ok"}
