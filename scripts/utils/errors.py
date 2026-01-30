"""
Deprecated: Use exceptions.py instead.

This module provides backward compatibility aliases for the legacy error classes.
New code should import directly from exceptions.py.
"""

from .exceptions import BuildError, ContentError

# Backward compatibility aliases
# FrontmatterParsingError and MetadataParsingError are now ContentError
FrontmatterParsingError = ContentError
MetadataParsingError = ContentError

__all__ = [
    "BuildError",
    "FrontmatterParsingError",
    "MetadataParsingError",
]
