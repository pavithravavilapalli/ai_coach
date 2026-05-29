from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date
from typing import List

from backend.app.api.deps import get_db
from backend.app.schemas.scheduler import DailySchedule, DailyScheduleCreate, ScheduledTask
from backend.app.models.scheduler import DailySchedule as DailyScheduleModel, ScheduledTask as ScheduledTaskModel
from backend.app.services.scheduler import generate_daily_schedule

# Interview TIP: Routing (APIRouter)
# APIRouter lets us group related API routes (e.g. all scheduler-related endpoints).
# In large production applications, this enables modularity so different developers can work on
# different features (scheduler, career_coach, productivity) without merge conflicts.
router = APIRouter()

@router.post("/", response_model=DailySchedule, status_code=status.HTTP_201_CREATED)
def generate_schedule(plan_in: DailyScheduleCreate, db: Session = Depends(get_db)):
    """
    Generates or regenerates an intelligent study routine for a specific date.
    
    Interview TIP:
    HTTP 201 Created is the standard RESTful response code for successful resource creation operations.
    """
    try:
        schedule = generate_daily_schedule(db=db, plan_in=plan_in)
        return schedule
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while generating the schedule: {str(e)}"
        )


@router.get("/today", response_model=DailySchedule)
def get_today_schedule(db: Session = Depends(get_db)):
    """
    Retrieves the generated schedule and tasks for the current calendar date.
    """
    today_date = date.today()
    schedule = db.query(DailyScheduleModel).filter(DailyScheduleModel.date == today_date).first()
    
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No study schedule has been generated for today yet. Use the POST endpoint to create one!"
        )
    return schedule


@router.patch("/tasks/{task_id}/complete", response_model=ScheduledTask)
def toggle_task_completion(task_id: int, is_completed: bool, db: Session = Depends(get_db)):
    """
    Toggles the completion status of an individual study task and dynamically evaluates
    if the parent Daily Schedule is now fully completed.
    
    Interview TIP:
    We use PATCH instead of PUT because we are performing a partial update (modifying only the
    `is_completed` field) rather than replacing the entire task resource.
    """
    task = db.query(ScheduledTaskModel).filter(ScheduledTaskModel.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found."
        )
    
    task.is_completed = is_completed
    db.commit()
    db.refresh(task)

    # Architectural Touch: Check if all sibling tasks in this schedule are complete.
    # If yes, mark the parent schedule as completed too!
    schedule = db.query(DailyScheduleModel).filter(DailyScheduleModel.id == task.schedule_id).first()
    if schedule:
        all_completed = all(t.is_completed for t in schedule.tasks)
        schedule.is_completed = all_completed
        db.commit()
        db.refresh(task) # Ensure updated relations are captured

    return task
