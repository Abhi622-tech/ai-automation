import os
import json
from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

app = Flask(__name__)
app.secret_key = os.urandom(24)
CORS(app)

# ─── Gemini API Setup ──────────────────────────────────────────────────────────
API_KEY = os.getenv("GEMINI_API_KEY", "")
if not API_KEY or API_KEY == "your_gemini_api_key_here":
    print("\n[WARNING] No Gemini API key found!")
    print("   Get your FREE key at: https://aistudio.google.com/app/apikey")
    print("   Then copy .env.example -> .env and paste your key.\n")
else:
    genai.configure(api_key=API_KEY)
    print(f"[OK] Gemini API configured successfully.")

# ─── AI System Prompt ──────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are an intelligent, friendly AI Assistant. Your job is to:
- Answer questions clearly and concisely
- Provide helpful, accurate information
- Format your responses with markdown when appropriate (use **bold**, bullet points, numbered lists, etc.)
- Be conversational but professional
- If you don't know something, say so honestly
- Offer to elaborate or clarify when needed

Always aim to be helpful, accurate, and easy to understand."""

# ─── In-memory conversation store (per session) ───────────────────────────────
conversation_histories = {}

FAQ_SUGGESTIONS = [
    "What is artificial intelligence?",
    "How does machine learning work?",
    "What are the best programming languages to learn in 2024?",
    "Explain cloud computing in simple terms",
    "What is the difference between AI and automation?",
    "How can I improve my productivity?",
    "What is Python used for?",
    "Explain REST APIs simply",
]


def get_session_id():
    """Get or create a unique session identifier."""
    if "session_id" not in session:
        import uuid
        session["session_id"] = str(uuid.uuid4())
    return session["session_id"]


def get_gemini_response(user_message: str, history: list) -> str:
    """Send message to Gemini API and return response."""
    if not API_KEY or API_KEY == "your_gemini_api_key_here":
        return (
            "⚠️ **API Key Not Set**\n\n"
            "To use this AI Assistant, you need a free Gemini API key:\n\n"
            "1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)\n"
            "2. Sign in with your Google account\n"
            "3. Click **Create API Key**\n"
            "4. Copy `.env.example` to `.env`\n"
            "5. Paste your key as `GEMINI_API_KEY=your_key_here`\n"
            "6. Restart the server with `python app.py`\n\n"
            "It's **completely free** — no credit card needed! 🎉"
        )

    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=SYSTEM_PROMPT,
        )

        # Build chat history in Gemini format
        gemini_history = []
        for msg in history[:-1]:  # Exclude the latest message (sent separately)
            role = "user" if msg["role"] == "user" else "model"
            gemini_history.append({"role": role, "parts": [msg["content"]]})

        chat = model.start_chat(history=gemini_history)
        response = chat.send_message(user_message)
        return response.text

    except Exception as e:
        error_msg = str(e)
        if "API_KEY_INVALID" in error_msg or "INVALID_ARGUMENT" in error_msg:
            return (
                "❌ **Invalid API Key**\n\n"
                "Your API key appears to be invalid. Please:\n"
                "1. Visit https://aistudio.google.com/app/apikey\n"
                "2. Generate a new key\n"
                "3. Update your `.env` file and restart."
            )
        elif "QUOTA_EXCEEDED" in error_msg or "429" in error_msg:
            return (
                "⏳ **Rate Limit Reached**\n\n"
                "You've hit the free tier limit. Please wait a minute and try again.\n"
                "Free tier: 15 requests/minute, 1M tokens/day."
            )
        else:
            return f"❌ **Error**: {error_msg}\n\nPlease try again."


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    """Main chat endpoint."""
    data = request.get_json()
    user_message = data.get("message", "").strip()
    chat_id = data.get("chat_id", None)

    if not user_message:
        return jsonify({"error": "Message cannot be empty"}), 400

    if not chat_id:
        chat_id = get_session_id()

    # Initialize history for this session
    if chat_id not in conversation_histories:
        conversation_histories[chat_id] = []

    history = conversation_histories[chat_id]

    # Add user message to history
    history.append({"role": "user", "content": user_message})

    # Get AI response
    ai_response = get_gemini_response(user_message, history)

    # Add AI response to history
    history.append({"role": "assistant", "content": ai_response})

    # Keep history manageable (last 20 messages)
    if len(history) > 20:
        conversation_histories[chat_id] = history[-20:]

    return jsonify({
        "response": ai_response,
        "message_count": len(history),
    })


@app.route("/api/clear", methods=["POST"])
def clear_history():
    """Clear conversation history for the session."""
    data = request.get_json() or {}
    chat_id = data.get("chat_id", None)
    
    if not chat_id:
        chat_id = get_session_id()
        
    if chat_id in conversation_histories:
        conversation_histories[chat_id] = []
    return jsonify({"status": "cleared", "chat_id": chat_id})


@app.route("/api/faq-suggestions", methods=["GET"])
def faq_suggestions():
    """Return preset FAQ suggestions."""
    return jsonify({"suggestions": FAQ_SUGGESTIONS})


@app.route("/api/status", methods=["GET"])
def status():
    """Check API status."""
    key_set = bool(API_KEY and API_KEY != "your_gemini_api_key_here")
    return jsonify({
        "api_configured": key_set,
        "model": "gemini-2.5-flash",
        "status": "ready" if key_set else "needs_api_key",
    })


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n" + "="*55)
    print("  [AI]  AI Assistant")
    print("  Powered by Google Gemini (Free API)")
    print("="*55)
    print("  [WEB] Open: http://localhost:5000")
    print("  [DOC] Docs: .env.example for API key setup")
    print("="*55 + "\n")
    app.run(debug=True, port=5000)
