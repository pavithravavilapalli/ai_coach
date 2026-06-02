import os
from dotenv import load_dotenv

# Load variables from .env file
load_dotenv()

class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "AI Career & Life Coach")
    VERSION: str = os.getenv("VERSION", "1.0.0")
    API_V1_STR: str = os.getenv("API_V1_STR", "/api/v1")
    # Dynamically resolve DATABASE_URL to use existing ai_coach.db if found
    if os.getenv("VERCEL"):
        _default_db = "sqlite:////tmp/sql_app.db"
    elif os.path.exists("ai_coach.db"):
        _default_db = "sqlite:///./ai_coach.db"
    elif os.path.exists("../ai_coach.db"):
        _default_db = "sqlite:///../ai_coach.db"
    else:
        _default_db = "sqlite:///./sql_app.db"
        
    DATABASE_URL: str = os.getenv("DATABASE_URL", _default_db)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

settings = Settings()
