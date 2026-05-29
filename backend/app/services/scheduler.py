from datetime import date, timedelta, datetime
from sqlalchemy.orm import Session
from backend.app.models.scheduler import DailySchedule, ScheduledTask
from backend.app.schemas.scheduler import DailyScheduleCreate
import random

# Interview TIP: Business Logic Layer (Service Pattern)
# In professional clean architecture, we isolate business logic (algorithms, calculations)
# from the HTTP transport layer (FastAPI routes) and the Database layer (SQLAlchemy models).
# This pattern is called the "Service Layer Pattern".
# It makes the logic reusable (e.g. we can call it from a cron job, a CLI tool, or an API endpoint)
# and ensures the code remains highly unit-testable.

# Curated high-yield interview curricula lists mapping to user goals
CURRICULUM_TOPICS = {
    "Python Full Stack": [
        {"title": "Master Async FastAPI endpoints", "desc": "Write async/await route handlers and understand FastAPI's background tasks under the hood."},
        {"title": "SQLAlchemy relationships and cascades", "desc": "Design One-to-Many and Many-to-Many entity models, configure lazy loading, and manage deletion cascades."},
        {"title": "RESTful API Design & Status Codes", "desc": "Review HTTP verbs (GET, POST, PUT, DELETE, PATCH) and practice mapping status codes (200, 201, 400, 404, 500) correctly."},
        {"title": "Connecting React to FastAPI with CORS", "desc": "Configure middleware origins and handle simple fetch/axios requests with error boundary UI states."},
        {"title": "FastAPI Dependency Injection (Depends)", "desc": "Learn how FastAPI's Depends keyword manages dependency overrides, useful for database and security testing."}
    ],
    "Data Analytics": [
        {"title": "Pandas DataFrames structural cleaning", "desc": "Perform handling of missing values, type-casting with astype(), and advanced query filtering operations."},
        {"title": "NumPy vectorization vs. loops", "desc": "Learn why loops are slow in Python. Practice vectorized element-wise math arrays using NumPy arrays to explain in interviews."},
        {"title": "Scikit-Learn linear regression models", "desc": "Prepare a simple dataset, split into train/test, train an estimator, and evaluate metrics like MSE and R-squared."},
        {"title": "Data aggregation using groupby & pivot", "desc": "Master data summarization patterns, replicating SQL aggregation concepts natively in Pandas DataFrames."},
        {"title": "Plotly interactive dashboard figures", "desc": "Build highly responsive line graphs and bar charts to embed directly into full-stack analytical dashboards."}
    ],
    "AI Full Stack": [
        {"title": "Gemini API SDK system prompt configurations", "desc": "Connect google-generativeai, configure System Instructions, and explore temperature/top-p sampling parameters."},
        {"title": "RAG vector embeddings and Cosine Similarity", "desc": "Generate embeddings of structured documents and execute quick matrix comparison searches without a DB."},
        {"title": "LLM text categorization pipelines", "desc": "Design a zero-shot text classification prompt that forces structured JSON outputs using Pydantic parse schemas."},
        {"title": "LangChain sequential chains orchestration", "desc": "Construct chains that route outputs of one model as input prompts into another to build agents."},
        {"title": "Handling LLM rate limits & fallback exceptions", "desc": "Implement basic exponential backoff algorithms when executing API requests to secure server uptime."}
    ],
    "Productivity": [
        {"title": "LeetCode Warmup (DSA Arrays & Hashing)", "desc": "Solve 'Two Sum' or 'Contains Duplicate' and analyze Time and Space Complexity in Big-O notation."},
        {"title": "System Design: Scaling from 1 to 10M users", "desc": "Understand Horizontal scaling, Load Balancers, CDN, Caching layers, and Relational vs. Non-Relational databases."}
    ]
}

def generate_daily_schedule(db: Session, plan_in: DailyScheduleCreate) -> DailySchedule:
    """
    Generates a personalized daily focus routine, splits focus hours dynamically across selected focus areas,
    populates hour-by-hour scheduled tasks, and commits the records to the DB.
    """
    # 1. Handle idempotency / regeneration:
    # If a schedule already exists for the given date, we clean it up and regenerate it.
    # Interview TIP: Idempotency is a crucial API design pattern. Running the same operation
    # multiple times must produce the identical side-effects without duplicate entries.
    existing_schedule = db.query(DailySchedule).filter(DailySchedule.date == plan_in.date).first()
    if existing_schedule:
        db.delete(existing_schedule)
        db.commit()

    # 2. Setup schedule container
    focus_areas_str = ", ".join(plan_in.focus_areas)
    schedule = DailySchedule(
        date=plan_in.date,
        total_focus_hours=plan_in.total_focus_hours,
        focus_areas=focus_areas_str,
        is_completed=False
    )
    db.add(schedule)
    db.commit()  # Committing allows SQLAlchemy to assign a primary key ID to `schedule.id`
    db.refresh(schedule)

    # 3. Dynamic Task Allocation Logic
    # We always reserve 1 hour for interview warmup/productivity (DSA, System Design, etc.)
    # The rest of the focus hours are allocated to the user's selected study categories.
    total_hours = plan_in.total_focus_hours
    selected_categories = plan_in.focus_areas if plan_in.focus_areas else ["Python Full Stack"]
    
    study_hours = max(1, total_hours - 1)
    productivity_hours = max(1, total_hours - study_hours)

    allocated_tasks = []

    # Calculate hours per category proportionally
    # E.g. 3 hours, 2 categories -> 1.5 hours per category (90 mins each)
    mins_per_category = (study_hours * 60) // len(selected_categories)

    start_time_dt = datetime.combine(plan_in.date, datetime.min.time()) + timedelta(hours=9) # Start at 9:00 AM

    # A. Add Technical Upskilling Tasks
    for category in selected_categories:
        # Choose a random topic from the curriculum to simulate progress
        curriculum = CURRICULUM_TOPICS.get(category, CURRICULUM_TOPICS["Python Full Stack"])
        topic = random.choice(curriculum)

        end_time_dt = start_time_dt + timedelta(minutes=mins_per_category)

        task = ScheduledTask(
            schedule_id=schedule.id,
            title=topic["title"],
            category=category,
            start_time=start_time_dt.strftime("%H:%M"),
            end_time=end_time_dt.strftime("%H:%M"),
            duration_minutes=mins_per_category,
            description=topic["desc"],
            is_completed=False
        )
        allocated_tasks.append(task)
        start_time_dt = end_time_dt

    # B. Add Productivity / Career Prep Tasks (Warmups, DSA, Mock Interviews)
    prod_mins_per_task = (productivity_hours * 60)
    topic = random.choice(CURRICULUM_TOPICS["Productivity"])
    end_time_dt = start_time_dt + timedelta(minutes=prod_mins_per_task)

    task = ScheduledTask(
        schedule_id=schedule.id,
        title=topic["title"],
        category="Productivity",
        start_time=start_time_dt.strftime("%H:%M"),
        end_time=end_time_dt.strftime("%H:%M"),
        duration_minutes=prod_mins_per_task,
        description=topic["desc"],
        is_completed=False
    )
    allocated_tasks.append(task)

    # 4. Save and commit tasks
    db.add_all(allocated_tasks)
    db.commit()
    db.refresh(schedule)

    return schedule
