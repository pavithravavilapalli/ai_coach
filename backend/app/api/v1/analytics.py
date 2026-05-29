from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any

from backend.app.api.deps import get_db
from backend.app.services.analytics import analytics_service

router = APIRouter()

@router.get("/summary", response_model=Dict[str, Any])
def get_habit_summary(db: Session = Depends(get_db)):
    """
    Computes statistical habit summaries, average focus hours, 
    and track coverage using Pandas aggregations on the SQLite database.
    """
    try:
        data = analytics_service.get_historical_summary(db=db)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while compiling habit stats: {str(e)}"
        )

@router.get("/predict", response_model=Dict[str, Any])
def get_completion_prediction(db: Session = Depends(get_db)):
    """
    Trains a Logistic Regression model on historical study logs and bootstrapped 
    data to classify the probability of completing today's target program, returning
    senior developer recommendations.
    """
    try:
        prediction = analytics_service.predict_completion_probability(db=db)
        return prediction
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while generating the predictive study score: {str(e)}"
        )
