from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Link Shortener API"
    database_url: str
    clerk_secret_key: str | None = None
    clerk_jwt_key: str | None = None
    clerk_authorized_parties: list[str] = Field(default_factory=list)
    cors_allowed_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "https://linkshortener.brewwithcrew.com",
        ]
    )
    short_code_length: int = 7
    max_code_generation_attempts: int = 8

    model_config = SettingsConfigDict(env_file=".env", env_prefix="LINK_SHORTENER_")

    @field_validator("clerk_authorized_parties", mode="before")
    @classmethod
    def parse_authorized_parties(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [party.strip() for party in value.split(",") if party.strip()]
        return value

    @field_validator("cors_allowed_origins", mode="before")
    @classmethod
    def parse_cors_allowed_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("database_url")
    @classmethod
    def prefer_psycopg_driver(cls, value: str) -> str:
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
