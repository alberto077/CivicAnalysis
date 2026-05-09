import os
from sqlmodel import create_engine
from dotenv import load_dotenv


load_dotenv()


DATABASE_URL = os.getenv("DATABASE_URL")


if not DATABASE_URL:
   raise RuntimeError("DATABASE_URL not found in environment variables.")


# pool_pre_ping: validate connections before use (avoids stale SSL sessions to Neon/serverless Postgres).
# pool_recycle: drop connections before typical idle SSL timeouts.
engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=240,
)