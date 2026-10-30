import {fetchLeague} from '../lib/league-import';import{db}from'../lib/supabase';
const league=await fetchLeague();const client=db();if(!client)throw Error('Configura Supabase');const{error}=await client.rpc('import_league',{p_data:league,p_secret:process.env.CRON_SECRET});if(error)throw error;console.log(`Sincronizados ${league.matches.length} registros, ${league.standings.length} equipos.`);
