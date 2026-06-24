from contextlib import asynccontextmanager
from datetime import datetime, timezone
from urllib.parse import urljoin

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from backend.link_shortener.config import get_settings
from backend.link_shortener.database import get_db, init_db
from backend.link_shortener.schemas import LinkCreate, LinkRead, LinkStats, PaginatedLinks
from backend.link_shortener.services import (
    LinkExpiredError,
    LinkNotFoundError,
    ShortCodeConflictError,
    ShortCodeGenerationError,
    count_links,
    create_link,
    get_active_link,
    list_links,
    record_click,
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
)


def _build_link_read(request: Request, link) -> LinkRead:
    short_url = urljoin(str(request.base_url), link.code)
    return LinkRead(
        code=link.code,
        original_url=link.original_url,
        short_url=short_url,
        click_count=link.click_count,
        created_at=link.created_at,
        expires_at=link.expires_at,
    )


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}


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
) -> LinkRead:
    expires_at = payload.expires_at
    if expires_at is not None:
        normalized = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=timezone.utc)
        if normalized <= datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="expires_at must be in the future.")
    try:
        result = create_link(
            db,
            original_url=str(payload.url),
            custom_code=payload.custom_code,
            expires_at=payload.expires_at,
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
) -> PaginatedLinks:
    links = list_links(db, page=page, page_size=page_size)
    return PaginatedLinks(
        items=[_build_link_read(request, link) for link in links],
        total=count_links(db),
        page=page,
        page_size=page_size,
    )


@app.get("/links/{code}/stats", response_model=LinkStats, tags=["links"])
def link_stats(code: str, db: Session = Depends(get_db)) -> LinkStats:
    try:
        link = get_active_link(db, code)
    except LinkNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found.") from exc
    except LinkExpiredError as exc:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Link has expired.") from exc

    return LinkStats.model_validate(link)


@app.get("/{code}", include_in_schema=False)
def redirect_to_original(code: str, db: Session = Depends(get_db)) -> RedirectResponse:
    try:
        link = get_active_link(db, code)
    except LinkNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found.") from exc
    except LinkExpiredError as exc:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Link has expired.") from exc

    record_click(db, link)
    return RedirectResponse(
        url=link.original_url,
        status_code=status.HTTP_301_MOVED_PERMANENTLY,
        headers={"Cache-Control": "no-store"},
    )


