from fastapi import APIRouter, Query

from app.schemas.mining import MiningTitleListResponse
from app.services.mining_service import MiningService


router = APIRouter(
    prefix="/api/v1/mining-titles",
    tags=["Mining"],
)

mining_service = MiningService()


@router.get(
    "/at-point",
    response_model=MiningTitleListResponse,
)
async def get_mining_titles_at_point(
    latitude: float = Query(
        ...,
        ge=-90,
        le=90,
    ),
    longitude: float = Query(
        ...,
        ge=-180,
        le=180,
    ),
):
    return await mining_service.get_titles_at_point(
        latitude=latitude,
        longitude=longitude,
    )