import time
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database import get_db
import backend.models.core as models

router = APIRouter(prefix="/api/categories", tags=["Categories"])

_categories_cache = None
_categories_cache_time = 0

def invalidate_categories_cache():
    global _categories_cache, _categories_cache_time
    _categories_cache = None
    _categories_cache_time = 0
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

class CategoryCreate(BaseModel):
    name: str
    description: str = ""

@router.get("")
def get_categories(db: Session = Depends(get_db)):
    global _categories_cache, _categories_cache_time
    now = time.time()
    if _categories_cache is not None and (now - _categories_cache_time) < 60.0:
        return _categories_cache

    categories = db.query(models.Category).all()
    # 1 single query for all product counts across categories
    counts = dict(
        db.query(models.Product.category_id, func.count(models.Product.id))
        .filter(models.Product.category_id.isnot(None))
        .group_by(models.Product.category_id)
        .all()
    )

    result = [
        {
            "id": c.id,
            "name": c.name,
            "productCount": counts.get(c.id, 0),
            "description": c.description or "",
        }
        for c in categories
    ]
    _categories_cache = result
    _categories_cache_time = now
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
    invalidate_categories_cache()
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
    invalidate_categories_cache()
    return {"status": "ok"}
