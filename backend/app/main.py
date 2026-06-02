from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.core.database import Base, engine
from backend.app.api.v1.scheduler import router as scheduler_router
from backend.app.api.v1.career_coach import router as career_coach_router
from backend.app.api.v1.trainer import router as trainer_router
from backend.app.api.v1.analytics import router as analytics_router

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS (Cross-Origin Resource Sharing) so frontend can talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register sub-routers
app.include_router(scheduler_router, prefix="/api/v1/scheduler", tags=["scheduler"])
app.include_router(career_coach_router, prefix="/api/v1/career_coach", tags=["career_coach"])
app.include_router(trainer_router, prefix="/api/v1/trainer", tags=["trainer"])
app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["analytics"])

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": f"Welcome to the {settings.PROJECT_NAME} API backend!",
        "version": settings.VERSION
    }

@app.get("/api/v1/health")
def health_check():
    return {
        "status": "healthy",
        "database": "connected",  # Will verify dynamic connection later
        "modules": ["scheduler", "coach", "tracker"]
    }
