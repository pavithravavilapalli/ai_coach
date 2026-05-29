import os
from pathlib import Path

def create_project_structure():
    """
    Creates the foundational folder structure and boilerplate files for the AI Life & Career Coach application.
    
    Interview TIP (Why this matters):
    In a professional team, manually creating folders is error-prone. Automating workspace setup
    ensures consistency across development environments (reproducibility) and acts as the "bootstrap"
    phase of a standard Devops pipeline.
    """
    
    # Define the root path (current directory)
    root = Path(__file__).resolve().parent
    print(f"[INFO] Initializing project structure at: {root}\n")

    # Define the core directory structure
    # Why this layout? It is a modern monorepo structure separating concerns:
    # - backend/: API service (FastAPI)
    # - frontend/: User Interface (React)
    # - analytics/: Data Analytics & Notebooks for ML/Data science work
    # - docs/: Clear system design and study documentation
    directories = [
        "backend/app/api/v1",
        "backend/app/models",
        "backend/app/schemas",
        "backend/app/services",
        "backend/app/core",
        "frontend/src",
        "analytics/notebooks",
        "analytics/src",
        "docs/interview_prep"
    ]

    # Create directories
    for dir_path in directories:
        full_path = root / dir_path
        full_path.mkdir(parents=True, exist_ok=True)
        print(f"[CREATED] Directory: {dir_path}")

    # Define boilerplate files to create
    # Why these files? They represent the minimal running foundation of a modern enterprise application.
    files = {
        # Backend Entry Point
        "backend/app/main.py": (
            "from fastapi import FastAPI\n"
            "from fastapi.middleware.cors import CORSMiddleware\n\n"
            "app = FastAPI(\n"
            "    title='Personalized AI Life & Career Coach API',\n"
            "    description='Backend API for managing productivity schedules, AI mentoring, and habit tracking.',\n"
            "    version='1.0.0'\n"
            ")\n\n"
            "# Interview TIP: CORS (Cross-Origin Resource Sharing) middleware is crucial for allowing\n"
            "# our React frontend (running on a different port/domain) to communicate with this backend safely.\n"
            "app.add_middleware(\n"
            "    CORSMiddleware,\n"
            "    allow_origins=['*'],  # In production, specify actual frontend domain\n"
            "    allow_credentials=True,\n"
            "    allow_methods=['*'],\n"
            "    allow_headers=['*'],\n"
            ")\n\n"
            "@app.get('/')\n"
            "def read_root():\n"
            "    return {\n"
            "        'message': 'Welcome to the AI Life & Career Coach API!',\n"
            "        'status': 'Healthy',\n"
            "        'modules': ['Intelligent Scheduler', 'AI Career Coach', 'Personal Trainer']\n"
            "    }\n"
        ),
        
        # Backend Configuration Setup
        "backend/app/core/config.py": (
            "import os\n"
            "from pydantic_settings import BaseSettings\n\n"
            "class Settings(BaseSettings):\n"
            "    # Interview TIP: Pydantic Settings automatically validates environment variables.\n"
            "    # If a required variable is missing or wrong type, the app fails fast at startup.\n"
            "    PROJECT_NAME: str = 'AI Life & Career Coach'\n"
            "    DATABASE_URL: str = 'sqlite:///./ai_coach.db'  # Default to SQLite for easy local setup\n"
            "    OPENAI_API_KEY: str = os.getenv('OPENAI_API_KEY', '')\n"
            "    GEMINI_API_KEY: str = os.getenv('GEMINI_API_KEY', '')\n\n"
            "    class Config:\n"
            "        env_file = '.env'\n\n"
            "settings = Settings()\n"
        ),

        # Backend Dependencies
        "backend/requirements.txt": (
            "fastapi>=0.110.0\n"
            "uvicorn>=0.28.0\n"
            "pydantic>=2.6.0\n"
            "pydantic-settings>=2.2.0\n"
            "sqlalchemy>=2.0.0\n"
            "pandas>=2.2.0\n"
            "numpy>=1.26.0\n"
            "scikit-learn>=1.4.0\n"
            "openai>=1.12.0\n"
            "google-generativeai>=0.4.0\n"
            "python-dotenv>=1.0.1\n"
            "ruff>=0.3.0  # Ultra-fast Python linter and formatter\n"
        ),

        # Environment variable template
        "backend/.env.example": (
            "# Environment variables config template\n"
            "PROJECT_NAME=AI Life & Career Coach\n"
            "DATABASE_URL=sqlite:///./ai_coach.db\n"
            "OPENAI_API_KEY=your_openai_api_key_here\n"
            "GEMINI_API_KEY=your_gemini_api_key_here\n"
        ),

        # Frontend README placeholder for React bootstrap
        "frontend/README.md": (
            "# React Frontend (Vite + TypeScript + Tailwind CSS)\n\n"
            "To initialize the React client, run the following in this folder:\n"
            "```bash\n"
            "npx -y create-vite-app@latest ./ --template react-ts\n"
            "npm install\n"
            "```\n"
        ),

        # Analytics instructions
        "analytics/README.md": (
            "# Data Analytics Hub\n\n"
            "This module will handle Python Data Analytics tasks:\n"
            "- `notebooks/`: For data exploration, habit visualizations, and predictive models.\n"
            "- `src/`: Reusable Python modules for data extraction, cleanup, and feature engineering.\n"
        ),

        # Root README
        "README.md": (
            "# Personalized AI Life & Career Coach\n\n"
            "An intelligent self-mentorship and productivity hub tailored for master Python Full Stack,\n"
            "Data Analytics, and AI Full Stack domains.\n\n"
            "## Tech Stack\n"
            "- **Backend**: FastAPI (Python), Uvicorn, SQLAlchemy (SQLite/PostgreSQL)\n"
            "- **Frontend**: React (TypeScript, Vite, Tailwind CSS)\n"
            "- **AI/ML Layer**: OpenAI API & Google Gemini API, Pandas/NumPy/Scikit-Learn\n\n"
            "## Getting Started\n"
            "1. Run `python setup_project.py` to verify or regenerate the structure.\n"
            "2. Set up Python virtual environment in `backend/` and install dependencies.\n"
        )
    }

    # Create files
    for file_path, content in files.items():
        full_file_path = root / file_path
        # Create parents if they somehow don't exist
        full_file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(full_file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"[CREATED] File: {file_path}")

    # Create __init__.py files in app to make it a package
    init_paths = [
        "backend/app/__init__.py",
        "backend/app/api/__init__.py",
        "backend/app/api/v1/__init__.py",
        "backend/app/models/__init__.py",
        "backend/app/schemas/__init__.py",
        "backend/app/services/__init__.py",
    ]
    for init_path in init_paths:
        (root / init_path).touch()
        print(f"[INIT] Package Marker: {init_path}")

    print("\n[SUCCESS] Project structure successfully initialized!")
    print("Next steps:")
    print("1. Create your python virtual environment: `python -m venv venv`")
    print("2. Activate it:")
    print("   - On Windows (PowerShell): `.\\venv\\Scripts\\Activate.ps1`")
    print("   - On Windows (CMD): `.\\venv\\Scripts\\activate.bat`")
    print("3. Install packages: `pip install -r backend/requirements.txt`\n")

if __name__ == "__main__":
    create_project_structure()
