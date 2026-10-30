import Link from 'next/link';
import {db} from '@/lib/supabase';
import type {Player} from '@/lib/types';
import type {MvpResult} from '@/lib/team';
export async function MvpSummary({playerId,matchKey,players=[]}:{playerId?:string;matchKey?:string;players?:Player[]}){
 const client=db();if(!client)return null;
 const {data,error}=await client.rpc('mvp_results');if(error)return null;
 const rows=(data??[]) as unknown as MvpResult[];
 if(playerId){const own=rows.filter(r=>r.player_id===playerId);return <p className="notice"><b>{own.filter(r=>r.winner).length} MVP</b> · {own.reduce((s,r)=>s+r.votes,0)} votos recibidos · <Link href="/mvp">Ver ranking →</Link></p>}
 const winners=rows.filter(r=>r.match_key===matchKey&&r.winner);if(!winners.length)return null;
 return <p className="report-note"><b>{winners.length>1?'MVP compartido':'MVP del partido'}:</b> {winners.map(r=>{const p=players.find(p=>p.id===r.player_id);return '#'+p?.number+' '+p?.name}).join(' y ')} · <Link href="/mvp">Ver votos y ranking →</Link></p>;
}
