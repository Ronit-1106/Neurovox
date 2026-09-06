# Neurovox — Python, HTML, CSS & MySQL Stack

This directory contains the standalone, production-ready implementation of **Neurovox** powered by **Python (Flask), HTML5, CSS3, and MySQL 8.0**.

---

## Architecture Overview

- **Backend:** Python 3.10+ / Flask with REST API endpoints.
- **Frontend:** Pure HTML5, CSS3, and modern Vanilla JavaScript (no heavy node dependencies required).
- **Database:** MySQL 8.0+ relational tables with auto-increment IDs, indexes, foreign keys, and a scheduled 30-day retention purge event.
- **Biometrics Engine:** Python anthropometric calculation module for jaw width, nasal height, and face ratio classification.

---

## Project Structure

```
python_mysql_app/
├── app.py                  # Python Flask Web & REST API server
├── database.py             # MySQL connection pool & queries (with SQLite fallback)
├── schema.mysql.sql        # Complete MySQL database DDL schema & 30-day event
├── requirements.txt        # Python pip dependencies (Flask, mysql-connector, etc.)
├── Dockerfile              # Docker container definition for Python app
├── docker-compose.yml      # Orchestrates MySQL 8.0 container + Flask container
├── templates/
│   └── index.html          # Semantic HTML5 template (Camera, Store, Checkout)
└── static/
    ├── css/
    │   └── style.css       # Pure CSS3 stylesheet (Olive, Sage, Cream aesthetic)
    └── js/
        └── app.js          # WebRTC camera, canvas guides, store & API client
```

---

## Running with Docker Compose (Recommended)

To run both MySQL 8.0 and the Python web server with a single command:

```bash
docker-compose up --build
```

- Web application will be live at: `http://localhost:5000`
- MySQL database will be available at: `localhost:3306`
- Database name: `neurovox_db` (root password: `rootpassword`)

---

## Running Locally on Host Machine

### 1. Set Up MySQL Database
Log into your local MySQL server and run the schema file:

```bash
mysql -u root -p < schema.mysql.sql
```

### 2. Install Python Dependencies
```bash
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure Environment Variables (Optional)
Create a `.env` file or export environment variables:
```bash
export MYSQL_HOST=localhost
export MYSQL_PORT=3306
export MYSQL_USER=root
export MYSQL_PASSWORD=your_password
export MYSQL_DATABASE=neurovox_db
export PORT=5000
```

*Note: If MySQL is not running or unreachable, the application automatically uses local SQLite (`neurovox_local.db`) so you can test immediately without setup errors.*

### 4. Start the Application
```bash
python3 app.py
```
Open your browser at `http://localhost:5000`.

---

## API Endpoints

- `POST /api/scan`: Accepts facial dimensions, calculates mask size in Python, and records to MySQL.
- `GET /api/scans`: Queries the MySQL database for past scans within the 30-day window.
- `POST /api/orders`: Validates and records customized mask orders to MySQL.
- `GET /api/orders`: Retrieves confirmed customer orders.
- `GET /api/health`: Healthcheck reporting database status and retention policy.
