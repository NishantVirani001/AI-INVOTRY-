import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

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
    
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
else:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./inventory.db"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
