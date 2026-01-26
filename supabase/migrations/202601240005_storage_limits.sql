update storage.buckets
set
  file_size_limit = 104857600, -- 100 MB
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4'
  ]
where id = 'media';
-- Set storage limits for 'media' bucket