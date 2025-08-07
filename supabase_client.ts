
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://ooumwohtgskpubglmaxz.supabase.co',
  process.env.SUPABASE_ANON_KEY!
)

export default supabase