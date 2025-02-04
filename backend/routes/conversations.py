from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Conversation, Message
from typing import List
from datetime import datetime

router = APIRouter()

@router.get("/conversations")
async def get_conversations(db: Session = Depends(get_db)):
    try:
        conversations = db.query(Conversation)\
            .order_by(Conversation.created_at.desc())\
            .all()
        
        return [
            {
                "id": conv.id,
                "messages": [
                    {
                        "role": msg.role,
                        "content": msg.content
                    }
                    for msg in conv.messages
                ]
            }
            for conv in conversations
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/conversations")
async def create_conversation(db: Session = Depends(get_db)):
    try:
        conversation = Conversation(created_at=datetime.utcnow())
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return {
            "id": conversation.id,
            "messages": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/conversations")
async def delete_conversations(db: Session = Depends(get_db)):
    try:
        db.query(Conversation).delete()
        db.commit()
        return {"message": "All conversations deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 