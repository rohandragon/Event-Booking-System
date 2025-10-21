import mysql from "mysql2";

export const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "", // your MySQL password
  database: "event_booking",
});

db.connect((err) => {
  if (err) throw err;
  console.log("✅ Connected to MySQL Database");
});

import express from "express";
import { db } from "./db.js";

const router = express.Router();

// Get all events
router.get("/events", (req, res) => {
  db.query("SELECT * FROM events", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// Get all bookings
router.get("/bookings", (req, res) => {
  db.query("SELECT * FROM bookings", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// Book event
router.post("/book", (req, res) => {
  const { user_name, event_id } = req.body;

  db.query("SELECT seats FROM events WHERE id=?", [event_id], (err, data) => {
    if (err) return res.status(500).send(err);
    if (data[0].seats <= 0) return res.status(400).json({ message: "No seats available" });

    db.query("INSERT INTO bookings (user_name, event_id) VALUES (?, ?)", [user_name, event_id], (err2) => {
      if (err2) return res.status(500).send(err2);

      db.query("UPDATE events SET seats = seats - 1 WHERE id=?", [event_id]);
      res.json({ message: "Booking successful" });
    });
  });
});

// Cancel booking
router.delete("/cancel/:id", (req, res) => {
  const id = req.params.id;

  db.query("SELECT event_id FROM bookings WHERE id=?", [id], (err, data) => {
    if (err) return res.status(500).send(err);
    if (!data.length) return res.status(404).json({ message: "Booking not found" });

    const eventId = data[0].event_id;
    db.query("DELETE FROM bookings WHERE id=?", [id], (err2) => {
      if (err2) return res.status(500).send(err2);
      db.query("UPDATE events SET seats = seats + 1 WHERE id=?", [eventId]);
      res.json({ message: "Booking cancelled" });
    });
  });
});

export default router;

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import router from "./routes.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use("/api", router);

app.listen(5000, () => console.log("🚀 Server running on port 5000"));

const API_URL = "http://localhost:5000/api";

// Fetch Events
async function loadEvents() {
  const res = await fetch(`${API_URL}/events`);
  const events = await res.json();
  const list = document.getElementById("event-list");
  list.innerHTML = "";
  events.forEach((e) => {
    const div = document.createElement("div");
    div.className = "event" + (e.seats <= 0 ? " full" : "");
    div.innerHTML = `
      <strong>ID:</strong> ${e.id}<br>
      <strong>${e.name}</strong><br>
      Date: ${e.date}<br>
      Seats Left: ${e.seats}
    `;
    list.appendChild(div);
  });
}

// Fetch Bookings
async function loadBookings() {
  const res = await fetch(`${API_URL}/bookings`);
  const bookings = await res.json();
  const list = document.getElementById("booking-list");
  list.innerHTML = "";
  bookings.forEach((b) => {
    const div = document.createElement("div");
    div.className = "booking-item";
    div.innerHTML = `
      ID: ${b.id} | ${b.user_name} (Event: ${b.event_id})
      <button onclick="cancelBooking(${b.id})">Cancel</button>
    `;
    list.appendChild(div);
  });
}

// Book Event
document.getElementById("bookingForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const user_name = document.getElementById("userName").value;
  const event_id = document.getElementById("eventId").value;

  const res = await fetch(`${API_URL}/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_name, event_id }),
  });

  const data = await res.json();
  alert(data.message);
  loadEvents();
  loadBookings();
});

// Cancel Booking
async function cancelBooking(id) {
  if (!confirm("Are you sure?")) return;
  await fetch(`${API_URL}/cancel/${id}`, { method: "DELETE" });
  loadEvents();
  loadBookings();
}

// Load initial data
loadEvents();
loadBookings();

// 🔍 Search events by keyword
router.get("/search/:keyword", (req, res) => {
  const keyword = `%${req.params.keyword}%`;
  db.query(
    "SELECT * FROM events WHERE name LIKE ? OR date LIKE ?",
    [keyword, keyword],
    (err, result) => {
      if (err) return res.status(500).send(err);
      res.json(result);
    }
  );
});

// ➕ Add new event
router.post("/addEvent", (req, res) => {
  const { name, date, seats } = req.body;
  db.query("INSERT INTO events (name, date, seats) VALUES (?, ?, ?)", [name, date, seats], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ message: "Event added successfully" });
  });
});

// ❌ Delete event
router.delete("/removeEvent/:id", (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM events WHERE id=?", [id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ message: "Event removed successfully" });
  });
});

// 🔍 Search Events
document.getElementById("searchBtn").addEventListener("click", async () => {
  const keyword = document.getElementById("searchInput").value.trim();
  if (!keyword) return alert("Enter a search term");

  const res = await fetch(`${API_URL}/search/${keyword}`);
  const data = await res.json();

  const results = document.getElementById("search-results");
  results.innerHTML = "";
  if (data.length === 0) {
    results.innerHTML = "<p>No matching events found.</p>";
    return;
  }

  data.forEach((e) => {
    const div = document.createElement("div");
    div.className = "event";
    div.innerHTML = `
      <strong>ID:</strong> ${e.id} <br>
      <strong>${e.name}</strong><br>
      Date: ${e.date}<br>
      Seats Left: ${e.seats}
    `;
    results.appendChild(div);
  });
});

// ➕ Add Event (Admin)
document.getElementById("addEventForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("eventName").value;
  const date = document.getElementById("eventDate").value;
  const seats = document.getElementById("eventSeats").value;

  const res = await fetch(`${API_URL}/addEvent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, date, seats }),
  });

  const data = await res.json();
  alert(data.message);
  document.getElementById("addEventForm").reset();
  loadEvents();
});

// ❌ Remove Event
async function removeEvent(id) {
  if (!confirm("Remove this event permanently?")) return;
  await fetch(`${API_URL}/removeEvent/${id}`, { method: "DELETE" });
  alert("Event removed successfully!");
  loadEvents();
}

// Modify loadEvents() to show a remove button
async function loadEvents() {
  const res = await fetch(`${API_URL}/events`);
  const events = await res.json();
  const list = document.getElementById("event-list");
  list.innerHTML = "";

  events.forEach((e) => {
    const div = document.createElement("div");
    div.className = "event" + (e.seats <= 0 ? " full" : "");
    div.innerHTML = `
      <strong>ID:</strong> ${e.id}<br>
      <strong>${e.name}</strong><br>
      Date: ${e.date}<br>
      Seats Left: ${e.seats}<br>
      <button class="remove-btn" onclick="removeEvent(${e.id})">Remove</button>
    `;
    list.appendChild(div);
  });
}

// 🎨 Message Display Utility
function showMessage(message, type = "info") {
  const msgBox = document.getElementById("messageBox");
  msgBox.textContent = message;
  msgBox.className = type; // sets color by type
  msgBox.style.display = "block";
  setTimeout(() => (msgBox.style.display = "none"), 2500);
}

// 🎯 Modified Search Events Function
document.getElementById("searchBtn").addEventListener("click", async () => {
  const keyword = document.getElementById("searchInput").value.trim();
  const results = document.getElementById("search-results");
  results.innerHTML = "";

  if (!keyword) {
    showMessage("Credentials not added", "error");
    return;
  }

  const res = await fetch(`${API_URL}/search/${keyword}`);
  const data = await res.json();

  if (data.length === 0) {
    showMessage("No matching events found", "warning");
    return;
  }

  data.forEach((e) => {
    const div = document.createElement("div");
    div.className = "event";
    div.innerHTML = `
      <strong>ID:</strong> ${e.id}<br>
      <strong>${e.name}</strong><br>
      Date: ${e.date}<br>
      Seats Left: ${e.seats}
    `;
    results.appendChild(div);
  });
});

// ✅ Modified Add Booking Function (show message)
async function bookEvent(id) {
  const res = await fetch(`${API_URL}/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_id: id, user: "User1" }),
  });

  const data = await res.json();
  if (data.message) showMessage("Added successfully", "success");
  else showMessage("Booking failed", "error");

  loadEvents();
}

async function loadEvents() {
  const res = await fetch(`${API_URL}/events`);
  const events = await res.json();
  const list = document.getElementById("event-list");
  list.innerHTML = "";

  events.forEach((e) => {
    const div = document.createElement("div");
    div.className = "event" + (e.seats <= 0 ? " full" : "");
    div.innerHTML = `
      <strong>ID:</strong> ${e.id}<br>
      <strong>${e.name}</strong><br>
      Date: ${e.date}<br>
      Seats Left: ${e.seats}<br>
      <button onclick="bookEvent(${e.id})">Book</button>
      <button class="remove-btn" onclick="removeEvent(${e.id})">Remove</button>
    `;
    list.appendChild(div);
  });
}

