import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tiwwjcfwqckzeevctya.supabase.co'
const supabaseKey = 'sb_publishable_qRhtXHJdu3TafGr37npumQ_UHEBbA6f'

export const supabase = createClient(supabaseUrl, supabaseKey)
