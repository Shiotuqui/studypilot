// Supabase connection settings.
// The publishable (anon) key is safe to ship in a website: Row Level Security
// in schema.sql makes sure each user can only reach their own data.
// NEVER put the secret / service_role key here.
window.STUDYPILOT_CONFIG = {
  SUPABASE_URL: "YOUR_SUPABASE_URL",
  SUPABASE_KEY: "YOUR_SUPABASE_PUBLISHABLE_KEY",
};
