import { api } from '../lib/api';

export async function uploadVideo(file: File, onUploadProgress?: (p: number) => void): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);

  const { data } = await api.post<{ url: string }>('/uploads/video', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onUploadProgress && evt.total) {
        onUploadProgress(Math.round((evt.loaded * 100) / evt.total));
      }
    },
  });

  return data; 
}
