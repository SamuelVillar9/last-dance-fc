import {getData} from '@/lib/data';
import {Title} from '@/components/ui';
import {TeamPortal} from '@/components/team-portal';
export const dynamic='force-dynamic';
export const metadata={title:'Vestuario | LAST DANCE FC',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{partido?:string}>}){
 const data=await getData();const query=await searchParams;
 return <><Title eyebrow="SOLO PARA EL EQUIPO" title="EL" accent="VESTUARIO."/><TeamPortal players={data.players} leagues={data.leagues} reports={data.reports} initialMatch={query.partido}/></>;
}
