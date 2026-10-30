import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_TEAM_PHOTO,teamPhotoSource,type TeamPhoto} from '../lib/team-photo';
test('team photo only resolves trusted storage paths and falls back to the bundled portrait',()=>{
 const base={image_path:null,caption:'Equipo',alt:'Foto',width:1536,height:1024,updated_at:'2026-10-30'} satisfies TeamPhoto;
 assert.equal(teamPhotoSource(null,'https://example.supabase.co'),DEFAULT_TEAM_PHOTO.src);
 assert.equal(teamPhotoSource({...base,image_path:'https://evil.test/image.webp'},'https://example.supabase.co'),DEFAULT_TEAM_PHOTO.src);
 assert.equal(teamPhotoSource({...base,image_path:'official/../other.webp'},'https://example.supabase.co'),DEFAULT_TEAM_PHOTO.src);
 assert.equal(teamPhotoSource({...base,image_path:'official/abc-123.webp'},'https://example.supabase.co/'),'https://example.supabase.co/storage/v1/object/public/team-photos/official/abc-123.webp');
});
