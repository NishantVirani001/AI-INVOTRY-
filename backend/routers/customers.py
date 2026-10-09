import time
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from backend.database import get_db
import backend.models.core as models

router = APIRouter(prefix="/api/customers", tags=["Customers"])

_customers_cache = {}
_customers_cache_time = 0

def invalidate_customers_cache():
    global _customers_cache, _customers_cache_time
    _customers_cache = {}
    _customers_cache_time = 0

class CustomerCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

@router.get("")
def get_customers(search: Optional[str] = Query(None), db: Session = Depends(get_db)):
    global _customers_cache, _customers_cache_time
    now_ts = time.time()
    cache_key = (search or "").strip().lower()
    if (now_ts - _customers_cache_time) < 60.0 and cache_key in _customers_cache:
        return _customers_cache[cache_key]

    query = db.query(models.Customer)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(models.Customer.name.ilike(s) | models.Customer.email.ilike(s))
    
    customers = query.order_by(models.Customer.name.asc()).all()
    result = [
        {
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "phone": c.phone or "",
            "totalOrders": c.total_orders,
            "totalSpent": c.total_spent,
            "lastOrder": c.last_order_date.strftime("%Y-%m-%d") if c.last_order_date else None,
        }
        for c in customers
    ]
    _customers_cache[cache_key] = result
    _customers_cache_time = now_ts
    return result

@router.post("", status_code=status.HTTP_201_CREATED)
def create_customer(data: CustomerCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Customer).filter(models.Customer.email == data.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Customer with email '{data.email}' already exists.")

    new_c = models.Customer(
        id=f"cu_{uuid.uuid4().hex[:8]}",
        name=data.name.strip(),
        email=data.email.strip().lower(),
        phone=data.phone.strip() if data.phone else "",
        total_orders=0,
        total_spent=0.0,
        last_order_date=None,
        created_at=datetime.utcnow(),
    )
    db.add(new_c)
    db.commit()
    db.refresh(new_c)
    invalidate_customers_cache()

    return {
        "id": new_c.id,
        "name": new_c.name,
        "email": new_c.email,
        "phone": new_c.phone,
        "totalOrders": 0,
        "totalSpent": 0.0,
        "lastOrder": None,
    }

@router.delete("/{customer_id}")
def delete_customer(customer_id: str, db: Session = Depends(get_db)):
    c = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found.")

    db.delete(c)
    db.commit()
    invalidate_customers_cache()
    return {"status": "ok", "message": f"Customer '{customer_id}' deleted."}
