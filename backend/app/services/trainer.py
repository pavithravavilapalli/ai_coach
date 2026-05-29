from sqlalchemy.orm import Session
import datetime
import random

from backend.app.models.trainer import DailyActivity
from backend.app.models.scheduler import DailySchedule

# Curated senior developer desk-remedy stretching activities
STRETCHES_POOL = [
    {"title": "Neck tilts & rotations", "desc": "Relieves strain from screen height alignment. 5 tilts each side."},
    {"title": "Shoulder rolls & chest openers", "desc": "Counteracts rounded shoulders from prolonged keyboard posture. 10 reps."},
    {"title": "Spinal twist stretch", "desc": "Decompresses lumbar vertebrae and lower back muscles. Hold 15s each side."},
    {"title": "Wrist extensions & flexes", "desc": "Prevents repetitive carpal tunnel tension. 10 extensions each wrist."},
    {"title": "Hip flexor stretch", "desc": "Re-aligns hips and pelvis after sitting in static chair states. Hold 20s each leg."}
]

class TrainerService:
    """
    Manages daily health logging, hydration tracking, and dynamic 'Desk Therapy' 
    stretch checklist generations matching study loads.
    """
    
    def get_or_create_daily_activity(self, db: Session, target_date: datetime.date) -> DailyActivity:
        """
        Retrieves today's health metrics record or generates a fresh record, compiling 
        a desk-stretch routine adapted to active study focus lengths.
        """
        record = db.query(DailyActivity).filter(DailyActivity.date == target_date).first()
        if record:
            return record
            
        # 1. Look up today's scheduler load to tailor physical movements length
        schedule = db.query(DailySchedule).filter(DailySchedule.date == target_date).first()
        focus_hours = schedule.total_focus_hours if schedule else 4
        
        # 2. Dynamic Desk Therapy Exercise Allocator:
        # Variety of postures increases proportionally with upskilling sitting duration:
        # - Hours < 6: Allocate 3 stretches
        # - Hours 6-8: Allocate 4 stretches
        # - Hours > 8: Allocate all 5 stretches
        if focus_hours < 6:
            allocated = random.sample(STRETCHES_POOL, 3)
        elif focus_hours <= 8:
            allocated = random.sample(STRETCHES_POOL, 4)
        else:
            allocated = STRETCHES_POOL
            
        # Form list string representation
        notes_str = "; ".join([f"{item['title']} ({item['desc']})|[PEND]" for item in allocated])
        
        # 3. Commit new physical activity session
        new_activity = DailyActivity(
            date=target_date,
            water_target_ml=2500,
            water_actual_ml=0,
            sleep_target_hours=8,
            sleep_actual_hours=0,
            is_workout_completed=False,
            workout_notes=notes_str
        )
        
        db.add(new_activity)
        db.commit()
        db.refresh(new_activity)
        return new_activity
        
    def add_water(self, db: Session, target_date: datetime.date, ml: int) -> DailyActivity:
        """
        Logs water consumption, increments actual fluid intake, and commits records.
        """
        record = self.get_or_create_daily_activity(db, target_date)
        record.water_actual_ml = max(0, record.water_actual_ml + ml)
        db.commit()
        db.refresh(record)
        return record
        
    def log_sleep(self, db: Session, target_date: datetime.date, hours: int) -> DailyActivity:
        """
        Updates actual sleep hours and commits transaction.
        """
        record = self.get_or_create_daily_activity(db, target_date)
        record.sleep_actual_hours = max(0, min(24, hours))
        db.commit()
        db.refresh(record)
        return record
        
    def toggle_workout_status(self, db: Session, target_date: datetime.date, status: bool) -> DailyActivity:
        """
        Toggles overall stretching routine completion state.
        """
        record = self.get_or_create_daily_activity(db, target_date)
        record.is_workout_completed = status
        db.commit()
        db.refresh(record)
        return record

trainer_service = TrainerService()
