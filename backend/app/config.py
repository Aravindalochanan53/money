import json
import os
import urllib.parse
import warnings
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_SECRETS = {
    "flowcred_super_secret_production_key_change_me_2026",
    "change_me",
    "secret",
    "secret_key",
    "default_secret",
}

def build_mssql_database_url() -> str:
    """Build MSSQL pyodbc connection URL from environment variables if DATABASE_URL is not set."""
    explicit_url = os.getenv("DATABASE_URL")
    if explicit_url:
        return explicit_url

    server = os.getenv("DB_SERVER", ".\\MSSQL")
    port = os.getenv("DB_PORT", "")
    database = os.getenv("DB_NAME", "FlowCred")
    user = os.getenv("DB_USER", "")
    password = os.getenv("DB_PASSWORD", "")
    driver = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")
    trusted_conn = os.getenv("DB_TRUSTED_CONNECTION", "yes" if not user else "no")

    # If port is specified and server doesn't already contain port or instance
    server_str = server
    if port and "," not in server_str and "\\" not in server_str:
        server_str = f"{server},{port}"

    odbc_parts = [f"DRIVER={{{driver}}}", f"SERVER={server_str}", f"DATABASE={database}"]

    if user:
        odbc_parts.append(f"UID={user}")
        odbc_parts.append(f"PWD={password}")
    elif trusted_conn.lower() in ("yes", "true", "1"):
        odbc_parts.append("Trusted_Connection=yes")

    odbc_parts.append("TrustServerCertificate=yes")

    conn_str = ";".join(odbc_parts)
    quoted = urllib.parse.quote_plus(conn_str)
    return f"mssql+pyodbc:///?odbc_connect={quoted}"


class Settings(BaseSettings):
    PROJECT_NAME: str = "FlowCred"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # JWT Secret handling: Never allow insecure default secret in production
    SECRET_KEY: str = os.getenv("SECRET_KEY", "flowcred_local_dev_key_never_use_in_prod_1234567890")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # MSSQL Database Configuration (MSSQL is the ONLY supported application database)
    DB_SERVER: str = os.getenv("DB_SERVER", ".\\MSSQL")
    DB_PORT: str = os.getenv("DB_PORT", "")
    DB_NAME: str = os.getenv("DB_NAME", "FlowCred")
    DB_USER: str = os.getenv("DB_USER", "")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_DRIVER: str = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")
    DB_TRUSTED_CONNECTION: str = os.getenv("DB_TRUSTED_CONNECTION", "yes")

    DATABASE_URL: str = build_mssql_database_url()

    # Explicit local development origins (never wildcard in production)
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v_stripped = v.strip()
            if v_stripped.startswith("[") and v_stripped.endswith("]"):
                try:
                    parsed = json.loads(v_stripped)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if item]
                except Exception:
                    pass
            return [x.strip() for x in v_stripped.split(",") if x.strip()]
        return v

    def validate_production_security(self) -> None:
        # Check database engine restriction
        if self.DATABASE_URL.startswith("postgres") or self.DATABASE_URL.startswith("mongodb"):
            raise RuntimeError(
                "Unsupported application database: FlowCred strictly requires Microsoft SQL Server (MSSQL). "
                "PostgreSQL and MongoDB are prohibited."
            )
        if self.DATABASE_URL.startswith("sqlite") and self.ENVIRONMENT.lower() == "production":
            raise RuntimeError(
                "SQLite is prohibited as a production runtime database. Use Microsoft SQL Server (MSSQL)."
            )

        if self.ENVIRONMENT.lower() == "production":
            if not self.SECRET_KEY or self.SECRET_KEY in INSECURE_SECRETS or len(self.SECRET_KEY) < 32:
                raise RuntimeError(
                    "Production configuration error: A unique, secure SECRET_KEY (min 32 characters) "
                    "must be provided via the environment in production."
                )
            if "*" in self.CORS_ORIGINS:
                raise RuntimeError("Production configuration error: Wildcard CORS is not permitted in production.")
        elif self.SECRET_KEY in INSECURE_SECRETS:
            warnings.warn("Using insecure placeholder SECRET_KEY for local development.", stacklevel=2)

    model_config = SettingsConfigDict(case_sensitive=True, extra="ignore")

settings = Settings()
settings.validate_production_security()
