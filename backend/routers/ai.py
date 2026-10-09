from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.services.forecasting import calculate_inventory_forecasts

router = APIRouter(prefix="/api/ai", tags=["AI Engine"])

@router.get("/insights")
def get_ai_insights(db: Session = Depends(get_db)):
    """
    Calculates live inventory forecasting, burn rates, days until stockout,
    safety stock reorder recommendations, and anomalies based on real database records.
    """
    return calculate_inventory_forecasts(db)

from typing import Optional, Dict, Any
from pydantic import BaseModel
from backend.services.agent import run_agent_turn

class ChatRequest(BaseModel):
    prompt: str = ""
    action: Optional[Dict[str, Any]] = None

@router.post("/chat")
def chat_with_agent(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Agentic Copilot endpoint with live tool calling, catalog querying,
    and PO creation execution.
    """
    return run_agent_turn(req.prompt, db, req.action)

