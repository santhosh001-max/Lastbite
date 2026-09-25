CREATE DATABASE IF NOT EXISTS lastbite
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lastbite;

CREATE TABLE IF NOT EXISTS food_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  category VARCHAR(80) NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  unit VARCHAR(30) NOT NULL DEFAULT 'servings',
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  expiry_date DATETIME NULL,
  image_url TEXT NULL,
  status ENUM('available','reserved','donated','sold','expired','deleted') NOT NULL DEFAULT 'available',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_food_status (status),
  INDEX idx_food_expiry (expiry_date)
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','staff') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;
