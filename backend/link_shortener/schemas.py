from datetime import datetime
from typing import Annotated

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, field_validator


CodeField = Annotated[
    str,
    Field(
        min_length=3,
        max_length=32,
        pattern=r"^[A-Za-z0-9_-]+$",
        description="URL-safe short code containing letters, numbers, underscores, or hyphens.",
    ),
]


class LinkCreate(BaseModel):
    url: AnyHttpUrl = Field(description="Destination URL to shorten.")
    custom_code: CodeField | None = Field(default=None, description="Optional caller-selected code.")
    expires_at: datetime | None = Field(default=None, description="Optional UTC expiry timestamp.")
    password: str | None = Field(
        default=None,
        min_length=1,
        max_length=128,
        description="Optional password to lock the link. Visitors must enter this to be redirected.",
    )

    @field_validator("custom_code")
    @classmethod
    def normalize_custom_code(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip()


class LinkRead(BaseModel):
    code: str
    original_url: str
    short_url: str
    click_count: int
    created_at: datetime
    expires_at: datetime | None = None
    is_locked: bool = False

    model_config = ConfigDict(from_attributes=True)


class LinkStats(BaseModel):
    code: str
    original_url: str
    click_count: int
    created_at: datetime
    expires_at: datetime | None = None
    is_locked: bool = False

    model_config = ConfigDict(from_attributes=True)


class PaginatedLinks(BaseModel):
    items: list[LinkRead]
    total: int
    page: int
    page_size: int


class UnlockRequest(BaseModel):
    password: str = Field(description="Password to unlock the link.")
