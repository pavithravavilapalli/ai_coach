from backend.app.core.database import SessionLocal, Base, engine
from backend.app.services.trainer import trainer_service
from backend.app.models.trainer import DailyActivity
import datetime

def verify_trainer():
    print("[TEST] Starting integration test for Personal Trainer & Health Hub...\n")
    
    # 1. Initialize tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        today_date = datetime.date.today()
        # Clean up today's activity to ensure a fresh test run
        db.query(DailyActivity).filter(DailyActivity.date == today_date).delete()
        db.commit()
        
        print(f"[TEST] Loading daily activity for date: {today_date}")
        
        # 2. Test Get/Create Daily Activity (triggers dynamic stretches generation!)
        activity = trainer_service.get_or_create_daily_activity(db=db, target_date=today_date)
        
        assert activity.id is not None, "Error: Activity ID was not generated!"
        assert activity.water_actual_ml == 0, "Error: Default water should be 0!"
        assert activity.sleep_actual_hours == 0, "Error: Default sleep should be 0!"
        assert len(activity.workout_notes) > 0, "Error: Stretches were not dynamically generated!"
        
        print(f"[SUCCESS] Record generated. Database ID: {activity.id}")
        print("-" * 60)
        print("Today's 'Desk Therapy' Stretching Checklist:")
        print("-" * 60)
        for stretch in activity.workout_notes.split("; "):
            title_desc, status = stretch.split("|")
            status_symbol = "[PEND]" if status == "[PEND]" else "[DONE]"
            print(f" {status_symbol} {title_desc}")
        print("-" * 60 + "\n")
        
        # 3. Test Hydration Logging
        print("[TEST] Simulating logging a glass of water (+250ml)...")
        activity = trainer_service.add_water(db=db, target_date=today_date, ml=250)
        print("[TEST] Simulating logging a second glass of water (+500ml)...")
        activity = trainer_service.add_water(db=db, target_date=today_date, ml=500)
        
        assert activity.water_actual_ml == 750, f"Error: Water logged is incorrect! Got {activity.water_actual_ml}ml"
        print(f"[SUCCESS] Hydration logged correctly: {activity.water_actual_ml}ml / {activity.water_target_ml}ml\n")
        
        # 4. Test Sleep Duration Logging
        print("[TEST] Simulating logging sleep hours (8 hours)...")
        activity = trainer_service.log_sleep(db=db, target_date=today_date, hours=8)
        
        assert activity.sleep_actual_hours == 8, f"Error: Sleep logged is incorrect! Got {activity.sleep_actual_hours}h"
        print(f"[SUCCESS] Sleep hours saved correctly: {activity.sleep_actual_hours}h / {activity.sleep_target_hours}h\n")
        
        # 5. Test Workout Toggle Status
        print("[TEST] Simulating completing stretches workout...")
        activity = trainer_service.toggle_workout_status(db=db, target_date=today_date, status=True)
        
        assert activity.is_workout_completed is True, "Error: Workout status was not saved!"
        # Verify all individual stretches are now [DONE]
        for stretch in activity.workout_notes.split("; "):
            assert "|[DONE]" in stretch, f"Error: Sibling stretch was not marked DONE! Got {stretch}"
        print(f"[SUCCESS] Workout state committed: is_workout_completed = {activity.is_workout_completed}")
        
        # 6. Test Individual Stretch Toggle
        print("[TEST] Untoggling workout...")
        activity = trainer_service.toggle_workout_status(db=db, target_date=today_date, status=False)
        assert activity.is_workout_completed is False, "Error: Workout status should be False!"
        for stretch in activity.workout_notes.split("; "):
            assert "|[PEND]" in stretch, f"Error: Sibling stretch was not reset to PEND! Got {stretch}"
            
        print("[TEST] Toggling stretches individually...")
        stretches_count = len(activity.workout_notes.split("; "))
        for idx in range(stretches_count):
            activity = trainer_service.toggle_stretch_completion(db=db, target_date=today_date, stretch_index=idx)
            if idx == stretches_count - 1:
                assert activity.is_workout_completed is True, "Error: Workout should automatically complete when the last stretch is toggled!"
            else:
                assert activity.is_workout_completed is False, f"Error: Workout should not complete when only {idx+1}/{stretches_count} are done!"
        
        print("[SUCCESS] Individual stretch toggling and automatic workout completion checked successfully!\n")
        print("[SUCCESS] Personal Trainer & Health Hub pipeline operates correctly!")

    except AssertionError as ae:
        print(f"[FAIL] Test assertion failed: {str(ae)}")
    except Exception as e:
        print(f"[ERROR] An unexpected error occurred: {str(e)}")
    finally:
        db.close()
        print("[TEST] Database session closed. Integration test finished.")

if __name__ == "__main__":
    verify_trainer()
