from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """API settings from env."""

    # Storage (local dev; S3 later via STORAGE_BACKEND / AWS_*)
    UPLOAD_DIR: str = "uploads"
    DATA_DIR: str = "data"
    # DB: SQLite locally; Postgres in prod, e.g. postgresql+asyncpg://user:pass@host/db
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/burobuddy.db"

    # LLM: openai (gpt-4o-mini) or bedrock (Nova Micro)
    LLM_PROVIDER: str = "openai"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    # Bedrock (when LLM_PROVIDER=bedrock)
    AWS_REGION: str = "eu-central-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    BEDROCK_MODEL_ID: str = "amazon.nova-micro-v1:0"

    # CORS (comma-separated in env, e.g. CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000)
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [x.strip() for x in self.CORS_ORIGINS.split(",") if x.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
