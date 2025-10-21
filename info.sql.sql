CREATE DATABASE event_booking;

USE event_booking;

CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  date DATE,
  seats INT
);

CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_name VARCHAR(255),
  event_id INT,
  FOREIGN KEY (event_id) REFERENCES events(id)
);

INSERT INTO events (name, date, seats)
VALUES 
('Tech Expo 2025', '2025-11-10', 50),
('Music Festival', '2025-12-05', 100),
('Startup Meetup', '2025-11-20', 30);
