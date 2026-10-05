import { supabase } from '../lib/supabase';

const FOTOS_BUCKET = 'hostales-fotos';

export const hostalesService = {
  getById: (id) => supabase.from('hostales').select('*').eq('id', id).single(),

  update: (id, updates) => supabase.from('hostales').update(updates).eq('id', id).select(),

  // Fotos de la página web pública (migración 025): el hostalero solo puede
  // escribir dentro de la carpeta de su hostal (<hostal_id>/<archivo>).
  uploadFoto: async (hostalId, file) => {
    const path = `${hostalId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from(FOTOS_BUCKET).upload(path, file);
    if (error) return { publicUrl: null, error };
    const { data } = supabase.storage.from(FOTOS_BUCKET).getPublicUrl(path);
    return { publicUrl: data.publicUrl, error: null };
  },

  deleteFoto: (publicUrl) => {
    const marker = `/object/public/${FOTOS_BUCKET}/`;
    const path = publicUrl.includes(marker) ? publicUrl.split(marker)[1] : null;
    if (!path) return Promise.resolve({ error: null });
    return supabase.storage.from(FOTOS_BUCKET).remove([path]);
  },
};
