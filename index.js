
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = process.env.DB_USER;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Database and Collections
const database = client.db("urban-connect-refine-server");

const eventsCollection = database.collection("events");
const joinedEventsCollection = database.collection("joinedEvents");

// MongoDB Connect
async function run() {
  try {
    await client.connect();

    await client.db("admin").command({ ping: 1 });

    console.log("MongoDB Connected Successfully!");
  } catch (error) {
    console.log("MongoDB Connection Failed:", error);
  }
}

run();

// Home Route
app.get("/", (req, res) => {
  res.send("Urban Connect Server is Running!");
});

// Get Upcoming Events
app.get("/events", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const limit = parseInt(req.query.limit);

    let eventsQuery = eventsCollection
      .find({
        eventDate: {
          $gte: today,
        },
      })
      .sort({ eventDate: 1 });

    if (limit > 0) {
      eventsQuery = eventsQuery.limit(limit);
    }

    const events = await eventsQuery.toArray();

    res.send(events);
  } catch (error) {
    res.status(500).send({ message: "Failed to get events" });
  }
});

// Add New Event
app.post("/events", async (req, res) => {
  try {
    const newEvent = req.body;

    const result = await eventsCollection.insertOne(newEvent);

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to add event" });
  }
});

// Get Single Event
app.get("/events/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const event = await eventsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!event) {
      return res.status(404).send({ message: "Event not found" });
    }

    res.send(event);
  } catch (error) {
    res.status(400).send({ message: "Invalid event ID" });
  }
});

// Update Event
app.patch("/events/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updatedEvent = req.body;

    const result = await eventsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: updatedEvent,
      }
    );

    res.send(result);
  } catch (error) {
    res.status(400).send({ message: "Failed to update event" });
  }
});

// Delete Event
app.delete("/events/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const result = await eventsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send(result);
  } catch (error) {
    res.status(400).send({ message: "Failed to delete event" });
  }
});

// Join Event
app.post("/join-event", async (req, res) => {
  try {
    const joinData = req.body;

    const existingJoin = await joinedEventsCollection.findOne({
      eventId: joinData.eventId,
      userEmail: joinData.userEmail,
    });

    if (existingJoin) {
      return res.status(400).send({
        message: "You already joined this event",
      });
    }

    const result = await joinedEventsCollection.insertOne({
      eventId: joinData.eventId,
      eventTitle: joinData.eventTitle,
      userEmail: joinData.userEmail,
      joinedAt: new Date(),
    });

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to join event" });
  }
});

// Get Joined Events
app.get("/joined-events", async (req, res) => {
  try {
    const email = req.query.email;

    const joinedEvents = await joinedEventsCollection
      .find({ userEmail: email })
      .sort({ joinedAt: -1 })
      .toArray();

    res.send(joinedEvents);
  } catch (error) {
    res.status(500).send({ message: "Failed to get joined events" });
  }
});

// Server
const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
