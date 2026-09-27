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