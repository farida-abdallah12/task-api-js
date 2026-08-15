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

module.exports = { signup, login };