import React, { useMemo, useState, useEffect } from "react";
import {
  Send,
  Home,
  Bookmark,
  Check,
  RefreshCw,
  Heart,
  Trash2,
} from "lucide-react";
import "./App.css";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

function App() {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I am Mira, your AI real estate assistant. What city are you looking to buy a home in? (e.g., New York, Miami, Austin)",
    },
  ]);
  const [input, setInput] = useState("");
 const [collectedInfo, setCollectedInfo] = useState({
   location: "",
   budget: "",
   bedrooms: "",
   bathrooms: "", 
   size_sqft: "", 
   amenity: "",
 });
  const [activeTab, setActiveTab] = useState("search");

 
  const [properties, setProperties] = useState([]);
  const [savedProperties, setSavedProperties] = useState([]);
  const [savedIds, setSavedIds] = useState([]);

  const fetchSavedPreferences = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/saved-properties`);
      const data = await response.json();

      console.log("React received this from server:", data);

      if (Array.isArray(data)) {
        setSavedProperties(data);
        setSavedIds(data.map((p) => p.id));
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "saved") {
      fetchSavedPreferences();
    }
  }, [activeTab]);

  const querySummary = useMemo(() => {
    const parts = [];
    if (collectedInfo.location) parts.push(collectedInfo.location);
    if (collectedInfo.budget) parts.push(`Up to $${collectedInfo.budget}`);
    if (collectedInfo.bedrooms) parts.push(`${collectedInfo.bedrooms} bed`);
    return parts.join(" • ");
  }, [collectedInfo]);

  const fetchProperties = async (finalFilters) => {
    try {
      const queryParams = new URLSearchParams({
        location: finalFilters.location || "",
        maxPrice: finalFilters.maxPrice || "",
        bedrooms: finalFilters.bedrooms || "",
        amenity: finalFilters.amenity || "",
      }).toString();

      const response = await fetch(
        `${BACKEND_URL}/api/properties?${queryParams}`,
      );
      const data = await response.json();
      setProperties(Array.isArray(data) ? data : []);

      if (!data || data.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: "I couldn't find any homes matching those exact preferences. Try looking for properties with broader options!",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: `Great news! I found ${data.length} matches for you.`,
          },
        ]);
      }
    } catch (error) {
      console.error("Error fetching properties:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, I had trouble connecting to my server. Please ensure the backend is running!",
        },
      ]);
    }
  };

  const handleRefresh = async () => {
    setProperties([]);
    setCollectedInfo({ location: "", budget: "", bedrooms: "" }); // Reset tracker
    setMessages([
      { sender: "bot", text: "Hello! What city are you looking in?" },
    ]);
    setActiveTab("search");
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setInput("");

    if (!collectedInfo.location) {
      setCollectedInfo((prev) => ({ ...prev, location: userText }));
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Got it! What is your maximum budget?" },
      ]);
    } else if (!collectedInfo.budget) {
      setCollectedInfo((prev) => ({ ...prev, budget: userText }));
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Perfect. How many bedrooms?" },
      ]);
    } else if (!collectedInfo.bedrooms) {
      setCollectedInfo((prev) => ({ ...prev, bedrooms: userText }));
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "How many bathrooms do you need?" },
      ]);
    } else if (!collectedInfo.bathrooms) {
      setCollectedInfo((prev) => ({ ...prev, bathrooms: userText }));
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "What minimum square footage are you looking for?",
        },
      ]);
    } else if (!collectedInfo.size_sqft) {
      setCollectedInfo((prev) => ({ ...prev, size_sqft: userText }));
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Any specific amenities? (e.g., Pool, Gym)" },
      ]);
    } else if (!collectedInfo.amenity) {
      const finalAmenity = userText;
      setCollectedInfo((prev) => ({ ...prev, amenity: finalAmenity }));
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Searching for your perfect home..." },
      ]);
      fetchProperties({
        location: collectedInfo.location,
        maxPrice: collectedInfo.budget,
        bedrooms: collectedInfo.bedrooms,
        amenity: finalAmenity,
      });
    }
  };

  const saveProperty = async (id) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/save-property`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ propertyId: id }),
      });

      if (response.ok) {
        setSavedIds((prev) => [...prev, id]);

        fetchSavedPreferences();

        console.log(`Successfully saved property ${id} to database!`);
      } else {
        console.error("Server refused to save the property.");
      }
    } catch (error) {
      console.error("Error saving property:", error);
    }
  };

  const removeProperty = async (id) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/remove-property/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setSavedIds((prev) => prev.filter((savedId) => savedId !== id));
        setSavedProperties((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error("Error removing property:", error);
    }
  };

  return (
    <div className="app-container">
      <header className="navbar">
        <h2>Agent Mira: Real Estate Chatbot</h2>
        <div className="nav-tabs">
          <button
            className={`tab-btn ${activeTab === "search" ? "active" : ""}`}
            onClick={() => setActiveTab("search")}
          >
            <Home size={15} /> Find Homes
          </button>
          <button
            className={`tab-btn ${activeTab === "saved" ? "active" : ""}`}
            onClick={() => setActiveTab("saved")}
          >
            <Heart size={15} /> Saved Properties ({savedProperties.length})
          </button>
        </div>
      </header>

      <div className="main-content">
        <div className="chat-window">
  <div className="messages-log">
    {messages.map((msg, index) => (
      <div key={index} className={`message-row ${msg.sender}`}>
        <div className="message-bubble">{msg.text}</div>
      </div>
    ))}
  </div>

  <form onSubmit={handleSend} className="input-form">
    <input
      type="text"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      placeholder="Type your response here..."
    />
    <button type="submit">
      <Send size={18} />
    </button>
  </form>
</div>

        <div className="results-window">
          {activeTab === "search" ? (
            <>
              <div className="results-header">
                <h3>Matching Properties</h3>
                <div className="results-subtitle">
                  <span className="pill">
                    {querySummary || "Complete the chat choices"}
                  </span>
                  <button
                    className="refresh-btn"
                    onClick={handleRefresh}
                    type="button"
                    aria-label="Refresh"
                  >
                    <RefreshCw size={16} /> Refresh
                  </button>
                </div>
              </div>
              {properties.length === 0 ? (
                <div className="empty-state">
                  <Home size={48} />
                  <p>
                    Complete the chat choices on the left to display real estate
                    choices.
                  </p>
                </div>
              ) : (
                <div className="properties-grid">
                  {properties.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="property-card">
                      <div className="property-image">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.title || "Property"}
                            loading="lazy"
                          />
                        ) : (
                          <div className="image-placeholder">No Image</div>
                        )}
                      </div>
                      <div className="card-details">
                        <h4>{item.title || "Real Estate Property"}</h4>
                        <p className="price">
                          ${item.price ? item.price.toLocaleString() : "N/A"}
                        </p>
                        <p className="location">
                          {item.location || "Location missing"}
                        </p>
                        <p className="specs">
                          {item.bedrooms || 0} Bed | {item.bathrooms || 0} Bath
                          | {item.size_sqft || 0} SqFt
                        </p>
                        <div className="amenities">
                          {item.amenities &&
                            item.amenities.map((am, i) => (
                              <span key={i} className="tag">
                                {am}
                              </span>
                            ))}
                        </div>
                        <button
                          className={`save-btn ${savedIds.includes(item.id) ? "saved" : ""}`}
                          onClick={() => saveProperty(item.id)}
                          disabled={savedIds.includes(item.id)}
                        >
                          {savedIds.includes(item.id) ? (
                            <Check size={16} />
                          ) : (
                            <Bookmark size={16} />
                          )}
                          {savedIds.includes(item.id)
                            ? "Saved"
                            : "Save Property"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="results-header">
                <h3>My Saved Preferences</h3>
                <p
                  style={{
                    color: "var(--muted)",
                    fontSize: "13px",
                    margin: "4px 0 0",
                  }}
                >
                  Items stored safely inside your persistent portfolio choice
                  database.
                </p>
              </div>
              {savedProperties.length === 0 ? (
                <div className="empty-state">
                  <Heart
                    size={48}
                    style={{ color: "var(--danger)", opacity: 0.7 }}
                  />
                  <p>
                    Your preference ledger is empty. Save a home to display it
                    here!
                  </p>
                </div>
              ) : (
                <div className="properties-grid">
                  {savedProperties.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="property-card">
                      <div className="property-image">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.title || "Property"}
                            loading="lazy"
                          />
                        ) : (
                          <div className="image-placeholder">No Image</div>
                        )}
                      </div>
                      <div className="card-details">
                        <h4>{item.title || "Real Estate Property"}</h4>
                        <p className="price">
                          ${item.price ? item.price.toLocaleString() : "N/A"}
                        </p>
                        <p className="location">
                          {item.location || "Location missing"}
                        </p>
                        <p className="specs">
                          {item.bedrooms || 0} Bed | {item.bathrooms || 0} Bath
                          | {item.size_sqft || 0} SqFt
                        </p>
                        <button
                          className="save-btn remove-btn"
                          onClick={() => removeProperty(item.id)}
                        >
                          <Trash2 size={16} /> Remove from Ledger
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
