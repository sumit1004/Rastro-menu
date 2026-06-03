CREATE DATABASE IF NOT EXISTS rastro_db;
USE rastro_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('restaurant', 'admin') DEFAULT 'restaurant',
    reset_password_token VARCHAR(255) NULL DEFAULT NULL,
    reset_password_expires DATETIME NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS restaurants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    restaurant_name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    logo VARCHAR(255),
    banner VARCHAR(255),
    description TEXT,
    address VARCHAR(255),
    phone VARCHAR(50),
    cuisine_type VARCHAR(100),
    instagram_link VARCHAR(255),
    website_link VARCHAR(255),
    opening_hours VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ar_model_library (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dish_name VARCHAR(255) NOT NULL,
    dish_slug VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(255),
    glb_url TEXT NOT NULL,
    usdz_url TEXT NULL,
    thumbnail_url TEXT NULL,
    preview_image TEXT NULL,
    tags TEXT NULL,
    optimized BOOLEAN DEFAULT TRUE,
    polygon_count INT NULL,
    file_size_mb DECIMAL(10,2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS dishes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    short_description VARCHAR(255),
    description TEXT,
    ingredients TEXT,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    spice_level INT DEFAULT 0,
    calories INT,
    preparation_time INT,
    image_url VARCHAR(255),
    thumbnail_url VARCHAR(255),
    average_rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INT DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    dish_role VARCHAR(50) DEFAULT NULL,
    cuisine_type VARCHAR(50) DEFAULT NULL,
    meal_type VARCHAR(50) DEFAULT NULL,
    has_full_plate BOOLEAN DEFAULT TRUE,
    has_half_plate BOOLEAN DEFAULT FALSE,
    full_plate_price DECIMAL(10, 2) DEFAULT 0,
    half_plate_price DECIMAL(10, 2) DEFAULT 0,
    glb_model_url VARCHAR(255) NULL,
    usdz_model_url VARCHAR(255) NULL,
    enable_3d_ar BOOLEAN DEFAULT FALSE,
    model_scale VARCHAR(50) NULL,
    model_rotation VARCHAR(50) NULL,
    model_height_offset VARCHAR(50) NULL,
    ar_model_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (ar_model_id) REFERENCES ar_model_library(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dish_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS menu_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    device_type VARCHAR(50),
    browser VARCHAR(50),
    visit_source VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dish_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dish_id INT NOT NULL,
    restaurant_id INT NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    view_duration INT DEFAULT 0,
    clicked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

CREATE INDEX idx_dish_views_dish_rest ON dish_views (dish_id, restaurant_id);
CREATE INDEX idx_dish_views_created ON dish_views (created_at);

CREATE TABLE IF NOT EXISTS search_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    session_id VARCHAR(255),
    search_query VARCHAR(255) NOT NULL,
    results_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

CREATE INDEX idx_search_logs_rest_created ON search_logs (restaurant_id, created_at);
CREATE INDEX idx_search_logs_query ON search_logs (search_query);

CREATE TABLE IF NOT EXISTS dish_suggestions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    dish_id INT NOT NULL,
    suggested_dish_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
    FOREIGN KEY (suggested_dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_suggestion (dish_id, suggested_dish_id)
);

CREATE INDEX idx_dish_suggestions_dish_id ON dish_suggestions(dish_id);
CREATE INDEX idx_dish_suggestions_restaurant_id ON dish_suggestions(restaurant_id);

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    table_number VARCHAR(50) NOT NULL,
    customer_mobile VARCHAR(20) NOT NULL,
    customer_note TEXT,
    order_status ENUM('pending', 'accepted', 'ready', 'completed', 'cancelled', 'delivered') DEFAULT 'pending',
    total_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

CREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    dish_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    plate_type ENUM('full', 'half') DEFAULT 'full',
    item_price DECIMAL(10, 2) NOT NULL,
    item_note VARCHAR(255),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

CREATE TABLE IF NOT EXISTS dish_pairings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    dish_id INT NOT NULL,
    paired_dish_id INT NOT NULL,
    priority INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
    FOREIGN KEY (paired_dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_pairing (dish_id, paired_dish_id)
);

CREATE INDEX idx_dish_pairings_dish_id ON dish_pairings(dish_id);
CREATE INDEX idx_dish_pairings_restaurant_id ON dish_pairings(restaurant_id);

-- Additional Indexes for Production Hardening
CREATE INDEX idx_dishes_category ON dishes(category);
CREATE INDEX idx_dishes_is_featured ON dishes(is_featured);
CREATE INDEX idx_dishes_is_available ON dishes(is_available);
CREATE INDEX idx_dishes_created_at ON dishes(created_at);
CREATE INDEX idx_ar_model_library_category ON ar_model_library(category);
