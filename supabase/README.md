# Boardie Supabase Setup

This guide will help you set up Supabase for the Boardie application.

## Step 1: Create a Supabase Project

1. Go to [Supabase](https://app.supabase.io) and sign in to your account
2. Click "New Project"
3. Enter "Boardie" as the project name
4. Choose a secure database password (save this somewhere safe)
5. Select the region closest to your users
6. Click "Create New Project"

## Step 2: Set Up Database Schema

1. In your Supabase project dashboard, go to the "SQL Editor" section
2. Click "New Query"
3. Copy and paste the contents of the `schema.sql` file from this directory
4. Run the SQL query to create all necessary tables and security policies

## Step 3: Configure Authentication

1. In your Supabase project dashboard, go to "Authentication" > "Settings"
2. Under "Email Auth", make sure it's enabled
3. Configure any additional auth providers you want to support (Google, GitHub, etc.)
4. Set up your site URL in the "URL Configuration" section
   - Site URL: Your production URL (e.g., `https://yourdomain.com`)
   - Redirect URLs: Add your local development URL (e.g., `http://localhost:3000`)

## Step 4: Get Your API Keys

1. In your Supabase project dashboard, go to "Settings" (gear icon) > "API"
2. Copy your "Project URL" and "anon" (public) key
3. Open `src/js/auth/supabaseClient.js` in your project
4. Replace the placeholder values with your actual Supabase URL and anon key:

```javascript
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
```

## Step 5: Initialize Auth in Your App

Add the following code to your main JavaScript file (e.g., `index.js` or `app.js`):

```javascript
import { initAuth } from './js/auth/index.js';

// Initialize authentication when the app starts
document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  
  // Your existing initialization code...
});
```

## Row Level Security (RLS)

The schema includes Row Level Security policies to ensure users can only access their own data. These policies are automatically set up when you run the schema SQL.

## Database Tables

The schema creates the following tables:

1. **profiles** - User profiles that extend Supabase auth.users
2. **posts** - Stores all saved social media embeds
3. **tags** - Tag definitions
4. **post_tags** - Junction table for the many-to-many relationship between posts and tags

## Automatic Profile Creation

The schema includes a trigger that automatically creates a profile for new users when they sign up, so you don't need to manually create profiles.

## Indexes

The schema creates indexes on frequently queried columns to improve performance.

## Troubleshooting

If you encounter any issues:

1. Check the browser console for error messages
2. Verify your API keys are correct
3. Make sure all tables were created successfully in the Supabase dashboard
4. Check that RLS policies are properly configured

For more information, refer to the [Supabase documentation](https://supabase.io/docs).
