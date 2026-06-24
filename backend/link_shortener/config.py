from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Link Shortener API"
    database_url: str 
    short_code_length: int = 7
    max_code_generation_attempts: int = 8

    model_config = SettingsConfigDict(env_file=".env", env_prefix="LINK_SHORTENER_")

    @field_validator("database_url")
    @classmethod
    def prefer_psycopg_driver(cls, value: str) -> str:
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
