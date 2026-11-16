from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.package import Package

router = APIRouter()


@router.get("/", response_model=List[dict])
async def list_packages(db: AsyncSession = Depends(get_db)):
    """List all Circle Network ISP internet packages."""
    result = await db.execute(select(Package).where(Package.is_active == True))
    packages = result.scalars().all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "code": p.code,
            "bandwidth_mbps": p.bandwidth_mbps,
            "bdix_speed_mbps": p.bdix_speed_mbps,
            "monthly_price_bdt": p.monthly_price_bdt,
            "description": p.description,
            "is_active": p.is_active,
        }
        for p in packages
    ]


@router.get("/{package_id}")
async def get_package(package_id: str, db: AsyncSession = Depends(get_db)):
    """Get package details by ID."""
    result = await db.execute(select(Package).where(Package.id == package_id))
    pkg = result.scalar_one_or_none()
    if not pkg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")
    return {
        "id": pkg.id,
        "name": pkg.name,
        "code": pkg.code,
        "bandwidth_mbps": pkg.bandwidth_mbps,
        "bdix_speed_mbps": pkg.bdix_speed_mbps,
        "monthly_price_bdt": pkg.monthly_price_bdt,
        "description": pkg.description,
    }
