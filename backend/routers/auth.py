import uuid
import random
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from backend.database import get_db
import backend.models.core as models
from backend.auth_utils import verify_password, hash_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "Staff"

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    avatarColor: str | None = None

    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email.strip().lower()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    token = create_access_token(data={"sub": user.id, "role": user.role})
    user_data = UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        avatarColor=user.avatar_color,
    )
    return LoginResponse(access_token=token, user=user_data)

@router.post("/signup", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    clean_email = req.email.strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid email address is required",
        )

    existing = db.query(models.User).filter(models.User.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    if len(req.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long",
        )

    user_id = f"u_{uuid.uuid4().hex[:8]}"
    avatar_colors = ["#F5C518", "#4C8DFF", "#33C481", "#FF5722", "#9C27B0", "#00BCD4", "#E91E63"]
    avatar_color = random.choice(avatar_colors)
    
    # Standardize role name
    role_formatted = req.role.capitalize() if req.role else "Admin"
    if role_formatted not in ["Admin", "Manager", "Employee", "Staff", "Customer"]:
        role_formatted = "Customer" if "cust" in req.role.lower() else "Admin"

    new_user = models.User(
        id=user_id,
        name=req.name.strip(),
        email=clean_email,
        hashed_password=hash_password(req.password),
        role=role_formatted,
        avatar_color=avatar_color,
    )
    db.add(new_user)

    # If registering as a Customer, ensure customer profile entity exists
    if role_formatted == "Customer":
        cust = db.query(models.Customer).filter(models.Customer.email == clean_email).first()
        if not cust:
            new_cust = models.Customer(
                id=f"cu_{uuid.uuid4().hex[:8]}",
                name=req.name.strip(),
                email=clean_email,
                phone="",
                total_orders=0,
                total_spent=0.0,
            )
            db.add(new_cust)

    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": new_user.id, "role": new_user.role})
    user_data = UserResponse(
        id=new_user.id,
        name=new_user.name,
        email=new_user.email,
        role=new_user.role,
        avatarColor=new_user.avatar_color,
    )
    return LoginResponse(access_token=token, user=user_data)

@router.get("/me", response_model=UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        avatarColor=current_user.avatar_color,
    )
