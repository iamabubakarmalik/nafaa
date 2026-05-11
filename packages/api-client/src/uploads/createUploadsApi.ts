import type { AxiosInstance, AxiosProgressEvent } from 'axios';
import type { UploadOptions, UploadRecord } from './types';

export interface UploadFileInput {
  uri?: string;       // RN: file://...
  file?: File | Blob; // Web: File from input
  name: string;
  type: string;
}

const unwrap = <T>(res: { data: { data: T } | T }): T => {
  const body: any = res.data;
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
};

export function createUploadsApi(client: AxiosInstance) {
  const single = async (
    input: UploadFileInput,
    opts: UploadOptions = {},
  ): Promise<UploadRecord> => {
    const form = new FormData();

    if (input.file) {
      form.append('file', input.file as any, input.name);
    } else if (input.uri) {
      form.append('file', {
        uri: input.uri,
        name: input.name,
        type: input.type,
      } as any);
    } else {
      throw new Error('Either `file` or `uri` is required');
    }

    if (opts.purpose) form.append('purpose', opts.purpose);

    const res = await client.post('/uploads', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal: opts.signal,
      onUploadProgress: (e: AxiosProgressEvent) => {
        if (opts.onProgress && e.total) {
          opts.onProgress({
            loaded: e.loaded,
            total: e.total,
            percent: Math.round((e.loaded / e.total) * 100),
          });
        }
      },
    });

    return unwrap<UploadRecord>(res);
  };

  const multiple = async (
    inputs: UploadFileInput[],
    opts: UploadOptions = {},
  ): Promise<UploadRecord[]> => {
    const form = new FormData();

    inputs.forEach((input) => {
      if (input.file) {
        form.append('files', input.file as any, input.name);
      } else if (input.uri) {
        form.append('files', {
          uri: input.uri,
          name: input.name,
          type: input.type,
        } as any);
      }
    });

    if (opts.purpose) form.append('purpose', opts.purpose);

    const res = await client.post('/uploads/multiple', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal: opts.signal,
      onUploadProgress: (e: AxiosProgressEvent) => {
        if (opts.onProgress && e.total) {
          opts.onProgress({
            loaded: e.loaded,
            total: e.total,
            percent: Math.round((e.loaded / e.total) * 100),
          });
        }
      },
    });

    const body: any = res.data;
    const data = body && 'data' in body ? body.data : body;
    return data?.items ?? data ?? [];
  };

  const listMine = async (purpose?: string): Promise<UploadRecord[]> => {
    const res = await client.get('/uploads/mine', {
      params: purpose ? { purpose } : undefined,
    });
    return unwrap<UploadRecord[]>(res);
  };

  const findOne = async (id: string): Promise<UploadRecord> => {
    const res = await client.get(`/uploads/${id}`);
    return unwrap<UploadRecord>(res);
  };

  return { single, multiple, listMine, findOne };
}

export type UploadsApi = ReturnType<typeof createUploadsApi>;
