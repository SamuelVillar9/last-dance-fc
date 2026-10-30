import {createClient} from '@supabase/supabase-js';
import type {Database} from './database.types';
export function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)return null;return createClient<Database>(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
