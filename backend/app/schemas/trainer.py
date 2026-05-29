from pydantic import BaseModel, Field
import datetime
from typing import Optional

# --- Daily Activity Schemas ---
class DailyActivityBase(BaseModel):
    water_target_ml: int = Field(default=2500, ge=500, le=6000, description="Target hydration intake today")
    water_actual_ml: int = Field(default=0, ge=0, description="Actual water intake today in milliliters")
    sleep_target_hours: int = Field(default=8, ge=4, le=16, description="Target sleep duration today")
    sleep_actual_hours: int = Field(default=0, ge=0, le=24, description="Actual sleep duration logged today")
    is_workout_completed: bool = Field(default=False, description="Whether Desk stretches were completed today")
    workout_notes: Optional[str] = Field(None, description="Desk stretches routine list string")

class DailyActivityCreate(DailyActivityBase):
    date: datetime.date = Field(default_factory=datetime.date.today, description="Activity date")

class DailyActivityUpdate(BaseModel):
    water_actual_ml: Optional[int] = Field(None, ge=0)
    sleep_actual_hours: Optional[int] = Field(None, ge=0, le=24)
    is_workout_completed: Optional[bool] = Field(None)
    workout_notes: Optional[str] = Field(None)

class DailyActivity(DailyActivityBase):
    id: int
    date: datetime.date

    model_config = {
        "from_attributes": True
    }
