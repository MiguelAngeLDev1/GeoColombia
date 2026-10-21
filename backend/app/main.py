from __future__ import annotations

import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.alerts import router as alerts_router
from app.api.earthquakes import router as earthquakes_router
from app.api.location import router as location_router
from app.api.mining import router as mining_router
from app.api.weather import router as weather_router
from app.core.exception_handlers import (
    alert_layer_error_handler,
    external_service_error_handler,
)
from app.core.exceptions import AlertLayerError, ExternalServiceError
from app.core.logging_config import configure_logging
from app.core.settings import Settings, get_settings

logger = logging.getLogger("geocolombia.api")


def create_app(settings: Settings | None = None) -> FastAPI:
    """
    Fábrica de la aplicación FastAPI.

    Permite inyectar Settings en pruebas (CORS, docs, etc.).
    """
    resolved = settings or get_settings()
    configure_logging(resolved.log_level)

    docs_url = "/docs" if resolved.api_docs_enabled else None
    redoc_url = "/redoc" if resolved.api_docs_enabled else None
    openapi_url = "/openapi.json" if resolved.api_docs_enabled else None

    application = FastAPI(
        title="GeoColombia API",
        description=(
            "API de integración de información "
            "geográfica oficial de Colombia"
        ),
        version="0.1.0",
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
    )

    origins = resolved.cors_allowed_origins()
    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["GET", "OPTIONS"],
        allow_headers=["Accept", "Content-Type"],
    )

    @application.middleware("http")
    async def request_timing_middleware(
        request: Request,
        call_next,
    ):
        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - started) * 1000
        # Solo path (sin query) para no registrar coordenadas precisas.
        logger.info(
            "%s %s -> %s (%.1f ms)",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
        return response

    application.add_exception_handler(
        ExternalServiceError,
        external_service_error_handler,
    )
    application.add_exception_handler(
        AlertLayerError,
        alert_layer_error_handler,
    )

    application.include_router(earthquakes_router)
    application.include_router(mining_router)
    application.include_router(location_router)
    application.include_router(weather_router)
    application.include_router(alerts_router)

    @application.get("/")
    def root():
        return {
            "name": "GeoColombia API",
            "version": "0.1.0",
        }

    @application.get("/health")
    def health():
        return {
            "status": "healthy",
            "service": "geocolombia-api",
        }

    application.state.settings = resolved
    return application


app = create_app()
