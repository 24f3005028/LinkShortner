from contextlib import asynccontextmanager
from datetime import datetime, timezone
from urllib.parse import urljoin

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session

from link_shortener.config import get_settings
from link_shortener.auth import bearer_scheme, get_current_user_id, get_current_user_id_optional
from link_shortener.models import Link
from link_shortener.database import get_db, init_db
from link_shortener.schemas import LinkCreate, LinkRead, LinkStats, PaginatedLinks, UnlockRequest
from link_shortener.services import (
    InvalidPasswordError,
    LinkExpiredError,
    LinkLockedError,
    LinkNotFoundError,
    ShortCodeConflictError,
    ShortCodeGenerationError,
    count_links,
    create_link,
    get_active_link,
    list_links,
    record_click,
    verify_password,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=get_settings().app_name,
    version="1.0.0",
    description="A small FastAPI link-shortener service with PostgreSQL persistence.",
    lifespan=lifespan,
    swagger_ui_parameters={"persistAuthorization": True},
)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    schema.setdefault("components", {}).setdefault("securitySchemes", {})["BearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "Paste your Clerk session JWT here.",
    }

    for path_item in schema.get("paths", {}).values():
        for operation in path_item.values():
            if isinstance(operation, dict) and any(tag in {"links", "auth"} for tag in operation.get("tags", [])):
                operation.setdefault("security", [{"BearerAuth": []}])

    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi


def _build_link_read(request: Request, link: Link) -> LinkRead:
    short_url = urljoin(str(request.base_url), link.code)
    return LinkRead(
        code=link.code,
        original_url=link.original_url,
        short_url=short_url,
        click_count=link.click_count,
        created_at=link.created_at,
        expires_at=link.expires_at,
        is_locked=link.is_locked,
    )


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get(
    "/auth/me",
    tags=["auth"],
    summary="Validate Bearer token and return current user ID",
    description="Pass your Clerk session JWT as Authorization: Bearer <token> to verify it before testing protected endpoints.",
)
def auth_me(
    user_id: str = Depends(get_current_user_id),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, str | bool | None]:
    token_prefix = None
    if credentials is not None and credentials.credentials:
        token_prefix = f"{credentials.credentials[:12]}..."
    return {"user_id": user_id, "authenticated": True, "token_prefix": token_prefix}


@app.post(
    "/links",
    response_model=LinkRead,
    status_code=status.HTTP_201_CREATED,
    tags=["links"],
)
def create_short_link(
    payload: LinkCreate,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> LinkRead:
    expires_at = payload.expires_at
    if expires_at is not None:
        normalized = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=timezone.utc)
        if normalized <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="expires_at must be in the future.",
            )
    try:
        result = create_link(
            db,
            original_url=str(payload.url),
            custom_code=payload.custom_code,
            expires_at=payload.expires_at,
            owner_id=user_id,
            password=payload.password,
        )
    except ShortCodeConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ShortCodeGenerationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    if not result.created:
        response.status_code = status.HTTP_200_OK

    return _build_link_read(request, result.link)


@app.get("/links", response_model=PaginatedLinks, tags=["links"])
def list_short_links(
    request: Request,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> PaginatedLinks:
    links = list_links(db, page=page, page_size=page_size, owner_id=user_id)
    return PaginatedLinks(
        items=[_build_link_read(request, link) for link in links],
        total=count_links(db, owner_id=user_id),
        page=page,
        page_size=page_size,
    )


@app.get("/links/{code}/stats", response_model=LinkStats, tags=["links"])
def link_stats(
    code: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> LinkStats:
    link = db.query(Link).filter(Link.code == code, Link.owner_id == user_id).first()
    if link is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found.")
    if link.is_expired:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Link has expired.")
    return LinkStats(
        code=link.code,
        original_url=link.original_url,
        click_count=link.click_count,
        created_at=link.created_at,
        expires_at=link.expires_at,
        is_locked=link.is_locked,
    )


@app.post(
    "/{code}/unlock",
    tags=["redirect"],
    summary="Verify password and get redirect URL for a locked link",
    description=(
        "Submit the password for a locked short link. "
        "Returns the destination URL on success so the client can redirect."
    ),
    include_in_schema=True,
)
def unlock_link(
    code: str,
    payload: UnlockRequest,
    db: Session = Depends(get_db),
) -> JSONResponse:
    try:
        link = get_active_link(db, code)
    except LinkNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found.") from exc
    except LinkExpiredError as exc:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Link has expired.") from exc

    if not link.is_locked:
        # Not locked — just return the URL directly
        record_click(db, link)
        return JSONResponse({"url": link.original_url})

    if not verify_password(payload.password, link.password_hash):  # type: ignore[arg-type]
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password.")

    record_click(db, link)
    return JSONResponse({"url": link.original_url})


@app.get("/{code}", include_in_schema=False)
def redirect_to_original(code: str, db: Session = Depends(get_db)) -> Response:
    try:
        link = get_active_link(db, code)
    except LinkNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found.") from exc
    except LinkExpiredError as exc:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Link has expired.") from exc

    # If the link is locked, return 423 Locked with a JSON body so the
    # frontend knows to show the password prompt instead of redirecting.
    if link.is_locked:
        return JSONResponse(
            status_code=423,
            content={"locked": True, "code": link.code},
            headers={"Cache-Control": "no-store"},
        )

    record_click(db, link)
    return RedirectResponse(
        url=link.original_url,
        status_code=status.HTTP_302_FOUND,
        headers={"Cache-Control": "no-store"},
    )
