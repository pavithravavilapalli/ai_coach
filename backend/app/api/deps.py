from typing import Generator
from backend.app.core.database import SessionLocal

# Interview TIP: Dependency Injection (DI)
# FastAPI's dependency system allows us to "inject" database sessions into endpoints.
# This function is a "generator" (note the 'yield' keyword).
# 1. When an API request comes in, FastAPI calls this generator.
# 2. It creates a brand-new database session (`db = SessionLocal()`).
# 3. It passes the session to our endpoint function (`yield db`).
# 4. Once the API returns its response, execution returns here, and the `finally` block runs,
#    ensuring the connection is ALWAYS closed, even if the API endpoint raised an error!
# This prevents database connection leaks (hanging connections that slow down or crash servers).

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
