import {cache} from 'react';
import {db} from './supabase';
import {INITIAL_PLAYERS,type Player,type Report,type League} from './types';
import initial from './initial-league.json';
export const getData=cache(async()=>{const client=db();if(!client)return {players:INITIAL_PLAYERS,reports:[] as Report[],leagues:[initial as League],connected:false,error:false};
 const [p,r,l]=await Promise.all([client.from('players').select('*').order('number'),client.from('published_reports').select('*'),client.from('league_snapshots').select('data').order('updated_at',{ascending:false})]);
 return {players:p.data?.length?p.data as Player[]:INITIAL_PLAYERS,reports:(r.data??[]) as Report[],leagues:l.data?.length?l.data.map(x=>x.data as League):[initial as League],connected:true,error:!!(p.error||r.error||l.error)};});
