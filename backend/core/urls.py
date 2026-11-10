from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from api.views import GoogleLoginView, RefreshView

urlpatterns = [
    path("", RedirectView.as_view(pattern_name="admin:index", permanent=False), name="backend-root"),
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    path("dj-rest-auth/google/login/", GoogleLoginView.as_view(), name="dj-rest-auth-google-login-root"),
    path("dj-rest-auth/token/refresh/", RefreshView.as_view(), name="dj-rest-auth-token-refresh-root"),
    path("dj-rest-auth/", include("dj_rest_auth.urls")),
    path("dj-rest-auth/registration/", include("dj_rest_auth.registration.urls")),
]
