# AI Career Coach & Intelligent Scheduler

An intelligent productivity dashboard featuring a Daily Routine Planner, AI Career Mentor, Productivity & Habit Analytics, and Developer Health Hub.

## 🔗 Deployment & Project URLs

*   **GitHub Repository**: [https://github.com/pavithravavilapalli/ai_coach](https://github.com/pavithravavilapalli/ai_coach)
*   **Vercel Production Deployment**: [https://ai-coach-divv.vercel.app](https://ai-coach-divv.vercel.app)
*   **Vercel Project Dashboard**: [https://vercel.com/pavithra-vavilapallis-projects/ai-coach-divv](https://vercel.com/pavithra-vavilapallis-projects/ai-coach-divv)

---

## 🛠️ Multi-Service Architecture & Routing

The application is deployed on Vercel using **Vercel Services** to run the static HTML/JS frontend and Python FastAPI backend together on a single domain.

### Local Development Routing
*   **Frontend Web Server**: `http://localhost:8080`
*   **Backend API Server**: `http://localhost:8000`
*   **Local SQLite DB**: `./ai_coach.db`

### Production Vercel Routing
*   **Frontend Path**: `/` (resolves to the `frontend` folder containing `index.html`)
*   **Backend API Path**: `/_/backend` (resolves to the `backend` folder containing the FastAPI application)
*   **Production SQLite DB**: `/tmp/sql_app.db` (ephemeral writable directory for Vercel Serverless environment)

The frontend client dynamically resolves the backend URL base dynamically:
```javascript
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000'
    : `${window.location.origin}/_/backend`;
```

---

## 🚀 Deployment Instructions

1.  **Link GitHub Repo**: In your Vercel Dashboard, import the repository `https://github.com/pavithravavilapalli/ai_coach`.
2.  **Select Application Preset**: Set the preset to **Services** (as configured in your `vercel.json` file).
3.  **Environment Variables**: In your Vercel Project settings, configure your required secrets:
    *   `GEMINI_API_KEY`: Your Google Gemini API Key.
    *   `VERCEL`: `1` (indicates execution under the serverless Vercel runtime to enable `/tmp` database path mapping).
4.  **Deploy**: Click deploy. Vercel will automatically build the static frontend under `/` and start the Python FastAPI service under `/_/backend`.
