from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.exceptions import ExternalServiceError


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