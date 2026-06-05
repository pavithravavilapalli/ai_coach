from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import datetime

from backend.app.api.deps import get_db
from backend.app.schemas.trainer import DailyActivity
from backend.app.services.trainer import trainer_service

router = APIRouter()

@router.get("/today", response_model=DailyActivity)
def get_today_activity(db: Session = Depends(get_db)):
    """
    Retrieves today's physical metrics and custom-generated 'Desk Therapy' stretches.
    """
    try:
        today_date = datetime.date.today()
        record = trainer_service.get_or_create_daily_activity(db=db, target_date=today_date)
        return record
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while compiling fitness logs: {str(e)}"
        )

@router.patch("/water", response_model=DailyActivity)
def log_water_increment(ml: int, db: Session = Depends(get_db)):
    """
    Increments your daily water consumption volume in milliliters (e.g., +250ml).
    """
    try:
        today_date = datetime.date.today()
        record = trainer_service.add_water(db=db, target_date=today_date, ml=ml)
        return record
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while saving fluid logs: {str(e)}"
        )

@router.patch("/sleep", response_model=DailyActivity)
def log_sleep_duration(hours: int, db: Session = Depends(get_db)):
    """
    Logs your sleep duration hours for the previous night.
    """
    try:
        today_date = datetime.date.today()
        record = trainer_service.log_sleep(db=db, target_date=today_date, hours=hours)
        return record
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while saving sleep logs: {str(e)}"
        )

@router.patch("/workout", response_model=DailyActivity)
def toggle_workout_completion(is_completed: bool, db: Session = Depends(get_db)):
    """
    Toggles the overall completion status of today's desk-stretching stretches checklist.
    """
    try:
        today_date = datetime.date.today()
        record = trainer_service.toggle_workout_status(db=db, target_date=today_date, status=is_completed)
        return record
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while toggling workout logs: {str(e)}"
        )

@router.patch("/stretches/{stretch_index}/toggle", response_model=DailyActivity)
def toggle_stretch_completion_endpoint(stretch_index: int, db: Session = Depends(get_db)):
    """
    Toggles the completion status of a single stretch item by its zero-based index.
    """
    try:
        today_date = datetime.date.today()
        record = trainer_service.toggle_stretch_completion(db=db, target_date=today_date, stretch_index=stretch_index)
        return record
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while toggling the individual stretch status: {str(e)}"
        )
