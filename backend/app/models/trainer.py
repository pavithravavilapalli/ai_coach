from sqlalchemy import Column, Integer, Date, Boolean, Text
from backend.app.core.database import Base
import datetime

class DailyActivity(Base):
    """
    Represents physical fitness, hydration, and sleep logs for a developer study session.
    """
    __tablename__ = "daily_activities"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, default=datetime.date.today, unique=True, index=True)
    
    water_target_ml = Column(Integer, nullable=False, default=2500)
    water_actual_ml = Column(Integer, nullable=False, default=0)
    
    sleep_target_hours = Column(Integer, nullable=False, default=8)
    sleep_actual_hours = Column(Integer, nullable=False, default=0)
    
    is_workout_completed = Column(Boolean, default=False)
    workout_notes = Column(Text, nullable=True) # Will store a comma-separated list of generated desk therapy stretches
