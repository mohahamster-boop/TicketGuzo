CREATE DATABASE IF NOT EXISTS TicketGuzo_demo;
USE TicketGuzo_demo;

CREATE TABLE IF NOT EXISTS routes (
 id INT AUTO_INCREMENT PRIMARY KEY,
 origin VARCHAR(100) NOT NULL,
 destination VARCHAR(100) NOT NULL,
 departure_time VARCHAR(20) NOT NULL,
 arrival_time VARCHAR(20) NOT NULL,
 duration VARCHAR(30) NOT NULL,
 price DECIMAL(10,2) NOT NULL,
 class_type ENUM('Standard','VIP') DEFAULT 'Standard',
 frequency VARCHAR(40) DEFAULT 'Daily',
 seats_total INT DEFAULT 45
);

CREATE TABLE IF NOT EXISTS bookings (
 id INT AUTO_INCREMENT PRIMARY KEY,
 route_id INT NOT NULL,
 passenger_name VARCHAR(120) NOT NULL,
 phone VARCHAR(30) NOT NULL,
 email VARCHAR(160),
 travel_date DATE NOT NULL,
 seats VARCHAR(255) NOT NULL,
 total_amount DECIMAL(10,2) NOT NULL,
 status VARCHAR(30) DEFAULT 'pending',
 payment_method VARCHAR(50),
 transaction_ref VARCHAR(100),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (route_id) REFERENCES routes(id)
);

CREATE TABLE IF NOT EXISTS messages (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(120) NOT NULL,
 email VARCHAR(160) NOT NULL,
 message TEXT NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO routes (origin,destination,departure_time,arrival_time,duration,price,class_type,frequency,seats_total) VALUES
('Addis Ababa','Bahir Dar','06:00 AM','04:00 PM','10h','750','Standard','Daily',45),
('Addis Ababa','Dire Dawa','06:00 AM','02:00 PM','8h','850','VIP','Daily',45),
('Addis Ababa','Hawassa','07:00 AM','11:00 AM','4h','450','Standard','Daily',45),
('Addis Ababa','Gondar','05:00 AM','05:00 PM','12h','950','VIP','Daily',45),
('Addis Ababa','Mekelle','04:00 AM','06:00 PM','14h','1100','VIP','3x Weekly',45),
('Addis Ababa','Jimma','06:30 AM','12:30 PM','6h','550','Standard','Daily',45),
('Addis Ababa','Jijiga','05:00 AM','05:00 PM','12h','1000','VIP','Daily',45),
('Addis Ababa','Harar','05:30 AM','02:30 PM','9h','900','VIP','Daily',45),
('Addis Ababa','Dessie','06:00 AM','02:00 PM','8h','700','VIP','Daily',45),
('Hawassa','Arba Minch','06:00 AM','11:00 AM','5h','400','Standard','Daily',45),
('Bahir Dar','Gondar','07:00 AM','10:00 AM','3h','350','VIP','Daily',45),
('Dire Dawa','Harar','08:00 AM','09:30 AM','1.5h','150','Standard','Daily',45);
