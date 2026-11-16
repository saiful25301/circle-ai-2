from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.user import User
from app.schemas.auth import LoginRequest, Token, UserResponse, UserCreate

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    # Check database for user
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalars().first()

    # Default admin backdoor for instant testing if database is fresh
    if not user and payload.email == "admin@circleai.local" and payload.password == "admin123":
        access_token = create_access_token(subject="admin-demo-id")
        return Token(
            access_token=access_token,
            role="admin",
            full_name="Circle Admin",
            email="admin@circleai.local"
        )

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=user.id)
    return Token(
        access_token=access_token,
        role=user.role,
        full_name=user.full_name,
        email=user.email
    )


@router.post("/seed-admin")
async def seed_admin(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == "admin@circlenetwork.com.bd"))
    existing = result.scalars().first()
    if existing:
        return {"status": "ok", "message": "Admin already seeded"}

    new_admin = User(
        email="admin@circlenetwork.com.bd",
        full_name="Circle NOC Manager",
        hashed_password=get_password_hash("Circle@2026"),
        role="admin"
    )
    db.add(new_admin)
    await db.commit()
    return {"status": "created", "email": new_admin.email}
