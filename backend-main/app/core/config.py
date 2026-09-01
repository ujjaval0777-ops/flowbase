from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Business Management API"
    app_env: str = "development"
    app_version: str = "1.0.0"
    api_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    supabase_url: str
    supabase_publishable_key: str = ""
    supabase_key: str = ""
    supabase_secret_key: str = ""
    supabase_service_role_key: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def public_key(self) -> str:
        return self.supabase_publishable_key or self.supabase_key

    @property
    def secret_key(self) -> str:
        return self.supabase_secret_key or self.supabase_service_role_key

    @property
    def cors_list(self) -> list[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
