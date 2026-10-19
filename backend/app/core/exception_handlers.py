from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.exceptions import AlertLayerError, ExternalServiceError


async def external_service_error_handler(
    request: Request,
    exc: ExternalServiceError,
) -> JSONResponse:
    return JSONResponse(
        status_code=502,
        content={
            "error": "external_service_error",
            "service": exc.service,
            "message": exc.message,
        },
    )


async def alert_layer_error_handler(
    request: Request,
    exc: AlertLayerError,
) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.code,
            "message": exc.message,
        },
    )