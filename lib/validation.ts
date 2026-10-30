import {z} from 'zod';
export const entrySchema=z.object({playerId:z.string().min(1),goals:z.number().int().min(0).max(100),assists:z.number().int().min(0).max(100),yellow:z.number().int().min(0).max(2),red:z.number().int().min(0).max(1)});
export const reportSchema=z.object({match_key:z.string().min(1),entries:z.array(entrySchema).max(30),note:z.string().max(1000)}).refine(r=>new Set(r.entries.map(e=>e.playerId)).size===r.entries.length,'Jugador duplicado');
