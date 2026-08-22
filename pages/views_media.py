import os
import mimetypes
from django.conf import settings
from django.http import FileResponse, Http404


def serve_media(request, path=''):
    full_path = os.path.join(str(settings.MEDIA_ROOT), path)
    full_path = os.path.normpath(full_path)
    if not full_path.startswith(str(settings.MEDIA_ROOT)):
        raise Http404
    if not os.path.isfile(full_path):
        raise Http404
    content_type, _ = mimetypes.guess_type(full_path)
    with open(full_path, 'rb') as f:
        return FileResponse(f, content_type=content_type or 'application/octet-stream')
