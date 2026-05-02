import os
from typing import Generator

from sqlmodel import Session, create_engine

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./ziumsync.db")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=True, connect_args=connect_args)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
