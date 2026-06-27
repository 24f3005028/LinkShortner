from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer

from clerk_backend_api import AuthenticateRequestOptions, authenticate_request
from clerk_backend_api.security.types import AuthErrorReason

from link_shortener.config import Settings, get_settings


bearer_scheme = HTTPBearer(auto_error=False)


def _authenticate_request(request: Request, settings: Settings):
    if not settings.clerk_secret_key:
        return None

    return authenticate_request(
        request,
        AuthenticateRequestOptions(
            secret_key=settings.clerk_secret_key,
            jwt_key=settings.clerk_jwt_key,
            authorized_parties=settings.clerk_authorized_parties or None,
            accepts_token=["session_token"],
        ),
    )


def get_current_user_id(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> str:
    """Required auth: raises 401 if no valid token."""
    state = _authenticate_request(request, settings)
    if state is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Clerk is not configured.",
        )

    if not state.is_signed_in or not state.payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=state.message or "Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = state.payload.get("sub")
    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user_id


def get_current_user_id_optional(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> str | None:
    """Optional auth: returns user_id if valid token, None if no token, raises 401 for invalid token."""
    state = _authenticate_request(request, settings)
    if state is None:
        return None

    if not state.is_signed_in:
        if state.reason == AuthErrorReason.SESSION_TOKEN_MISSING:
            return None
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=state.message or "Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not state.payload:
        return None

    user_id = state.payload.get("sub")
    if not isinstance(user_id, str) or not user_id:
        return None

    return user_id