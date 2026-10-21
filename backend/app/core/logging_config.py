"""Configuración de logging para stdout (Azure Container Apps / local)."""

from __future__ import annotations

import logging
import sys


def configure_logging(level: str = "INFO") -> None:
    """
    Configura el root logger hacia stdout.

    No registra cuerpos de respuesta ni query strings con coordenadas.
    """
    root = logging.getLogger()
    numeric = getattr(logging, level.upper(), logging.INFO)
    root.setLevel(numeric)

    # Evitar handlers duplicados al recrear la app en tests.
    for handler in list(root.handlers):
        root.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(numeric)
    handler.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s %(levelname)s [%(name)s] %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
        )
    )
    root.addHandler(handler)

    # Reducir ruido de librerías HTTP en INFO.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
