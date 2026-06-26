import secrets
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from link_shortener.config import Settings, get_settings
from link_shortener.models import Link

BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


class LinkNotFoundError(Exception):
    pass


class LinkExpiredError(Exception):
    pass


class ShortCodeConflictError(Exception):
    pass


class ShortCodeGenerationError(Exception):
    pass


@dataclass(frozen=True)
class LinkCreateResult:
    link: Link
    created: bool


def generate_short_code(length: int) -> str:
    return "".join(secrets.choice(BASE58_ALPHABET) for _ in range(length))


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def create_link(
    db: Session,
    *,
    original_url: str,
    custom_code: str | None = None,
    expires_at: datetime | None = None,
    settings: Settings | None = None,
) -> LinkCreateResult:
    settings = settings or get_settings()
    existing = db.scalar(select(Link).where(Link.original_url == original_url))
    if existing is not None:
        return LinkCreateResult(link=existing, created=False)

    if custom_code:
        if db.scalar(select(Link).where(Link.code == custom_code)) is not None:
            raise ShortCodeConflictError("Short code is already in use.")
        return _persist_link(db, code=custom_code, original_url=original_url, expires_at=expires_at)

    for _ in range(settings.max_code_generation_attempts):
        code = generate_short_code(settings.short_code_length)
        try:
            return _persist_link(db, code=code, original_url=original_url, expires_at=expires_at)
        except ShortCodeConflictError:
            continue

    raise ShortCodeGenerationError("Could not allocate a unique short code.")


def _persist_link(db: Session, *, code: str, original_url: str, expires_at: datetime | None) -> LinkCreateResult:
    link = Link(code=code, original_url=original_url, expires_at=_as_utc(expires_at))
    db.add(link)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ShortCodeConflictError("Short code or URL already exists.") from exc
    db.refresh(link)
    return LinkCreateResult(link=link, created=True)


def get_active_link(db: Session, code: str) -> Link:
    link = db.scalar(select(Link).where(Link.code == code))
    if link is None:
        raise LinkNotFoundError("Link not found.")
    if link.is_expired:
        raise LinkExpiredError("Link has expired.")
    return link


def record_click(db: Session, link: Link) -> Link:
    link.click_count += 1
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


def count_links(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(Link)) or 0


def list_links(db: Session, *, page: int, page_size: int) -> list[Link]:
    offset = (page - 1) * page_size
    return list(
        db.scalars(
            select(Link)
            .order_by(Link.created_at.desc(), Link.id.desc())
            .offset(offset)
            .limit(page_size)
        )
    )
