from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from pages.views_media import serve_media

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('pages.api_urls')),
    path('', include('pages.urls')),
]

if settings.DEBUG:
    from django.conf.urls.static import static
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    re_path_media = re_path(r'^media/(?P<path>.*)$', serve_media, name='serve_media')
    urlpatterns.append(re_path_media)
