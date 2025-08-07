# Supabase Setup Guide

## Environment Variables

Your `.env` file should contain:

```bash
# For Node.js (server-side)
SUPABASE_URL=https://ooumwohtgskpubglmaxz.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# For Vite (browser-side)
VITE_SUPABASE_URL=https://ooumwohtgskpubglmaxz.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Usage

### Import the client:
```typescript
import { supabase } from './supabase_client'
```

### Basic operations:
```typescript
// Insert data
const { data, error } = await supabase
  .from('your_table')
  .insert([{ column: 'value' }])

// Select data
const { data, error } = await supabase
  .from('your_table')
  .select('*')

// Update data
const { data, error } = await supabase
  .from('your_table')
  .update({ column: 'new_value' })
  .eq('id', 1)

// Delete data
const { error } = await supabase
  .from('your_table')
  .delete()
  .eq('id', 1)
```

## Running Your Project

### For Browser Usage (with Vite):
1. Make sure your `.env` variables are prefixed with `VITE_`
2. Run your development server
3. The environment variables will be available at build time

### For Node.js Usage:
1. Install dotenv: `npm install dotenv`
2. Load environment variables at the start of your app:
   ```typescript
   import 'dotenv/config'
   ```
3. Use the regular `SUPABASE_*` variables

## Security Notes

- Never commit your `.env` file to version control
- The anon key is safe to use in browser environments
- For server-side operations that require elevated permissions, you'll need a service role key (keep that server-side only)
