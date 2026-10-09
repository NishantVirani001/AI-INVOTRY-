import os
import time
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

logger = logging.getLogger("stockpilot.db")

# Load Database URL from .env (Supabase PostgreSQL or local SQLite fallback)
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

import urllib.parse
import re

if DATABASE_URL and not DATABASE_URL.startswith("sqlite") and "[YOUR-" not in DATABASE_URL:
    # Safely handle special characters (like '@') in password
    # Match: postgresql://username:password@host...
    match = re.match(r"^(postgres(?:ql)?(?:\+\w+)?:\/\/)([^:]+):(.*)@([^@\/]+(?::\d+)?(?:\/.*)?)$", DATABASE_URL)
    if match:
        proto, user, raw_pw, rest = match.groups()
        encoded_pw = urllib.parse.quote_plus(urllib.parse.unquote_plus(raw_pw))
        if proto.startswith("postgres://"):
            proto = "postgresql+psycopg://"
        elif proto.startswith("postgresql://") and not proto.startswith("postgresql+"):
            proto = "postgresql+psycopg://"
        DATABASE_URL = f"{proto}{user}:{encoded_pw}@{rest}"
    elif DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
    elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
    
    # Auto-rewrite direct Supabase IPv6 endpoints to the fast IPv4 Session Pooler
    if "db.hdsnxznkuhdsnmpofwnn.supabase.co" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace(
            "db.hdsnxznkuhdsnmpofwnn.supabase.co:5432",
            "aws-0-ap-southeast-2.pooler.supabase.com:5432"
        ).replace("://postgres:", "://postgres.hdsnxznkuhdsnmpofwnn:")

    connect_args = {
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
        "connect_timeout": 10,
    }
    # In port 6543 (transaction mode), disable prepared statements. In port 5432, allow default.
    if ":6543" in DATABASE_URL:
        connect_args["prepare_threshold"] = None

    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=False,    # Disabled: saves 300-500ms round-trip ping on every request! Keepalives manage health.
        pool_size=10,           # Keep warm pool of reusable connections
        max_overflow=20,        # Allow burst concurrency
        pool_recycle=300,       # Recycle every 5 mins to avoid stale sessions
        pool_timeout=15,        # 15s wait for available connection under load
        echo=False,
        connect_args=connect_args,
    )
else:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./inventory.db"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )

# Optional: log slow queries in dev (> 200ms)
if os.getenv("SLOW_QUERY_LOG", "").lower() in ("1", "true"):
    @event.listens_for(engine, "before_cursor_execute")
    def _before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        conn.info.setdefault("query_start_time", []).append(time.perf_counter())

    @event.listens_for(engine, "after_cursor_execute")
    def _after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        total = time.perf_counter() - conn.info["query_start_time"].pop(-1)
        if total > 0.2:
            logger.warning("SLOW QUERY (%.1fms): %s", total * 1000, statement[:200])

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
