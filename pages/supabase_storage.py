import os
import uuid
import logging
import requests
from django.core.files.storage import Storage
from django.conf import settings

logger = logging.getLogger(__name__)


class SupabaseStorage(Storage):
    _bucket_created = False

    def _get_config(self):
        url = getattr(settings, 'SUPABASE_URL', os.environ.get('SUPABASE_URL', ''))
        key = getattr(settings, 'SUPABASE_SERVICE_KEY', os.environ.get('SUPABASE_SERVICE_KEY', ''))
        bucket = getattr(settings, 'SUPABASE_BUCKET', os.environ.get('SUPABASE_BUCKET', 'avatars'))
        return url, key, bucket

    def _ensure_bucket(self, url, key, bucket):
        if self._bucket_created or not key:
            return
        try:
            resp = requests.post(
                f'{url}/storage/v1/bucket',
                headers={
                    'Authorization': f'Bearer {key}',
                    'Content-Type': 'application/json',
                },
                json={'id': bucket, 'name': bucket, 'public': True},
                timeout=10,
            )
            if resp.status_code in (200, 201, 409):
                self._bucket_created = True
                if resp.status_code != 409:
                    logger.info(f'Supabase bucket "{bucket}" created')
            else:
                logger.warning(f'Supabase bucket create: {resp.status_code} {resp.text}')
        except Exception as e:
            logger.warning(f'Supabase bucket create failed: {e}')

    def save(self, name, content, max_length=None):
        url, key, bucket = self._get_config()
        ext = os.path.splitext(name)[1].lower()
        path = f"{uuid.uuid4().hex}{ext}"

        if key:
            self._ensure_bucket(url, key, bucket)
            content.open()
            data = content.read()
            content.close()
            headers = {
                'Authorization': f'Bearer {key}',
                'Content-Type': getattr(content, 'content_type', 'application/octet-stream'),
                'x-upsert': 'true',
            }
            try:
                resp = requests.put(
                    f'{url}/storage/v1/object/{bucket}/{path}',
                    headers=headers,
                    data=data,
                    timeout=30,
                )
                if resp.status_code in (200, 201):
                    return path
                logger.error(f'Supabase upload failed: {resp.status_code} {resp.text}')
            except Exception as e:
                logger.error(f'Supabase upload error: {e}')

        return path

    def url(self, name):
        if not name:
            return ''
        url, key, bucket = self._get_config()
        return f'{url}/storage/v1/object/public/{bucket}/{name}'

    def exists(self, name):
        return False

    def get_available_name(self, name, max_length=None):
        ext = os.path.splitext(name)[1].lower()
        return f"{uuid.uuid4().hex}{ext}"

    def delete(self, name):
        if not name:
            return
        url, key, bucket = self._get_config()
        if not key:
            return
        try:
            requests.delete(
                f'{url}/storage/v1/object/{bucket}/{name}',
                headers={'Authorization': f'Bearer {key}'},
                timeout=10,
            )
        except Exception:
            pass
