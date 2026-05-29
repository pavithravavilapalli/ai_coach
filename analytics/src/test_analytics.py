import sys
import os
from pathlib import Path

# Add project root directory to python path to avoid ModuleNotFoundError
root = Path(__file__).resolve().parents[2]
sys.path.append(str(root))

from backend.app.core.database import SessionLocal, Base, engine
from backend.app.services.analytics import analytics_service

def verify_ml_analytics():
    print("[TEST] Starting integration verification for ML & Data Science Analytics Engine...\n")
    
    # 1. Initialize tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # 2. Test Pandas Aggregations summary extraction
        print("[TEST] Running Pandas historical aggregations...")
        summary = analytics_service.get_historical_summary(db)
        
        assert isinstance(summary, dict), "Error: Summary must be a dictionary!"
        assert "total_focus_hours" in summary, "Error: missing focus hours counter!"
        assert "total_tasks_completed" in summary, "Error: missing completed tasks counter!"
        assert "category_distribution" in summary, "Error: missing category distribution profile!"
        
        print(f"[SUCCESS] Summary compiled correctly:")
        print(f"      Total focus hours: {summary['total_focus_hours']}")
        print(f"      Tasks completed: {summary['total_tasks_completed']}")
        print(f"      Completion rate: {summary['completion_rate']}%")
        print(f"      Distribution: {summary['category_distribution']}\n")
        
        # 3. Test Scikit-Learn Logistic Regression training & inference prediction
        print("[TEST] Executing Scikit-Learn Logistic Regression pipeline...")
        prediction = analytics_service.predict_completion_probability(db)
        
        assert isinstance(prediction, dict), "Error: Prediction output must be a dictionary!"
        assert "prediction_percentage" in prediction, "Error: missing prediction score!"
        assert "recommendations" in prediction, "Error: missing coaching recommendations!"
        
        print(f"[SUCCESS] Scikit-Learn Classifier trained successfully:")
        print(f"      Today's Completion Likelihood: {prediction['prediction_percentage']}%")
        print(f"      Training samples fitted: {prediction['model_metadata']['total_train_samples']}")
        print("      Coefficients:")
        print(f"          Hours impact: {prediction['model_metadata']['coefficient_hours']:.4f}")
        print(f"          Weekend impact: {prediction['model_metadata']['coefficient_weekend']:.4f}")
        print(f"          Topic variety impact: {prediction['model_metadata']['coefficient_categories']:.4f}\n")
        
        print("[SUCCESS] Dynamic Study Mentoring Recommendations:")
        for idx, rec in enumerate(prediction["recommendations"], 1):
            # Clean styling tags to print to console
            clean_rec = rec.replace("**", "").replace("🧠", "•").replace("🐍", "•").replace("📅", "•")
            print(f"   {idx}. {clean_rec}")
            
        print("\n[SUCCESS] Machine Learning & Habit Analytics pipeline operates correctly!")
        
    except AssertionError as ae:
        print(f"[FAIL] Assertion verification failed: {str(ae)}")
    except Exception as e:
        print(f"[ERROR] Unexpected runtime execution failure: {str(e)}")
    finally:
        db.close()
        print("[TEST] Verification session completed.")

if __name__ == "__main__":
    verify_ml_analytics()
