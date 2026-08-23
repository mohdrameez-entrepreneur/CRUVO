from django.urls import path
from . import api

app_name = 'api'

urlpatterns = [
    path('auth/register/', api.register_view, name='register'),
    path('auth/login/', api.login_view, name='login'),
    path('auth/logout/', api.logout_view, name='logout'),
    path('profile/', api.profile_view, name='profile'),
    path('profile/change-username/', api.change_username_view, name='change-username'),
    path('profile/change-email/', api.change_email_view, name='change-email'),
    path('rides/', api.rides_view, name='rides'),
    path('rides/<int:ride_id>/', api.ride_detail_view, name='ride-detail'),
    path('rides/<int:ride_id>/participants/', api.ride_participants_view, name='ride-participants'),
    path('rides/<int:ride_id>/toggle-ready/', api.toggle_ready_view, name='toggle-ready'),
    path('rides/<int:ride_id>/start-ride/', api.start_ride_view, name='start-ride'),
    path('rides/<int:ride_id>/flag-stops/', api.flag_stops_view, name='ride-flag-stops'),
    path('rides/<int:ride_id>/clear-flag/', api.clear_flag_view, name='ride-clear-flag'),
    path('rides/<int:ride_id>/summary/', api.ride_summary_view, name='ride-summary'),
    path('invitations/', api.invitations_view, name='invitations'),
    path('invitations/<int:participant_id>/respond/', api.respond_invitation_view, name='respond-invitation'),
    path('discovery/riders/', api.discovery_view, name='discovery'),
    path('rides/<int:ride_id>/positions/', api.get_positions_view, name='ride-positions'),
    path('rides/<int:ride_id>/update-position/', api.update_position_view, name='update-position'),
    path('rides/<int:ride_id>/fetch-route/', api.fetch_route_view, name='fetch-route'),
    path('rides/<int:ride_id>/join/', api.join_public_ride_view, name='join-public-ride'),
    path('friends/request/', api.friend_request_view, name='friend-request'),
    path('friends/<int:friendship_id>/respond/', api.respond_friend_request_view, name='respond-friend-request'),
    path('friends/', api.list_friends_view, name='list-friends'),
    path('friends/requests/', api.list_friend_requests_view, name='list-friend-requests'),
]
