"""Shared FastAPI dependencies for route handlers."""

from fastapi import Depends, HTTPException, Request, status


def get_current_user(request: Request) -> dict:
    """Extract the authenticated user dict set by `LoadUserData` middleware.

    Raises 401 when the middleware did not populate `request.state.user`
    (missing/invalid token or unauthenticated request to a protected route).
    """
    user = request.state.user
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not authorized",
        )
    return user
