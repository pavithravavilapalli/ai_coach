from fastapi import FastAPI, Response
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.database import engine, Base
from backend.app.api.v1.scheduler import router as scheduler_router
from backend.app.api.v1.career_coach import router as career_coach_router
from backend.app.api.v1.analytics import router as analytics_router
from backend.app.api.v1.trainer import router as trainer_router
from backend.app.models.trainer import DailyActivity # Import models for table generation
from backend.app.models.document import IndexedDocument, DocumentChunk
import os

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title='Personalized AI Life & Career Coach API',
    description='Backend API for managing productivity schedules, AI mentoring, and habit tracking.',
    version='1.0.0'
)

# CORS middleware for potential separate dev testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Mount Feature Routers
app.include_router(scheduler_router, prefix="/api/v1/scheduler", tags=["Scheduler"])
app.include_router(career_coach_router, prefix="/api/v1/career_coach", tags=["Career Coach"])
app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(trainer_router, prefix="/api/v1/trainer", tags=["Personal Trainer"])



# Serve Frontend SPA Directly (No Node.js Required on Host!)
@app.get('/', response_class=HTMLResponse)
def serve_index():
    index_path = os.path.join("frontend", "index.html")
    if not os.path.exists(index_path):
        return HTMLResponse("<h2>Frontend Index not found! Run setup.</h2>", status_code=404)
    with open(index_path, "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read(), status_code=200)

@app.get('/style.css')
def serve_css():
    css_path = os.path.join("frontend", "style.css")
    if not os.path.exists(css_path):
        return Response("/* Style not found */", media_type="text/css", status_code=404)
    with open(css_path, "r", encoding="utf-8") as f:
        return Response(content=f.read(), media_type="text/css")

@app.get('/app.js')
def serve_js():
    js_path = os.path.join("frontend", "app.js")
    if not os.path.exists(js_path):
        return Response("// JS not found", media_type="application/javascript", status_code=404)
    with open(js_path, "r", encoding="utf-8") as f:
        return Response(content=f.read(), media_type="application/javascript")

@app.get('/api/health')
def health_check():
    return {
        'message': 'Welcome to the AI Life & Career Coach API!',
        'status': 'Healthy',
        'modules': ['Intelligent Scheduler', 'AI Career Coach', 'Personal Trainer']
    }

