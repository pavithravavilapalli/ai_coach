from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.core.database import Base
import datetime

# Interview TIP: Object-Relational Mapping (ORM)
# ORM models act as a bridge. They map Python classes to SQL tables.
# Instead of writing raw SQL statements like "CREATE TABLE daily_schedules ...",
# we write clean Python classes. SQLAlchemy translates these into dialect-specific SQL (SQLite, PostgreSQL).

class DailySchedule(Base):
    """
    Represents a specific day's generated schedule container.
    """
    __tablename__ = "daily_schedules"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, default=datetime.date.today, unique=True, index=True)
    total_focus_hours = Column(Integer, nullable=False, default=4)
    focus_areas = Column(String, nullable=False)  # Stored as comma-separated string, e.g. "Python Full Stack, AI Full Stack"
    is_completed = Column(Boolean, default=False)

    # Relationship to scheduled tasks (One-to-Many)
    # - cascade="all, delete-orphan": If a DailySchedule is deleted, all its associated tasks
    #   are deleted automatically (preventing orphan rows in the tasks table).
    tasks = relationship("ScheduledTask", back_populates="schedule", cascade="all, delete-orphan")


class ScheduledTask(Base):
    """
    Represents an individual task/study slot mapped to a specific daily schedule.
    """
    __tablename__ = "scheduled_tasks"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("daily_schedules.id", ondelete="CASCADE"), nullable=False)
    
    title = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)  # "Python Full Stack", "Data Analytics", "AI Full Stack", "Productivity"
    start_time = Column(String(5), nullable=False)   # E.g. "09:00"
    end_time = Column(String(5), nullable=False)     # E.g. "11:00"
    duration_minutes = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)
    is_completed = Column(Boolean, default=False)

    # Reference back to parent schedule container
    schedule = relationship("DailySchedule", back_populates="tasks")
