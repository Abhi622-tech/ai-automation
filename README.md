# AI Automation & FAQ Assistant 🤖

A modern, responsive web application built with Python, Flask, and the Google Gemini API. This project serves as an intelligent AI-powered conversational assistant, capable of answering queries, maintaining conversation history, and providing quick-action FAQ presets.

## 🌟 Features

- **Google Gemini Integration:** Leverages the power of Google's Gemini 2.5 Flash model for fast, intelligent, and context-aware responses.
- **Modern UI/UX:** A sleek, dark-themed responsive interface designed for an optimal user experience across all devices.
- **Chat History:** Persistent multi-turn conversation history accessible via a slide-out panel, managed using browser `localStorage`.
- **Quick Questions:** Pre-configured FAQ presets for rapid interactions.
- **Session Info Tracking:** Monitors messages sent and API status in real-time.

## 🛠️ Tech Stack

- **Backend:** Python, Flask, Flask-CORS
- **AI Integration:** Google Generative AI (Gemini API)
- **Frontend:** HTML5, CSS3 (Custom Dark Theme), Vanilla JavaScript
- **Environment Management:** python-dotenv

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- A Google Gemini API Key. You can get one for free at [Google AI Studio](https://aistudio.google.com/app/apikey).

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Abhi622-tech/ai-automation.git
   cd ai-automation
   ```

2. **Set up a virtual environment (optional but recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables:**
   Create a `.env` file in the root directory (you can use `.env.example` as a template) and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

5. **Run the Application:**
   ```bash
   python app.py
   # Or using Flask:
   # flask run
   ```

6. **Open in Browser:**
   Navigate to `http://127.0.0.1:5000` to start chatting with the AI!

## 📁 Project Structure

```text
ai-automation/
├── app.py                 # Main Flask application entry point
├── requirements.txt       # Python dependencies
├── .env.example           # Example environment variables file
├── static/
│   ├── css/
│   │   └── style.css      # Custom styles and UI theme
│   └── js/
│       └── app.js         # Frontend logic and chat history management
└── templates/
    └── index.html         # Main application web interface
```

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request if you'd like to improve the project.
