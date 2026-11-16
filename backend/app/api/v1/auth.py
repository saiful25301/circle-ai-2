from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.user import User
from app.schemas.auth import LoginRequest, Token, UserResponse, UserCreate
from app.api.deps import get_current_user, require_admin

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate staff user (Admin or Support Agent) and return JWT access token."""
    email_clean = payload.email.strip().lower()
    result = await db.execute(select(User).where(User.email == email_clean))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact Circle NOC Administrator."
        )

    access_token = create_access_token(
        subject=user.id,
        extra_claims={"role": user.role, "email": user.email}
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        full_name=user.full_name,
        email=user.email
    )


@router.get("/me", response_model=UserResponse)
async def get_current_auth_user(current_user: User = Depends(get_current_user)):
    """Get the currently logged-in user profile from Bearer JWT token."""
    return current_user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: UserCreate,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin-only endpoint to create a new staff or agent user."""
    email_clean = payload.email.strip().lower()
    existing = await db.execute(select(User).where(User.email == email_clean))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    new_user = User(
        email=email_clean,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        is_active=True
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user
