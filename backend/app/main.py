from fastapi import FastAPI

from app.api.earthquakes import router as earthquakes_router
from app.api.location import router as location_router
from app.api.mining import router as mining_router
from app.api.weather import router as weather_router
from app.core.exception_handlers import external_service_error_handler
from app.core.exceptions import ExternalServiceError
from app.api.alerts import router as alerts_router


app = FastAPI(
    title="GeoColombia API",
    description=(
        "API de integración de información "
        "geográfica oficial de Colombia"
    ),
    version="0.1.0",
)


app.add_exception_handler(
    ExternalServiceError,
    external_service_error_handler,
)


app.include_router(earthquakes_router)
app.include_router(mining_router)
app.include_router(location_router)
app.include_router(weather_router)
app.include_router(alerts_router)

@app.get("/")
def root():
    return {
        "name": "GeoColombia API",
        "version": "0.1.0",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "geocolombia-api",
    }