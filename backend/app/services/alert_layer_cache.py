"""
Caché en memoria para capas IDEAM.

Funciona por proceso/instancia: no es compartida entre réplicas.
No cachea errores.
"""

from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass
from threading import Lock
import time
from typing import Any


@dataclass
class CacheEntry:
    value: dict[str, Any]
    expires_at: float
    size_bytes: int


class AlertLayerCache:
    def __init__(
        self,
        *,
        ttl_seconds: int = 600,
        max_entries: int = 64,
        max_total_bytes: int = 32_000_000,
    ):
        self.ttl_seconds = ttl_seconds
        self.max_entries = max_entries
        self.max_total_bytes = max_total_bytes
        self._entries: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = Lock()
        self._total_bytes = 0

    def get(self, key: str) -> dict[str, Any] | None:
        now = time.monotonic()
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return None
            if entry.expires_at <= now:
                self._entries.pop(key, None)
                self._total_bytes -= entry.size_bytes
                return None
            self._entries.move_to_end(key)
            return entry.value

    def set(
        self,
        key: str,
        value: dict[str, Any],
        *,
        size_bytes: int,
        ttl_seconds: int | None = None,
    ) -> None:
        if size_bytes <= 0:
            return

        ttl = self.ttl_seconds if ttl_seconds is None else ttl_seconds
        expires_at = time.monotonic() + ttl
        with self._lock:
            existing = self._entries.pop(key, None)
            if existing is not None:
                self._total_bytes -= existing.size_bytes

            while (
                self._entries
                and (
                    len(self._entries) >= self.max_entries
                    or self._total_bytes + size_bytes
                    > self.max_total_bytes
                )
            ):
                _, removed = self._entries.popitem(last=False)
                self._total_bytes -= removed.size_bytes

            self._entries[key] = CacheEntry(
                value=value,
                expires_at=expires_at,
                size_bytes=size_bytes,
            )
            self._total_bytes += size_bytes

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()
            self._total_bytes = 0
