from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from backend.app.core.config import settings

# Interview TIP:
# In professional backends, we separate database configurations from application code.
# The 'engine' is responsible for managing the low-level connection pool to the database,
# while the 'sessionmaker' creates temporary transactional contexts (Sessions) for actual queries.

# For SQLite, we require 'check_same_thread=False' because SQLite is designed for single-thread use,
# but FastAPI runs queries asynchronously on multiple threads. This flag ensures FastAPI threads can
# query the database safely. In production (like PostgreSQL), this parameter is not needed.
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args
)

# Each instance of SessionLocal will be a database session.
# - autocommit=False: We manually control when transactions are committed (saved) to the database.
# - autoflush=False: Prevents SQLAlchemy from sending pending database updates before query operations,
#   giving us precise control over save execution steps.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# DeclarativeBase is a factory function that returns a base class. 
# All of our database model classes will inherit from this Base to be registered with SQLAlchemy's ORM.
Base = declarative_base()
