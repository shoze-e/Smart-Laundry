// js/storage.js
import { getLocationById } from '../data/locations.js';

const PREFIX = "smart_laundry_";
const KEY_SELECTED_LGA = "smartLaundry_selectedLGA";
const KEY_LOCATION_MODE = "smartLaundry_locationDetectionMode";
const KEY_LEGACY_LOC = "default_location";

export const Storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(PREFIX + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.warn("localStorage read failed:", e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("localStorage write failed:", e);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
      return true;
    } catch (e) {
      return false;
    }
  },

  // Location Detection Mode: 'gps' | 'manual'
  getLocationDetectionMode() {
    try {
      const mode = localStorage.getItem(KEY_LOCATION_MODE) || this.get("location_mode", "manual");
      if (mode === "gps" || mode === "manual") return mode;
    } catch (e) {
      console.warn("Error reading location mode:", e);
    }
    return "manual";
  },

  setLocationDetectionMode(mode) {
    const validMode = mode === "gps" ? "gps" : "manual";
    try {
      localStorage.setItem(KEY_LOCATION_MODE, validMode);
      this.set("location_mode", validMode);
      return true;
    } catch (e) {
      console.warn("Error saving location mode:", e);
      return false;
    }
  },

  // Active LGA management (Single source of truth)
  getActiveLocationId() {
    try {
      const saved = localStorage.getItem(KEY_SELECTED_LGA) || this.get(KEY_LEGACY_LOC, null);
      if (saved) {
        // Handle if stored as JSON string or plain string
        const cleaned = saved.replace(/^"|"$/g, '').trim();
        if (cleaned) return cleaned;
      }
    } catch (e) {
      console.warn("Error reading active LGA:", e);
    }
    return "ikeja"; // Default to Ikeja
  },

  setActiveLocationId(lgaId, mode = null) {
    if (!lgaId || typeof lgaId !== 'string') return;
    const cleanId = lgaId.toLowerCase().trim();
    try {
      localStorage.setItem(KEY_SELECTED_LGA, cleanId);
      this.set(KEY_LEGACY_LOC, cleanId);
      if (mode) {
        this.setLocationDetectionMode(mode);
      }
      return true;
    } catch (e) {
      console.warn("Error saving active LGA:", e);
      return false;
    }
  },

  getActiveLocation() {
    const id = this.getActiveLocationId();
    return getLocationById(id);
  },

  getHistory() {
    return this.get("history", []);
  },

  saveHistoryItem(plan) {
    const history = this.getHistory();
    // Prepend new item
    history.unshift({
      ...plan,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    });
    // Keep last 50
    this.set("history", history.slice(0, 50));
  },

  clearHistory() {
    this.remove("history");
  }
};
