### backend/database.py
"""
Database configuration and connection management.

Includes SSL support for encrypted production connections and
comprehensive connection pooling.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
import os
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
DATABASE_SSL_MODE = os.getenv("DATABASE_SSL_MODE", "prefer")  # prefer|require|disable|allow

# Connection pool configuration
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,  # Recycle connections after 1 hour
    pool_pre_ping=True,  # Verify connections before reusing
    echo_pool=False,
    # SSL configuration for PostgreSQL
    connect_args={
        "sslmode": DATABASE_SSL_MODE,
        # For production with self-signed certs: set sslrootcert
        # "sslrootcert": os.getenv("DB_SSL_CERT_PATH"),
    } if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgresql") else {}
)

# Log SSL configuration
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
    logger.info(f"Database SSL mode: {DATABASE_SSL_MODE}")
    if DATABASE_SSL_MODE == "require":
        logger.info("✅ SSL enforcement enabled for database connections")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()