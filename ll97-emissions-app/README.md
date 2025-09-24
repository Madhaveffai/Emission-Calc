# LL97 Emissions App

A simple web app to calculate building emissions and compare to NYC LL97 limits.

## Setup

1. **Install dependencies:**
    ```bash
    cd ll97-emissions-app
    pip install -r requirements.txt
    ```

2. **Run the backend:**
    ```bash
    cd backend
    python app.py
    ```

3. **Open the frontend:**
    - Visit [http://localhost:5000](http://localhost:5000) in your browser.

## Project Structure

- `frontend/` — HTML/CSS/JS (Tailwind via CDN)
- `backend/` — Flask app and logic
- `uploads/` — Uploaded files
- `outputs/` — Generated reports
- `templates/` — PDF report template
- `static/` — Static assets
- `tests/` — Unit tests

## Notes
- This is a starter scaffold. Calculation and PDF logic are placeholders.
