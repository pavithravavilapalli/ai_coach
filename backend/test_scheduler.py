from backend.app.core.database import SessionLocal, Base, engine
from backend.app.schemas.scheduler import DailyScheduleCreate
from backend.app.services.scheduler import generate_daily_schedule
from backend.app.models.scheduler import DailySchedule, ScheduledTask
from datetime import date

# Interview TIP: Unit and Integration Testing
# In industry-grade setups, we write automated scripts to verify that our database layers,
# services, and logic work together seamlessly. This is called an Integration Test.
# Doing this guarantees we don't accidentally break existing features when adding new modules.

def verify_scheduler():
    print("[TEST] Starting integration test for Intelligent Scheduler...\n")
    
    # 1. Initialize fresh tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 2. Define test input data simulating a user requesting a schedule
        test_plan = DailyScheduleCreate(
            date=date.today(),
            total_focus_hours=6,
            focus_areas=["Python Full Stack", "AI Full Stack"]
        )
        print(f"[TEST] Generating schedule for date: {test_plan.date}")
        print(f"[TEST] Focus hours: {test_plan.total_focus_hours}")
        print(f"[TEST] Focus areas: {test_plan.focus_areas}\n")

        # 3. Call the generation service
        schedule = generate_daily_schedule(db=db, plan_in=test_plan)

        # 4. Assert and verify results
        assert schedule.id is not None, "Error: Schedule ID was not generated!"
        assert schedule.total_focus_hours == 6, "Error: Incorrect focus hours stored!"
        assert len(schedule.tasks) > 0, "Error: No tasks were generated for the schedule!"

        print(f"[SUCCESS] Schedule successfully generated with Database ID: {schedule.id}")
        print("-" * 60)
        print(f"Daily Routine for {schedule.date} (Focus Areas: {schedule.focus_areas}):")
        print("-" * 60)
        
        # Display hour-by-hour output
        for task in sorted(schedule.tasks, key=lambda t: t.start_time):
            status_icon = "[DONE]" if task.is_completed else "[PEND]"
            print(f"[{task.start_time} - {task.end_time}] ({task.duration_minutes}m) {status_icon} {task.title}")
            print(f"      Category: {task.category}")

            print(f"      Description: {task.description}\n")
        print("-" * 60)

        # 5. Test toggling completion of the first task
        first_task = schedule.tasks[0]
        print(f"[TEST] Simulating marking task '{first_task.title}' as COMPLETED...")
        
        # Modify and commit
        first_task.is_completed = True
        db.commit()
        db.refresh(first_task)
        
        # Check if change is saved
        db_task = db.query(ScheduledTask).filter(ScheduledTask.id == first_task.id).first()
        assert db_task.is_completed is True, "Error: Task completion status was not saved!"
        print(f"[SUCCESS] Task status saved correctly: is_completed = {db_task.is_completed}\n")

    except AssertionError as ae:
        print(f"[FAIL] Test assertion failed: {str(ae)}")
    except Exception as e:
        print(f"[ERROR] An unexpected error occurred during testing: {str(e)}")
    finally:
        db.close()
        print("[TEST] Database session closed. Integration test finished.")

if __name__ == "__main__":
    verify_scheduler()
