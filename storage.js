/* =========================================================
   NOVA AI — storage.js
   Thin wrapper around localStorage. Single source of truth
   for everything that needs to persist on this device.
========================================================= */

const NovaStorage = (() => {
  const KEYS = {
    USERS: 'nova_users',
    SESSION: 'nova_session',
    CONVOS: prefix => `nova_convos_${prefix}`,
    SETTINGS: prefix => `nova_settings_${prefix}`,
  };

  /** Safe JSON read with fallback. */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.error('NovaStorage: failed to read', key, err);
      return fallback;
    }
  }

  /** Safe JSON write. */
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('NovaStorage: failed to write', key, err);
      return false;
    }
  }

  // ---------------- Users ----------------
  function getUsers() {
    return read(KEYS.USERS, []);
  }
  function saveUsers(users) {
    write(KEYS.USERS, users);
  }
  function findUserByEmail(email) {
    return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  }
  function createUser(user) {
    const users = getUsers();
    users.push(user);
    saveUsers(users);
  }
  function updateUser(id, patch) {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...patch };
    saveUsers(users);
    return users[idx];
  }

  // ---------------- Session ----------------
  function getSession() {
    return read(KEYS.SESSION, null);
  }
  function setSession(userId) {
    write(KEYS.SESSION, { userId, since: Date.now() });
  }
  function clearSession() {
    localStorage.removeItem(KEYS.SESSION);
  }

  // ---------------- Conversations (namespaced per-user) ----------------
  function getConversations(userId) {
    return read(KEYS.CONVOS(userId), []);
  }
  function saveConversations(userId, convos) {
    write(KEYS.CONVOS(userId), convos);
  }

  // ---------------- Settings (namespaced per-user) ----------------
  function getSettings(userId) {
    return read(KEYS.SETTINGS(userId), {
      theme: 'dark',
      ttsAuto: false,
      voiceEnabled: true,
    });
  }
  function saveSettings(userId, settings) {
    write(KEYS.SETTINGS(userId), settings);
  }

  function uid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  return {
    getUsers, saveUsers, findUserByEmail, createUser, updateUser,
    getSession, setSession, clearSession,
    getConversations, saveConversations,
    getSettings, saveSettings,
    uid,
  };
})();
