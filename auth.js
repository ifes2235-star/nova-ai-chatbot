/* =========================================================
   NOVA AI — auth.js
   Demo-grade client-side authentication.

   NOTE FOR PRODUCTION: this stores users in localStorage and
   hashes passwords with a simple non-cryptographic digest, which
   is fine for a portfolio / front-end demo but is NOT secure
   enough for a real product. In production, replace this module
   with calls to a real backend (see /server) that hashes
   passwords with bcrypt/argon2 and issues signed session tokens.
========================================================= */

const NovaAuth = (() => {

  /** Small non-cryptographic string hash — demo purposes only. */
  function demoHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return `h${Math.abs(hash)}_${str.length}`;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function signup({ name, email, password }) {
    if (!name || name.trim().length < 2) return { ok: false, error: 'Please enter your full name.' };
    if (!isValidEmail(email)) return { ok: false, error: 'Please enter a valid email address.' };
    if (!password || password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
    if (NovaStorage.findUserByEmail(email)) return { ok: false, error: 'An account with this email already exists.' };

    const user = {
      id: NovaStorage.uid('user'),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: demoHash(password),
      createdAt: Date.now(),
    };
    NovaStorage.createUser(user);
    NovaStorage.setSession(user.id);
    return { ok: true, user };
  }

  function login({ email, password }) {
    if (!isValidEmail(email)) return { ok: false, error: 'Please enter a valid email address.' };
    const user = NovaStorage.findUserByEmail(email);
    if (!user || user.passwordHash !== demoHash(password)) {
      return { ok: false, error: 'Incorrect email or password.' };
    }
    NovaStorage.setSession(user.id);
    return { ok: true, user };
  }

  function loginAsGuest() {
    const guestId = 'guest';
    let user = NovaStorage.getUsers().find(u => u.id === guestId);
    if (!user) {
      user = { id: guestId, name: 'Guest', email: 'guest@nova.ai', passwordHash: null, createdAt: Date.now() };
      NovaStorage.createUser(user);
    }
    NovaStorage.setSession(guestId);
    return { ok: true, user };
  }

  function logout() {
    NovaStorage.clearSession();
  }

  function currentUser() {
    const session = NovaStorage.getSession();
    if (!session) return null;
    return NovaStorage.getUsers().find(u => u.id === session.userId) || null;
  }

  return { signup, login, loginAsGuest, logout, currentUser, isValidEmail };
})();
