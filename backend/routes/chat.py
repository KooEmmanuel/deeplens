from fastapi import APIRouter, Depends, HTTPException
from langchain_community.chat_models import ChatOllama, ChatOpenAI
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from chromadb import Client
from chromadb.config import Settings
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any, Annotated, TypedDict
from database import get_db
from models import Conversation, Message
from pydantic import BaseModel
from datetime import datetime
import os
router = APIRouter()
client = Client(Settings(persist_directory="./chroma_db"))

# Initialize memory saver
checkpointer = MemorySaver()

class ChatState(TypedDict):
    messages: List[Dict[str, str]]
    context: str
    chat_history: List[Dict[str, str]]

# Define the conversation prompt
PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a helpful AI assistant. Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know, don't try to make up an answer.

Context: {context}

Answer in a helpful and detailed way."""),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}")
])

def create_chat_graph(model):
    # Define the function that processes messages
    def generate_response(state: ChatState) -> ChatState:
        # Process the last message
        response = model.invoke(
            PROMPT.format(
                context=state["context"],
                chat_history=state["chat_history"],
                input=state["messages"][-1]["content"]
            )
        )
        
        # Add the response to messages
        state["messages"].append({"role": "assistant", "content": response.content})
        return state

    # Create the graph
    workflow = StateGraph(ChatState)
    
    # Add the node that processes messages
    workflow.add_node("generate", generate_response)
    
    # Set the entry point
    workflow.set_entry_point("generate")
    
    # Add the edge from the generate node to the end
    workflow.add_edge("generate", END)
    
    # Compile the graph
    return workflow.compile()

# Define the request model
class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None
    document_name: Optional[str] = None
    api_key: Optional[str] = None
    selected_model: str = "deepseek-coder"

@router.post("/chat")
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    try:
        # Initialize model based on selection
        if request.selected_model.lower().startswith("gpt") or request.selected_model.lower().startswith("o"):
            model = ChatOpenAI(
                api_key=request.api_key,
                model_name=request.selected_model,
                temperature=0.7
            )
        else:
            model = ChatOllama(
                model=request.selected_model,
                base_url= os.getenv("OLLAMA_URL") or "http://localhost:11434"
            )

        # Prepare context from documents
        context = ""
        if request.document_name:
            collections = client.list_collections()
            for collection in collections:
                coll = client.get_collection(name=collection)
                try:
                    results = coll.query(
                        query_texts=[request.message],
                        n_results=5,
                        where={"documentName": request.document_name}
                    )
                    if results["documents"][0]:
                        context += "\n".join(results["documents"][0])
                except Exception as e:
                    print(f"Error querying collection {collection}: {e}")

        # Handle conversation creation/retrieval
        if request.conversation_id:
            # If we have a conversation ID, use the existing conversation
            conversation = db.query(Conversation).filter(Conversation.id == request.conversation_id).first()
            if not conversation:
                # If conversation doesn't exist (shouldn't happen normally), create new
                conversation = Conversation(created_at=datetime.utcnow())
                db.add(conversation)
                db.commit()
        else:
            # Only create a new conversation if we don't have a conversation_id
            conversation = Conversation(created_at=datetime.utcnow())
            db.add(conversation)
            db.commit()

        # Get existing chat history for this conversation
        chat_history = []
        for msg in conversation.messages:
            chat_history.append({
                "role": msg.role,
                "content": msg.content
            })

        # Create the chat graph
        chat_graph = create_chat_graph(model)

        # Invoke the graph
        final_state = chat_graph.invoke(
            {
                "messages": [{"role": "user", "content": request.message}],
                "context": context,
                "chat_history": chat_history
            },
            config={"configurable": {"thread_id": request.conversation_id or "new"}}
        )

        response = final_state["messages"][-1]["content"]

        # Add new messages to the same conversation
        user_message = Message(
            content=request.message,
            role="user",
            conversation_id=conversation.id
        )
        db.add(user_message)
        
        assistant_message = Message(
            content=response,
            role="assistant",
            conversation_id=conversation.id
        )
        db.add(assistant_message)
        db.commit()

        return {
            "response": response,
            "conversation_id": conversation.id,
            "sources": [{"content": context, "similarity": 1.0}] if context else []
        }

    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 