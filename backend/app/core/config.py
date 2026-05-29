import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Interview TIP: Pydantic Settings automatically validates environment variables.
    # If a required variable is missing or wrong type, the app fails fast at startup.
    PROJECT_NAME: str = 'AI Life & Career Coach'
    DATABASE_URL: str = 'sqlite:///./ai_coach.db'  # Default to SQLite for easy local setup
    OPENAI_API_KEY: str = os.getenv('OPENAI_API_KEY', '')
    GEMINI_API_KEY: str = os.getenv('GEMINI_API_KEY', '')

    class Config:
        env_file = '.env'

settings = Settings()
