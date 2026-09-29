from django.urls import path
from . import views

app_name = 'pages'

urlpatterns = [
    path('', views.onboarding, name='onboarding'),
    path('signup/', views.signup_view, name='signup'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('discovery/', views.discovery, name='discovery'),
    path('create-ride/', views.create_ride, name='create-ride'),
    path('active-ride/', views.active_ride, name='active-ride'),
    path('flag-stop/', views.flag_stop, name='flag-stop'),
    path('ride-summary/', views.ride_summary, name='ride-summary'),
    path('privacy/', views.privacy_policy_view, name='privacy'),
    path('privacy.html', views.privacy_policy_view, name='privacy-html'),
    path('privacy-policy/', views.privacy_policy_view, name='privacy-policy'),
    path('terms/', views.terms_view, name='terms'),
    path('terms.html', views.terms_view, name='terms-html'),
]

