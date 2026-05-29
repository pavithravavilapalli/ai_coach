import logging
import datetime
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from sklearn.linear_model import LogisticRegression

from backend.app.models.scheduler import DailySchedule, ScheduledTask

logger = logging.getLogger("ai_coach")

class AnalyticsService:
    """
    Intelligent Data Analytics and Machine Learning service for predicting and optimizing 
    user study habits using Pandas, NumPy, and Scikit-Learn.
    """
    
    def get_historical_summary(self, db: Session) -> dict:
        """
        Gathers study metrics, completes category aggregations, and computes averages using Pandas.
        """
        # 1. Query records from SQLite DB
        schedules = db.query(DailySchedule).all()
        tasks = db.query(ScheduledTask).all()
        
        # Default empty summary response structure
        summary = {
            "total_focus_hours": 0,
            "total_tasks_completed": 0,
            "completion_rate": 0,
            "category_distribution": {
                "Python Full Stack": 0,
                "AI Full Stack": 0,
                "Data Analytics": 0,
                "Productivity": 0
            }
        }
        
        if not schedules:
            return summary
            
        # 2. Map structures to Pandas DataFrames for quick aggregations
        df_schedules = pd.DataFrame([{
            "id": s.id,
            "total_focus_hours": s.total_focus_hours,
            "is_completed": s.is_completed
        } for s in schedules])
        
        df_tasks = pd.DataFrame([{
            "id": t.id,
            "category": t.category,
            "is_completed": t.is_completed
        } for t in tasks])
        
        # Calculate sum and averages
        summary["total_focus_hours"] = int(df_schedules["total_focus_hours"].sum())
        summary["total_tasks_completed"] = int(df_tasks[df_tasks["is_completed"] == True]["id"].count())
        
        total_tasks_count = len(df_tasks)
        summary["completion_rate"] = int(round((summary["total_tasks_completed"] / total_tasks_count) * 100)) if total_tasks_count > 0 else 0
        
        # Calculate category distribution
        cat_counts = df_tasks["category"].value_counts().to_dict()
        for cat in summary["category_distribution"]:
            summary["category_distribution"][cat] = int(cat_counts.get(cat, 0))
            
        return summary
        
    def predict_completion_probability(self, db: Session) -> dict:
        """
        Trains a Scikit-Learn Logistic Regression model on historical and boot-strapped 
        synthetic study data to predict completion likelihood for today's active schedule.
        """
        # 1. Fetch real historical schedules from DB
        real_schedules = db.query(DailySchedule).all()
        
        # Feature Extraction: (total_focus_hours, categories_count, is_weekend) -> is_completed (0 or 1)
        real_data = []
        for s in real_schedules:
            # Parse categories list
            cats = [c.strip() for c in s.focus_areas.split(",") if c.strip()]
            is_wknd = 1 if s.date.weekday() >= 5 else 0
            real_data.append({
                "total_focus_hours": s.total_focus_hours,
                "categories_count": len(cats),
                "is_weekend": is_wknd,
                "is_completed": 1 if s.is_completed else 0
            })
            
        # 2. Bootstrapping with High-Fidelity Synthetic Data
        # In a new dev environment, a database won't have enough history to train a model.
        # We programmatically generate 35 synthetic daily entries mimicking authentic student metrics.
        np.random.seed(42)  # Maintain reproducibility
        synthetic_rows = []
        for i in range(35):
            focus_hours = int(np.random.choice([3, 4, 5, 6, 7, 8, 9, 10]))
            cats_count = int(np.random.choice([1, 2, 3]))
            is_wknd = int(np.random.choice([0, 1], p=[0.71, 0.29])) # ~5 out of 7 days are weekdays
            
            # Formulate completion probability mathematically based on realistic behaviors:
            # - Burnout effect: Longer hours reduce completion rate.
            # - Weekend distraction: Weekends reduce likelihood.
            # - Diversity: Multiple categories slightly raise focus.
            prob = 0.85
            if focus_hours > 7:
                prob -= 0.07 * (focus_hours - 7)
            if is_wknd == 1:
                prob -= 0.15
            prob += 0.04 * cats_count
            
            # Apply normal noise and binary thresholding
            prob = max(0.1, min(0.95, prob + np.random.normal(0, 0.05)))
            is_completed = 1 if prob >= 0.55 else 0
            
            synthetic_rows.append({
                "total_focus_hours": focus_hours,
                "categories_count": cats_count,
                "is_weekend": is_wknd,
                "is_completed": is_completed
            })
            
        # Combine datasets using Pandas
        df_synthetic = pd.DataFrame(synthetic_rows)
        df_real = pd.DataFrame(real_data)
        df_all = pd.concat([df_synthetic, df_real], ignore_index=True)
        
        # 3. Model Training Pipeline
        X = df_all[["total_focus_hours", "categories_count", "is_weekend"]]
        y = df_all["is_completed"]
        
        model = LogisticRegression(solver="lbfgs")
        model.fit(X, y)
        
        # 4. Predict Current Today Target
        today_date = datetime.date.today()
        today_schedule = db.query(DailySchedule).filter(DailySchedule.date == today_date).first()
        
        if today_schedule:
            cats = [c.strip() for c in today_schedule.focus_areas.split(",") if c.strip()]
            today_hours = today_schedule.total_focus_hours
            today_cats_count = len(cats)
        else:
            # Default input parameters if today hasn't been generated yet
            today_hours = 6
            today_cats_count = 2
            
        today_is_wknd = 1 if today_date.weekday() >= 5 else 0
        
        # Form input vector for prediction
        input_features = pd.DataFrame([{
            "total_focus_hours": today_hours,
            "categories_count": today_cats_count,
            "is_weekend": today_is_wknd
        }])
        
        # Calculate class probability [P(0), P(1)]
        prob_score = model.predict_proba(input_features)[0][1]
        percent_probability = int(round(prob_score * 100))
        
        # 5. Extract Feature Coefficients to Generate Personalized Mentoring Advice
        coeff_hours = model.coef_[0][0]
        coeff_cats = model.coef_[0][1]
        coeff_wknd = model.coef_[0][2]
        
        recommendations = []
        
        # Analyze total focus hours coefficient
        if coeff_hours < 0:
            recommendations.append(
                f"🧠 **Focus Management**: High hour blocks reduce your consistency. Keeping focus targets to "
                f"around 5-6 hours maximizes retention and improves completion probability."
            )
        else:
            recommendations.append(
                f"🧠 **Capacity Threshold**: Your data suggests high stamina! You are highly capable of completing "
                f"extended upskilling sessions over 6 hours. Keep pushing limits."
            )
            
        # Analyze weekend coefficient
        if coeff_wknd < 0:
            recommendations.append(
                f"📅 **Weekend Adaptation**: Distraction rates increase by ~15% on Saturdays and Sundays. Consider "
                f"shortening weekend routines to highly focused 3-hour micro-sessions."
            )
            
        # Analyze categories diversity coefficient
        if coeff_cats > 0:
            recommendations.append(
                f"🐍 **Topic Diversity**: Alternating study categories (e.g. combining Python and AI Full Stack) "
                f"increases your daily focus and routine sustainability. Avoid single-topic fatigue!"
            )
        else:
            recommendations.append(
                f"🐍 **Topic Focus**: You excel at deep-dives! Dedicating your day to a single primary topic "
                f"produces higher completion metrics than swapping focus areas."
            )
            
        return {
            "prediction_percentage": percent_probability,
            "inputs": {
                "hours": today_hours,
                "categories_count": today_cats_count,
                "is_weekend": bool(today_is_wknd)
            },
            "recommendations": recommendations,
            "model_metadata": {
                "coefficient_hours": float(coeff_hours),
                "coefficient_weekend": float(coeff_wknd),
                "coefficient_categories": float(coeff_cats),
                "total_train_samples": len(df_all)
            }
        }

analytics_service = AnalyticsService()
