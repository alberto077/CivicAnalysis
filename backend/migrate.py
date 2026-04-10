from sqlmodel import SQLModel
from db import engine
import schema


def create_db_and_tables():
   print("Connecting to database and creating tables...")
   SQLModel.metadata.create_all(engine)
   print("Migration complete!")


if __name__ == "__main__":
   create_db_and_tables()
