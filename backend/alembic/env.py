import sys
import os
from logging.config import fileConfig
from sqlalchemy import pool
from alembic import context

# Ensure backend root is on python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.database import Base, get_engine
import app.models  # Register all models with Base.metadata

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Set sqlalchemy.url from application settings dynamically, escaping % for configparser
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL.replace("%", "%%"))

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode without an active DB connection."""
    url = settings.DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True if (url and url.startswith("sqlite")) else False,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode against the database."""
    connectable = get_engine(settings.DATABASE_URL)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True if (settings.DATABASE_URL and settings.DATABASE_URL.startswith("sqlite")) else False,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
