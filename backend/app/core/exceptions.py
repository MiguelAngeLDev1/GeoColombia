class ExternalServiceError(Exception):
    """Raised when an external data provider fails."""

    def __init__(
        self,
        service: str,
        message: str,
    ):
        self.service = service
        self.message = message

        super().__init__(message)


class AlertLayerError(Exception):
    """Errores de consulta de capas IDEAM (validación o límites)."""

    def __init__(
        self,
        message: str,
        *,
        code: str = "alert_layer_error",
        status_code: int = 400,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)