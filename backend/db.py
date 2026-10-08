import os
from sqlmodel import create_engine
from dotenv import load_dotenv


load_dotenv()


DATABASE_URL = os.getenv("DATABASE_URL")


if not DATABASE_URL:
   raise RuntimeError("DATABASE_URL not found in environment variables.")

# SQLAlchemy 2.1+ defaults bare postgresql:// URLs to psycopg (v3); we ship psycopg2-binary.
for prefix in ("postgresql://", "postgres://"):
    if DATABASE_URL.startswith(prefix):
        DATABASE_URL = "postgresql+psycopg2://" + DATABASE_URL[len(prefix):]
        break


# pool_pre_ping: validate connections before use (avoids stale SSL sessions to Neon/serverless Postgres).
# pool_recycle: drop connections before typical idle SSL timeouts.
engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=240,
)