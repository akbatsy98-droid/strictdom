import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tiwwjcfwqckzeevctya.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpd3dqY2Z3cWNremVldmNxdHlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMTkxMjEsImV4cCI6MjA4OTg5NTEyMX0.SiYbGg4i-OvlAhofHVi-smuU6fzQVQQMFN0y8rh-_d8'

export const supabase = createClient(supabaseUrl, supabaseKey)
