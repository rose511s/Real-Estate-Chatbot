const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

require("dotenv").config();
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;
let isUsingMongoDB = false;

const SavedPropertySchema = new mongoose.Schema({
  propertyId: Number,
  savedAt: { type: Date, default: Date.now },
});
const SavedProperty = mongoose.model("SavedProperty", SavedPropertySchema);

const MONGO_URI =
  "mongodb+srv://admin:12345@cluster0.4hzorgo.mongodb.net/?appName=Cluster0";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(" Persistent MongoDB Cluster Connected Successfully!");
    isUsingMongoDB = true;
  })
  .catch((err) => {
    console.log(
      " Cloud MongoDB connection blocked by network security. Activating Automated File Ledger System Fallback...",
    );
    isUsingMongoDB = false;
  });

const getLocalSavedProperties = () => {
  const filePath = path.join(__dirname, "data", "saved_properties.json");
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]));
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    return [];
  }
};

const getMergedData = () => {
  try {
    const basics = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "data", "property_basics.json"),
        "utf8",
      ),
    );
    const specs = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "data", "property_characteristics.json"),
        "utf8",
      ),
    );
    const images = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "data", "property_images.json"),
        "utf8",
      ),
    );

    return basics.map((item) => {
      const specMatch = specs.find((s) => s.id === item.id) || {};
      const imgMatch = images.find((i) => i.id === item.id) || {};
      return { ...item, ...specMatch, ...imgMatch };
    });
  } catch (error) {
    console.error("Error reading or merging data files:", error);
    return [];
  }
};

app.get("/api/properties", (req, res) => {
  let properties = getMergedData();
  const { location, maxPrice, bedrooms } = req.query;

  if (location) {
    properties = properties.filter((p) =>
      p.location.toLowerCase().includes(location.toLowerCase()),
    );
  }
  if (maxPrice) {
    properties = properties.filter((p) => p.price <= parseInt(maxPrice));
  }
  if (bedrooms) {
    properties = properties.filter((p) => p.bedrooms === parseInt(bedrooms));
  }

  res.json(properties);
});

app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    const propertiesData = require("./data/properties.json");

    const systemPrompt = `
      You are Mira, a top-tier, highly intelligent real estate advisor. 
      You are not a robot; you are a warm, consultative, and strategic human-like agent.
      
      Here is your live property database: ${JSON.stringify(propertiesData)}

      CRITICAL RULE: You MUST respond in pure JSON format exactly like this:
      {
        "reply": "Your intelligent, conversational response",
        "propertyIds": [Array of integer IDs]
      }
      
      INTELLIGENCE RULES:
      1. THE SALES PITCH: Don't just hand them properties. Explain *why* you chose them. (e.g., "Since you wanted a large family home, I picked this one because of its massive 3,000 sq ft layout...")
      2. THE NEGOTIATOR: If the user asks for an impossible combination (like a $200k mansion), DO NOT just say "no properties found." Instead, act like a real estate agent: gently explain the market reality, and offer the closest possible compromise (e.g., "While a mansion at $200k is tough, I found a gorgeous luxury condo in that budget...").
      3. ONLY recommend property IDs that actually exist in the database.
      4. Keep your response under 3 sentences. Be concise, punchy, and confident.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
    });

    const aiData = JSON.parse(response.choices[0].message.content);

    const matchedProperties = propertiesData.filter((property) =>
      aiData.propertyIds.includes(property.id),
    );

    res.json({
      reply: aiData.reply,
      properties: matchedProperties,
    });
  } catch (error) {
    console.error("OpenAI Error:", error);
    res.status(500).json({
      reply: "I'm having trouble connecting to my AI brain right now.",
      properties: [],
    });
  }
});

app.get("/api/saved-properties", async (req, res) => {
  try {
    let savedList = [];

    if (isUsingMongoDB) {
      savedList = await SavedProperty.find({});
    } else {
      savedList = getLocalSavedProperties();
    }

    const allProperties = getMergedData();
    const detailedSavedProperties = savedList
      .map((savedItem) => {
        return allProperties.find(
          (p) => String(p.id) === String(savedItem.propertyId),
        );
      })
      .filter(Boolean);

    res.json(detailedSavedProperties);
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch user preferences" });
  }
});

app.delete("/api/remove-property/:id", async (req, res) => {
  try {
    const pid = parseInt(req.params.id, 10);

    if (isUsingMongoDB) {
      await SavedProperty.deleteOne({ propertyId: pid });
    } else {
      let localSaved = getLocalSavedProperties();
      localSaved = localSaved.filter((item) => item.propertyId !== pid);
      fs.writeFileSync(
        path.join(__dirname, "data", "saved_properties.json"),
        JSON.stringify(localSaved, null, 2),
      );
    }

    console.log(` Removed Preference Registered: Property ID -> ${pid}`);
    res
      .status(200)
      .json({ message: "Property removed from ledger successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove property" });
  }
});

app.listen(PORT, () =>
  console.log(` Server is running perfectly on port ${PORT}`),
);
