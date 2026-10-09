import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
import backend.models.core as models

router = APIRouter(prefix="/api/categories", tags=["Categories"])

class CategoryCreate(BaseModel):
    name: str
    description: str = ""

@router.get("")
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(models.Category).all()
    result = []
    for c in categories:
        count = db.query(models.Product).filter(models.Product.category_id == c.id).count()
        result.append({
            "id": c.id,
            "name": c.name,
            "productCount": count,
            "description": c.description or "",
        })
    return result

@router.post("")
def create_category(data: CategoryCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Category).filter(models.Category.name == data.name.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    new_cat = models.Category(
        id=f"c_{uuid.uuid4().hex[:6]}",
        name=data.name.strip(),
        description=data.description.strip(),
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return {
        "id": new_cat.id,
        "name": new_cat.name,
        "productCount": 0,
        "description": new_cat.description,
    }

@router.delete("/{category_id}")
def delete_category(category_id: str, db: Session = Depends(get_db)):
    cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check if products exist in category
    in_use = db.query(models.Product).filter(models.Product.category_id == category_id).count()
    if in_use > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete category: {in_use} products are assigned to it.")

    db.delete(cat)
    db.commit()
    return {"status": "ok"}
