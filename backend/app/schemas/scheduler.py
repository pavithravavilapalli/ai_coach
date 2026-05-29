from pydantic import BaseModel, Field
from typing import List, Optional
import datetime

# Interview TIP: Data Transfer Objects (DTO) / Validation Schemas
# In high-quality backends, we do not expose our database models directly to the user.
# Pydantic schemas act as our "Contracts" or DTOs:
# 1. They validate incoming data structure and types before letting it touch our models.
# 2. They define exactly what fields are returned to the frontend (excluding sensitive or internal DB fields).
# 3. Pydantic v2 uses `model_config = {"from_attributes": True}` (formerly `orm_mode = True` in v1) 
#    to cleanly parse ORM objects into JSON.

# --- Scheduled Task Schemas ---
class ScheduledTaskBase(BaseModel):
    title: str = Field(..., max_length=100, description="Name of the study topic or action item")
    category: str = Field(..., description="E.g., 'Python Full Stack', 'Data Analytics', 'AI Full Stack', 'Productivity'")
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="HH:MM start format, e.g., '09:00'")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="HH:MM end format, e.g., '11:00'")
    duration_minutes: int = Field(..., gt=0, description="Total minutes calculated for the block")
    description: Optional[str] = Field(None, description="Detailed guidance on topics and goals")
    is_completed: bool = Field(default=False, description="Completion status of this task block")

class ScheduledTaskCreate(ScheduledTaskBase):
    pass

class ScheduledTask(ScheduledTaskBase):
    id: int
    schedule_id: int

    model_config = {
        "from_attributes": True
    }


# --- Daily Schedule Container Schemas ---
class DailyScheduleBase(BaseModel):
    date: datetime.date = Field(default_factory=datetime.date.today, description="The calendar day for this schedule")
    total_focus_hours: int = Field(default=4, ge=1, le=12, description="Target study hours dedicated today")
    focus_areas: List[str] = Field(..., description="Selected areas of priority for today's generated program")

class DailyScheduleCreate(DailyScheduleBase):
    pass

class DailySchedule(BaseModel):
    id: int
    date: datetime.date
    total_focus_hours: int
    focus_areas: str  # Kept as string representing what's in the DB
    is_completed: bool
    tasks: List[ScheduledTask] = []

    model_config = {
        "from_attributes": True
    }

