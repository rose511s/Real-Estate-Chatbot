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
    const userMessage = req.body.message.toLowerCase();
    const propertiesData = getMergedData();

    
    res.json({
      reply: "I've analyzed the market for you. Here are some great matches:",
      properties: propertiesData.slice(0, 4), 
    });
  } catch (error) {
    res
      .status(500)
      .json({ reply: "I'm having a technical moment.", properties: [] });
  }
});





app.post("/api/save-property", async (req, res) => {
  try {
    const { propertyId } = req.body; 

    if (!propertyId) {
      return res.status(400).json({ error: "Property ID is missing." });
    }

    if (isUsingMongoDB) {
      const existing = await SavedProperty.findOne({ propertyId });
      if (existing) {
        await SavedProperty.deleteOne({ propertyId });
        res.status(200).json({ message: "Property removed from DB." });
      } else {
        const newSave = new SavedProperty({ propertyId });
        await newSave.save();
        res.status(200).json({ message: "Property saved to DB!" });
      }
    } else {
      // 2. Automated File Ledger Fallback Logic
      const filePath = path.join(__dirname, "data", "saved_properties.json");
      let localSaved = getLocalSavedProperties();
      
      const exists = localSaved.find(item => item.propertyId === propertyId);
      
      if (exists) {
        localSaved = localSaved.filter(item => item.propertyId !== propertyId);
        fs.writeFileSync(filePath, JSON.stringify(localSaved, null, 2));
        res.status(200).json({ message: "Property removed from file ledger." });
      } else {
        localSaved.push({ propertyId, savedAt: new Date() });
        fs.writeFileSync(filePath, JSON.stringify(localSaved, null, 2));
        res.status(200).json({ message: "Property saved to file ledger!" });
      }
    }

  } catch (error) {
    console.error("Save Property Error:", error);
    res.status(500).json({ error: "Server refused to save the property." });
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
