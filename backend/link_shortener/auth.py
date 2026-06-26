from fastapi import Depends, HTTPException, Request, status

from clerk_backend_api import AuthenticateRequestOptions, authenticate_request

from link_shortener.config import Settings, get_settings


def get_current_user_id(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> str:
    if not settings.clerk_secret_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Clerk is not configured.",
        )

    state = authenticate_request(
        request,
        AuthenticateRequestOptions(
            secret_key=settings.clerk_secret_key,
            jwt_key=settings.clerk_jwt_key,
            authorized_parties=settings.clerk_authorized_parties or None,
            accepts_token=["session_token"],
        ),
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