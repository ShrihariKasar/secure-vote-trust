import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "SecureVote Trust Backend"
    API_PREFIX: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "securevote-zero-trust-secret-key-production-change-me-2026-v2")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # Short-lived access token (60 mins)
    VOTING_SESSION_EXPIRE_MINUTES: int = 15  # Voting authorization session valid for 15 mins
    
    # Cryptography Secrets
    AES_SECRET_KEY: str = os.getenv("AES_SECRET_KEY", "zk-ballot-aes-256-gcm-master-key-2026")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./securevote.db")
    
    # CORS
    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8000"
    ]

    # Security & Throttling
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 15
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "true").lower() in ("true", "1", "yes")

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )

settings = Settings()

# Ensure FRONTEND_ORIGIN is included in CORS_ORIGINS
if settings.FRONTEND_ORIGIN and settings.FRONTEND_ORIGIN not in settings.CORS_ORIGINS:
    settings.CORS_ORIGINS.append(settings.FRONTEND_ORIGIN)


