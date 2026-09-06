"""
Neurovox Database Connection Module
Supports MySQL with connection pooling and automated fallback for development.
"""
import os
import uuid
import sqlite3
from datetime import datetime, timedelta

MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "neurovox_db")

# Detect whether mysql-connector is installed and reachable
USE_MYSQL = False
mysql_pool = None

try:
    import mysql.connector
    from mysql.connector import pooling
    try:
        mysql_pool = pooling.MySQLConnectionPool(
            pool_name="neurovox_pool",
            pool_size=5,
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE,
            connect_timeout=3
        )
        USE_MYSQL = True
        print("[DB] Connected successfully to MySQL instance.")
    except Exception as e:
        print(f"[DB Notice] MySQL not connected ({e}). Using local SQLite for zero-config operation.")
except ImportError:
    print("[DB Notice] mysql-connector-python not found. Using local SQLite mode.")


def get_sqlite_conn():
    conn = sqlite3.connect("neurovox_local.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    # Init tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS face_scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sql_id TEXT UNIQUE,
        username TEXT NOT NULL,
        recommended_size TEXT NOT NULL,
        jaw_width_cm REAL,
        face_height_cm REAL,
        facial_ratio REAL,
        confidence REAL,
        selected_mask_style TEXT,
        notes TEXT,
        scan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS mask_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE,
        customer_name TEXT,
        customer_email TEXT,
        mask_style TEXT,
        mask_color TEXT,
        mask_size TEXT,
        quantity INTEGER DEFAULT 1,
        total_amount REAL,
        shipping_address TEXT,
        city TEXT,
        postal_code TEXT,
        status TEXT DEFAULT 'confirmed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    conn.commit()
    return conn


def save_face_scan(data):
    now = datetime.utcnow()
    expires = now + timedelta(days=30)
    sql_id = f"scan_{uuid.uuid4().hex[:12]}"

    if USE_MYSQL and mysql_pool:
        conn = mysql_pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        query = """
            INSERT INTO face_scans 
            (sql_id, username, recommended_size, jaw_width_cm, face_height_cm, facial_ratio, confidence, selected_mask_style, notes, expires_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            sql_id,
            data.get("username", "Anonymous User"),
            data.get("recommendedSize", "Medium"),
            data.get("jawWidthCm"),
            data.get("faceHeightCm"),
            data.get("facialRatio"),
            data.get("confidence", 0.96),
            data.get("selectedMaskStyle", "Everyday Comfort Mask"),
            data.get("notes"),
            expires
        ))
        conn.commit()
        last_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return {
            "id": last_id,
            "sqlId": sql_id,
            "username": data.get("username"),
            "recommendedSize": data.get("recommendedSize"),
            "expiresAt": int(expires.timestamp() * 1000),
            "dbEngine": "MySQL 8.0"
        }
    else:
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO face_scans 
            (sql_id, username, recommended_size, jaw_width_cm, face_height_cm, facial_ratio, confidence, selected_mask_style, notes, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            sql_id,
            data.get("username", "Anonymous User"),
            data.get("recommendedSize", "Medium"),
            data.get("jawWidthCm"),
            data.get("faceHeightCm"),
            data.get("facialRatio"),
            data.get("confidence", 0.96),
            data.get("selectedMaskStyle", "Everyday Comfort Mask"),
            data.get("notes"),
            expires.isoformat()
        ))
        conn.commit()
        last_id = cursor.lastrowid
        conn.close()
        return {
            "id": last_id,
            "sqlId": sql_id,
            "username": data.get("username"),
            "recommendedSize": data.get("recommendedSize"),
            "expiresAt": int(expires.timestamp() * 1000),
            "dbEngine": "SQLite (Local DB)"
        }


def get_face_scans(username=None):
    if USE_MYSQL and mysql_pool:
        conn = mysql_pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        if username:
            cursor.execute("SELECT * FROM face_scans WHERE username = %s ORDER BY scan_date DESC LIMIT 50", (username,))
        else:
            cursor.execute("SELECT * FROM face_scans ORDER BY scan_date DESC LIMIT 50")
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return rows
    else:
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        if username:
            cursor.execute("SELECT * FROM face_scans WHERE username = ? ORDER BY scan_date DESC LIMIT 50", (username,))
        else:
            cursor.execute("SELECT * FROM face_scans ORDER BY scan_date DESC LIMIT 50")
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return rows


def save_order(data):
    order_number = f"NVX-{uuid.uuid4().hex[:6].upper()}"
    now = datetime.utcnow()

    if USE_MYSQL and mysql_pool:
        conn = mysql_pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        query = """
            INSERT INTO mask_orders 
            (order_number, customer_name, customer_email, mask_style, mask_color, mask_size, quantity, subtotal, tax, shipping_fee, total_amount, shipping_address, city, postal_code, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            order_number,
            data.get("customerName"),
            data.get("customerEmail"),
            data.get("maskStyle"),
            data.get("maskColor", "Midnight Black"),
            data.get("maskSize", "Medium"),
            data.get("quantity", 1),
            data.get("subtotal", 24.00),
            data.get("tax", 1.92),
            data.get("shippingFee", 0.00),
            data.get("totalAmount", 25.92),
            data.get("shippingAddress"),
            data.get("city"),
            data.get("postalCode"),
            "confirmed"
        ))
        conn.commit()
        last_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return {"id": last_id, "orderNumber": order_number, "status": "confirmed", "dbEngine": "MySQL 8.0"}
    else:
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO mask_orders 
            (order_number, customer_name, customer_email, mask_style, mask_color, mask_size, quantity, total_amount, shipping_address, city, postal_code, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            order_number,
            data.get("customerName"),
            data.get("customerEmail"),
            data.get("maskStyle"),
            data.get("maskColor", "Midnight Black"),
            data.get("maskSize", "Medium"),
            data.get("quantity", 1),
            data.get("totalAmount", 24.00),
            data.get("shippingAddress"),
            data.get("city"),
            data.get("postalCode"),
            "confirmed"
        ))
        conn.commit()
        last_id = cursor.lastrowid
        conn.close()
        return {"id": last_id, "orderNumber": order_number, "status": "confirmed", "dbEngine": "SQLite (Local DB)"}


def get_orders():
    if USE_MYSQL and mysql_pool:
        conn = mysql_pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM mask_orders ORDER BY created_at DESC LIMIT 50")
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return rows
    else:
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM mask_orders ORDER BY created_at DESC LIMIT 50")
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return rows
