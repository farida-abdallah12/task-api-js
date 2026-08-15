const supabase = require('../config/supabaseClient');
const { ValidationError, UnauthorizedError } = require('../errors');

async function signup(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    throw new ValidationError(error.message);
  }

  return data.user;
}

async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new UnauthorizedError('Invalid login credentials');
  }

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  };
}

async function getProfile(token) {
  const { data, error } = await supabase.auth.getUser(token);

  if (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  const user = data.user;
  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
  };
}

async function logout(token) {
  const { error } = await supabase.auth.signOut(token);

  if (error) {
    throw new UnauthorizedError('Failed to sign out');
  }
}

module.exports = { signup, login, getProfile, logout };