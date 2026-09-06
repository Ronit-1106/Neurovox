-- Neurovox MySQL Database Schema
-- Compatible with MySQL 5.7+ and MySQL 8.0+

CREATE DATABASE IF NOT EXISTS neurovox_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE neurovox_db;

-- 1. Face Scans Table with 30-day expiration tracking
CREATE TABLE IF NOT EXISTS face_scans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sql_id VARCHAR(64) UNIQUE,
    username VARCHAR(255) NOT NULL DEFAULT 'Anonymous User',
    recommended_size ENUM('Small', 'Medium', 'Large') NOT NULL,
    jaw_width_cm DECIMAL(5, 2) NULL,
    face_height_cm DECIMAL(5, 2) NULL,
    jaw_width_px DECIMAL(7, 2) NULL,
    face_height_px DECIMAL(7, 2) NULL,
    facial_ratio DECIMAL(5, 2) NULL,
    confidence DECIMAL(4, 3) DEFAULT 0.95,
    selected_mask_style VARCHAR(255) NULL,
    notes TEXT NULL,
    device_info VARCHAR(255) NULL,
    scan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    INDEX idx_username (username),
    INDEX idx_expires (expires_at),
    INDEX idx_scan_date (scan_date)
) ENGINE=InnoDB;

-- 2. Mask Orders Table
CREATE TABLE IF NOT EXISTS mask_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(64) NOT NULL UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    mask_style VARCHAR(255) NOT NULL,
    mask_color VARCHAR(100) NOT NULL DEFAULT 'Midnight Black',
    mask_size ENUM('Small', 'Medium', 'Large') NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    shipping_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    shipping_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(30) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Credit Card',
    payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'paid',
    order_status ENUM('confirmed', 'processing', 'shipped', 'delivered') DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_customer_email (customer_email),
    INDEX idx_order_number (order_number)
) ENGINE=InnoDB;

-- 3. Automatic 30-Day Expiration Event Scheduler (MySQL 8.0 / Event Scheduler)
-- Purges facial scan records older than their 30-day retention window
SET GLOBAL event_scheduler = ON;

DELIMITER $$
CREATE EVENT IF NOT EXISTS purge_expired_scans_event
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    DELETE FROM face_scans 
    WHERE expires_at < NOW();
END$$
DELIMITER ;
