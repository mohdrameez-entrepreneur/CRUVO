import os
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Q
from django.core.cache import cache
from django.conf import settings as django_settings
from datetime import date
import hashlib
import uuid
import random
import string
import logging
import threading
import base64
from email.message import EmailMessage

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)

from .models import Profile, Ride, RideParticipant, FlagStop, RidePosition, Friendship, are_friends
from .serializers import (
    RegisterSerializer, LoginSerializer, ProfileSerializer,
    RideSerializer, RideCreateSerializer, RideParticipantSerializer,
    FlagStopSerializer, RiderDiscoverySerializer, UserSerializer,
    InvitationSerializer, RidePositionSerializer, FriendshipSerializer,
)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def forgot_password_request(request):
    """Step 1: Request OTP. Always returns 200 to prevent email enumeration."""
    email = request.data.get('email', '').strip().lower()
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email__iexact=email).first()
    if user:
        # Generate a 6-digit OTP
        otp = ''.join(random.choices(string.digits, k=6))
        otp_hash = hashlib.sha256(otp.encode()).hexdigest()

        # Store in cache for 15 minutes (900 seconds)
        cache_key = f'pwd_reset_otp_{email}'
        cache.set(cache_key, {'otp_hash': otp_hash, 'user_id': user.id}, timeout=900)

        # Send email via Gmail API in background thread (bypasses Render SMTP port 587 block)
        def _send_otp_email(username, recipient, code):
            try:
                print(f"[ForgotPassword] Authenticating Gmail API for {django_settings.EMAIL_HOST_USER}...")
                
                # Reconstruct credentials from tokens in settings
                creds = Credentials(
                    token=None,
                    refresh_token=django_settings.GMAIL_API_REFRESH_TOKEN,
                    token_uri="https://oauth2.googleapis.com/token",
                    client_id=django_settings.GMAIL_API_CLIENT_ID,
                    client_secret=django_settings.GMAIL_API_CLIENT_SECRET,
                )

                # Build Gmail API service
                service = build('gmail', 'v1', credentials=creds)

                # Create the email message
                message = EmailMessage()
                message['To'] = recipient
                message['From'] = django_settings.DEFAULT_FROM_EMAIL
                message['Subject'] = 'Your CRUVO Password Reset Code'
                
                # HTML content
                html_content = (
                    f'<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#1a1b1f;color:#e3e2e7;border-radius:12px;">'
                    f'<h2 style="color:#ffd600;letter-spacing:-0.5px;">CRUVO</h2>'
                    f'<p style="font-size:16px;">Hi <strong>{username}</strong>,</p>'
                    f'<p>Your password reset code is:</p>'
                    f'<div style="font-size:40px;font-weight:800;letter-spacing:10px;color:#ffd600;padding:20px 0;">{code}</div>'
                    f'<p style="color:#999077;font-size:13px;">This code expires in <strong>15 minutes</strong>. Do not share it with anyone.</p>'
                    f'<p style="color:#999077;font-size:13px;">If you did not request this, you can safely ignore this email.</p>'
                    f'</div>'
                )
                
                message.set_content(html_content, subtype='html')

                # Base64 encode the message
                encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
                create_message = {'raw': encoded_message}

                # Send it!
                send_message = service.users().messages().send(userId="me", body=create_message).execute()
                
                print(f"[ForgotPassword] SUCCESS: OTP email sent to {recipient} via Gmail API (Message Id: {send_message.get('id')})")
            except HttpError as error:
                print(f"[ForgotPassword] HTTP ERROR: Gmail API failed for {recipient}: {error}")
            except Exception as exc:
                print(f'[ForgotPassword] ERROR: Email send failed for {recipient}: {type(exc).__name__} - {exc}')
                import traceback
                traceback.print_exc()

        threading.Thread(
            target=_send_otp_email,
            args=(user.username, user.email, otp),
            daemon=True,
        ).start()

    # Always return success immediately — never block on SMTP
    return Response({'detail': 'If an account with that email exists, a reset code has been sent.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def forgot_password_verify(request):
    """Step 2: Verify OTP. Returns a short-lived reset_token on success."""
    email = request.data.get('email', '').strip().lower()
    otp = request.data.get('otp', '').strip()

    if not email or not otp:
        return Response({'error': 'Email and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)

    cache_key = f'pwd_reset_otp_{email}'
    cached = cache.get(cache_key)

    if not cached:
        return Response({'error': 'Reset code has expired or is invalid. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

    otp_hash = hashlib.sha256(otp.encode()).hexdigest()
    if otp_hash != cached['otp_hash']:
        return Response({'error': 'Incorrect code. Please check and try again.'}, status=status.HTTP_400_BAD_REQUEST)

    # OTP is valid — issue a reset token (valid for 10 minutes)
    reset_token = str(uuid.uuid4())
    reset_cache_key = f'pwd_reset_token_{reset_token}'
    cache.set(reset_cache_key, {'user_id': cached['user_id']}, timeout=600)

    # Invalidate the OTP so it can't be reused
    cache.delete(cache_key)

    return Response({'reset_token': reset_token}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def forgot_password_reset(request):
    """Step 3: Set new password using the reset_token from step 2."""
    reset_token = request.data.get('reset_token', '').strip()
    new_password = request.data.get('new_password', '')
    confirm_password = request.data.get('confirm_password', '')

    if not reset_token or not new_password or not confirm_password:
        return Response({'error': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)

    if new_password != confirm_password:
        return Response({'error': 'Passwords do not match'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 8:
        return Response({'error': 'Password must be at least 8 characters'}, status=status.HTTP_400_BAD_REQUEST)

    reset_cache_key = f'pwd_reset_token_{reset_token}'
    cached = cache.get(reset_cache_key)

    if not cached:
        return Response({'error': 'Reset session has expired. Please start over.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(id=cached['user_id'])
    except User.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_400_BAD_REQUEST)

    # Set the new password
    user.set_password(new_password)
    user.save()

    # Invalidate all existing auth tokens (force re-login on all devices)
    Token.objects.filter(user=user).delete()

    # Invalidate the reset token so it can't be reused
    cache.delete(reset_cache_key)

    return Response({'detail': 'Password reset successfully. Please log in with your new password.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
                'token': token.key,
                'user': UserSerializer(user, context={'request': request}).data,
            }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        login_identifier = serializer.validated_data['username'].strip()
        password = serializer.validated_data['password']

        user = authenticate(request, username=login_identifier, password=password)
        if not user:
            matched_user = User.objects.filter(email__iexact=login_identifier).first()
            if matched_user:
                user = authenticate(request, username=matched_user.username, password=password)

        if user:
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user, context={'request': request}).data,
            })
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def google_auth_view(request):
    import urllib.request
    import json
    from django.utils.crypto import get_random_string

    id_token = request.data.get('id_token')
    access_token = request.data.get('access_token')

    if not id_token and not access_token:
        return Response({'error': 'id_token or access_token is required'}, status=status.HTTP_400_BAD_REQUEST)

    user_info = None

    # 1. Verify via Google ID token if provided
    if id_token:
        try:
            url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
            req = urllib.request.Request(url, headers={'User-Agent': 'CRUVO-Backend'})
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status == 200:
                    payload = json.loads(response.read().decode())
                    if payload.get('email'):
                        user_info = payload
        except Exception:
            pass

    # 2. Fallback to access_token userinfo if id_token failed or wasn't provided
    if not user_info and access_token:
        try:
            url = f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={access_token}"
            req = urllib.request.Request(url, headers={'User-Agent': 'CRUVO-Backend'})
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status == 200:
                    payload = json.loads(response.read().decode())
                    if payload.get('email'):
                        user_info = payload
        except Exception:
            pass

    if not user_info or not user_info.get('email'):
        return Response({'error': 'Invalid Google token or unverified email'}, status=status.HTTP_400_BAD_REQUEST)

    email = user_info['email'].lower().strip()
    name = user_info.get('name') or user_info.get('given_name') or email.split('@')[0]

    # Look up existing user by email
    user = User.objects.filter(email__iexact=email).first()

    if not user:
        # Generate clean unique username
        base_username = email.split('@')[0].lower()
        base_username = ''.join(c for c in base_username if c.isalnum() or c in ('_', '.'))[:20]
        if not base_username or len(base_username) < 3:
            base_username = f"rider_{get_random_string(6).lower()}"

        username = base_username
        counter = 1
        while User.objects.filter(username__iexact=username).exists():
            username = f"{base_username[:15]}_{counter}"
            counter += 1

        random_pw = get_random_string(32)
        user = User.objects.create_user(
            username=username,
            email=email,
            password=random_pw,
            first_name=user_info.get('given_name', '')[:30],
            last_name=user_info.get('family_name', '')[:30],
        )
        Profile.objects.create(
            user=user,
            display_name=name[:100],
        )
    else:
        # Ensure user profile exists
        if not hasattr(user, 'profile'):
            Profile.objects.create(
                user=user,
                display_name=name[:100],
            )

    token, _ = Token.objects.get_or_create(user=user)
    return Response({
        'token': token.key,
        'user': UserSerializer(user, context={'request': request}).data,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def logout_view(request):
    try:
        request.user.auth_token.delete()
    except Exception:
        pass
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'PATCH'])
def profile_view(request):
    profile = request.user.profile
    if request.method == 'PATCH':
        serializer = ProfileSerializer(profile, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    return Response(ProfileSerializer(profile, context={'request': request}).data)


@api_view(['POST'])
def change_username_view(request):
    new_username = request.data.get('username', '').strip().lower()
    password = request.data.get('password', '')
    if not new_username or len(new_username) < 3:
        return Response({'error': 'Username must be at least 3 characters'}, status=status.HTTP_400_BAD_REQUEST)
    if not request.user.check_password(password):
        return Response({'error': 'Incorrect password'}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(username__iexact=new_username).exclude(id=request.user.id).exists():
        return Response({'error': 'Username already taken'}, status=status.HTTP_400_BAD_REQUEST)
    request.user.username = new_username
    request.user.save()
    return Response({'username': request.user.username})


@api_view(['POST'])
def change_email_view(request):
    new_email = request.data.get('email', '').strip().lower()
    password = request.data.get('password', '')
    if not new_email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not request.user.check_password(password):
        return Response({'error': 'Incorrect password'}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(email__iexact=new_email).exclude(id=request.user.id).exists():
        return Response({'error': 'Email already in use'}, status=status.HTTP_400_BAD_REQUEST)
    request.user.email = new_email
    request.user.save()
    return Response({'email': request.user.email})


@api_view(['GET', 'POST'])
def rides_view(request):
    if request.method == 'GET':
        rides = Ride.objects.filter(
            participants__user=request.user,
            participants__status='ACCEPTED',
        ).order_by('-date', '-time')[:50]
        return Response(RideSerializer(rides, many=True, context={'request': request}).data)

    serializer = RideCreateSerializer(data=request.data)
    if serializer.is_valid():
        ride = serializer.save(creator=request.user)
        RideParticipant.objects.create(
            ride=ride, user=request.user, role='CREATOR', status='ACCEPTED',
        )
        return Response(RideSerializer(ride, context={'request': request}).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
def ride_detail_view(request, ride_id):
    try:
        ride = Ride.objects.get(id=ride_id)
    except Ride.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET' and not ride.is_public:
        is_participant = ride.participants.filter(user=request.user).exists()
        if not is_participant:
            return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(RideSerializer(ride, context={'request': request}).data)

    if request.method == 'PATCH':
        if ride.creator != request.user:
            return Response({'error': 'Only the ride creator can edit this ride'}, status=status.HTTP_403_FORBIDDEN)
        new_status = request.data.get('status')
        old_status = ride.status
        serializer = RideCreateSerializer(ride, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            if new_status == 'COMPLETED' and old_status != 'COMPLETED':
                from channels.layers import get_channel_layer
                from asgiref.sync import async_to_sync
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f'ride_{ride_id}',
                    {
                        'type': 'ride_ended',
                        'ride_id': ride_id,
                        'ended_by': request.user.id,
                        'ended_by_name': request.user.profile.display_name,
                    }
                )
            return Response(RideSerializer(ride, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if ride.creator != request.user:
        return Response({'error': 'Only the ride creator can delete this ride'}, status=status.HTTP_403_FORBIDDEN)

    ride.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
def ride_participants_view(request, ride_id):
    try:
        ride = Ride.objects.get(id=ride_id)
    except Ride.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        if not ride.is_public and ride.creator != request.user and not ride.participants.filter(user=request.user).exists():
            return Response(status=status.HTTP_404_NOT_FOUND)
        participants = ride.participants.select_related('user__profile').all()
        return Response(RideParticipantSerializer(participants, many=True, context={'request': request}).data)

    if ride.creator != request.user:
        return Response({'error': 'Only the ride creator can invite or manage participants'}, status=status.HTTP_403_FORBIDDEN)

    user_id = request.data.get('user_id')
    role = request.data.get('role', 'WINGMAN')
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if not ride.is_public and not are_friends(request.user, user):
        return Response({'error': 'Only accepted friends can be invited to private rides'}, status=status.HTTP_400_BAD_REQUEST)

    existing = RideParticipant.objects.filter(ride=ride, user=user).first()
    if existing:
        if existing.status == 'INVITED':
            existing.delete()
            return Response({'action': 'removed'}, status=status.HTTP_200_OK)
        return Response(RideParticipantSerializer(existing, context={'request': request}).data, status=status.HTTP_200_OK)

    participant = RideParticipant.objects.create(ride=ride, user=user, role=role, status='INVITED')
    return Response(RideParticipantSerializer(participant, context={'request': request}).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def toggle_ready_view(request, ride_id):
    try:
        ride = Ride.objects.get(id=ride_id)
    except Ride.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if ride.creator == request.user:
        return Response({'error': 'Creator cannot mark ready — just start the ride'}, status=status.HTTP_400_BAD_REQUEST)

    participant = ride.participants.filter(user=request.user).first()
    if not participant or participant.status != 'ACCEPTED':
        return Response({'error': 'Not an accepted participant'}, status=status.HTTP_400_BAD_REQUEST)

    participant.is_ready = not participant.is_ready
    participant.save()

    non_creator = ride.participants.filter(status='ACCEPTED').exclude(user=ride.creator)
    all_ready = non_creator.count() > 0 and non_creator.exclude(is_ready=True).count() == 0
    total_non_creator = non_creator.count()
    ready_count = non_creator.filter(is_ready=True).count()

    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'ride_{ride_id}',
        {
            'type': 'ready_update',
            'user_id': request.user.id,
            'is_ready': participant.is_ready,
            'ready_count': ready_count,
            'total_riders': total_non_creator,
        }
    )

    return Response({
        'is_ready': participant.is_ready,
        'all_ready': all_ready,
        'ready_count': ready_count,
        'total_riders': total_non_creator,
    })


@api_view(['POST'])
def start_ride_view(request, ride_id):
    try:
        ride = Ride.objects.get(id=ride_id)
    except Ride.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if ride.creator != request.user:
        return Response({'error': 'Only the creator can start the ride'}, status=status.HTTP_403_FORBIDDEN)

    non_creator = ride.participants.filter(status='ACCEPTED').exclude(user=ride.creator)
    all_ready = non_creator.count() > 0 and non_creator.exclude(is_ready=True).count() == 0

    if non_creator.count() > 0 and not all_ready:
        return Response({'error': 'Not all riders are ready'}, status=status.HTTP_400_BAD_REQUEST)

    ride.status = 'ACTIVE'
    ride.save()

    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'ride_{ride_id}',
        {
            'type': 'ride_started',
            'ride_id': ride_id,
        }
    )

    return Response(RideSerializer(ride, context={'request': request}).data)


@api_view(['GET', 'POST'])
def flag_stops_view(request, ride_id):
    try:
        ride = Ride.objects.get(id=ride_id)
    except Ride.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    is_participant = ride.creator == request.user or ride.participants.filter(user=request.user, status='ACCEPTED').exists()
    if not is_participant:
        return Response({'error': 'Only accepted participants can view or add flag stops'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        stops = ride.flag_stops.select_related('flagged_by__profile').all()
        return Response(FlagStopSerializer(stops, many=True).data)

    serializer = FlagStopSerializer(data={**request.data, 'ride': ride_id})
    if serializer.is_valid():
        serializer.save(flagged_by=request.user)

        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        stop_type = serializer.validated_data.get('stop_type', 'stop')
        location_name = serializer.validated_data.get('location_name', '')
        lat = serializer.validated_data.get('lat', 0)
        lng = serializer.validated_data.get('lng', 0)
        async_to_sync(channel_layer.group_send)(
            f'ride_{ride_id}',
            {
                'type': 'flag_notification',
                'user_id': request.user.id,
                'user_name': request.user.profile.display_name,
                'stop_type': stop_type,
                'location_name': location_name,
                'lat': lat,
                'lng': lng,
            }
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def clear_flag_view(request, ride_id):
    try:
        ride = Ride.objects.get(id=ride_id)
    except Ride.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    from django.utils import timezone
    FlagStop.objects.filter(
        ride=ride, flagged_by=request.user, resolved_at__isnull=True
    ).update(resolved_at=timezone.now())
    
    display_name = getattr(getattr(request.user, 'profile', None), 'display_name', None) or request.user.username
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'ride_{ride_id}',
        {
            'type': 'flag_cleared',
            'user_id': request.user.id,
        }
    )
    async_to_sync(channel_layer.group_send)(
        f'ride_{ride_id}',
        {
            'type': 'clear_flag_notification',
            'user_id': request.user.id,
            'user_name': display_name,
        }
    )
        
    return Response({'cleared': True})


@api_view(['GET'])
def ride_summary_view(request, ride_id):
    try:
        ride = Ride.objects.get(id=ride_id)
    except Ride.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if not ride.is_public:
        is_participant = ride.participants.filter(user=request.user).exists()
        if not is_participant:
            return Response(status=status.HTTP_404_NOT_FOUND)

    participants = ride.participants.select_related('user__profile').all()
    flag_stops = ride.flag_stops.all()
    return Response({
        'ride': RideSerializer(ride, context={'request': request}).data,
        'participants': RideParticipantSerializer(participants, many=True, context={'request': request}).data,
        'flag_stops': FlagStopSerializer(flag_stops, many=True).data,
        'stats': {
            'duration': None,
            'distance_km': ride.distance_km,
            'rider_count': ride.participant_count(),
            'stop_count': flag_stops.count(),
        },
    })


@api_view(['GET'])
def discovery_view(request):
    query = request.GET.get('q', '')
    style = request.GET.get('style', '')
    experience = request.GET.get('experience', '')
    bike = request.GET.get('bike', '')
    location = request.GET.get('location', '')

    users = User.objects.exclude(id=request.user.id).select_related('profile')

    if query:
        users = users.filter(
            Q(username__icontains=query) |
            Q(profile__display_name__icontains=query) |
            Q(profile__bike_make__icontains=query) |
            Q(profile__bike_model__icontains=query) |
            Q(profile__location_city__icontains=query)
        )
    if style:
        users = users.filter(profile__riding_style__iexact=style)
    if experience:
        users = users.filter(profile__experience_level__iexact=experience)
    if bike:
        users = users.filter(
            Q(profile__bike_make__icontains=bike) |
            Q(profile__bike_model__icontains=bike)
        )
    if location:
        users = users.filter(profile__location_city__icontains=location)

    users = users[:20]
    return Response(RiderDiscoverySerializer(users, many=True, context={'request': request}).data)


@api_view(['GET'])
def invitations_view(request):
    invitations = RideParticipant.objects.filter(
        user=request.user,
        status='INVITED',
    ).select_related('ride', 'ride__creator', 'ride__creator__profile', 'user__profile')
    return Response(InvitationSerializer(invitations, many=True, context={'request': request}).data)


@api_view(['POST'])
def respond_invitation_view(request, participant_id):
    try:
        participant = RideParticipant.objects.get(id=participant_id, user=request.user)
    except RideParticipant.DoesNotExist:
        return Response({'error': 'Invitation not found'}, status=status.HTTP_404_NOT_FOUND)

    action = request.data.get('action', '')
    if action == 'accept':
        participant.status = 'ACCEPTED'
    elif action == 'decline':
        participant.status = 'DECLINED'
    else:
        return Response({'error': 'Action must be "accept" or "decline"'}, status=status.HTTP_400_BAD_REQUEST)

    participant.save()
    return Response(InvitationSerializer(participant, context={'request': request}).data)


@api_view(['POST'])
def update_position_view(request, ride_id):
    try:
        ride = Ride.objects.get(id=ride_id)
    except Ride.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if ride.status != 'ACTIVE':
        return Response({'error': 'Ride is not active'}, status=status.HTTP_400_BAD_REQUEST)

    is_participant = ride.participants.filter(user=request.user, status='ACCEPTED').exists()
    if not is_participant:
        return Response({'error': 'Not a participant'}, status=status.HTTP_403_FORBIDDEN)

    lat = request.data.get('lat')
    lng = request.data.get('lng')
    heading = request.data.get('heading', 0)
    speed = request.data.get('speed', 0)

    if lat is None or lng is None:
        return Response({'error': 'lat and lng required'}, status=status.HTTP_400_BAD_REQUEST)

    RidePosition.objects.update_or_create(
        ride=ride, user=request.user,
        defaults={'lat': lat, 'lng': lng, 'heading': heading, 'speed': speed},
    )
    return Response({'ok': True})


@api_view(['GET'])
def get_positions_view(request, ride_id):
    try:
        ride = Ride.objects.get(id=ride_id)
    except Ride.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if not ride.is_public and ride.creator != request.user and not ride.participants.filter(user=request.user, status='ACCEPTED').exists():
        return Response({'error': 'Not authorized to view positions on this private ride'}, status=status.HTTP_403_FORBIDDEN)

    positions = RidePosition.objects.filter(ride=ride).select_related('user__profile')
    return Response(RidePositionSerializer(positions, many=True, context={'request': request}).data)


@api_view(['POST'])
def fetch_route_view(request, ride_id):
    try:
        ride = Ride.objects.get(id=ride_id)
    except Ride.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if ride.creator != request.user and not ride.participants.filter(user=request.user, status='ACCEPTED').exists():
        return Response({'error': 'Not authorized to fetch route for this ride'}, status=status.HTTP_403_FORBIDDEN)

    if not ride.origin_lat or not ride.destination_lat:
        return Response({'error': 'Origin and destination coordinates required'}, status=status.HTTP_400_BAD_REQUEST)

    import urllib.request, json
    from django.conf import settings

    api_key = getattr(settings, 'TOMTOM_API_KEY', '') or os.environ.get('TOMTOM_API_KEY', '')
    url = (
        f'https://api.tomtom.com/routing/1/calculateRoute/'
        f'{ride.origin_lat},{ride.origin_lng}:{ride.destination_lat},{ride.destination_lng}'
        f'/json?key={api_key}&instructionsType=text&language=en-US&routeType=fastest'
    )

    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())

        routes = data.get('routes', [])
        if not routes:
            return Response({'error': 'No route found between coordinates'}, status=status.HTTP_404_NOT_FOUND)

        route = routes[0]
        legs = route.get('legs', [])
        if not legs or 'points' not in legs[0]:
            return Response({'error': 'Route points missing in provider response'}, status=status.HTTP_502_BAD_GATEWAY)

        polyline = legs[0]['points']
        distance_m = route.get('summary', {}).get('lengthInMeters', 0)
        duration_s = route.get('summary', {}).get('travelTimeInSeconds', 0)

        ride.route_polyline = json.dumps(polyline)
        ride.route_distance_m = distance_m
        ride.route_duration_s = duration_s
        ride.distance_km = round(distance_m / 1000, 1)
        ride.save()

        return Response({
            'route_polyline': polyline,
            'distance_km': ride.distance_km,
            'duration_s': duration_s,
        })
    except Exception as e:
        return Response({'error': f'Route fetch failed: {str(e)}'}, status=status.HTTP_502_BAD_GATEWAY)


@api_view(['POST'])
def join_public_ride_view(request, ride_id):
    try:
        ride = Ride.objects.get(id=ride_id)
    except Ride.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if not ride.is_public:
        return Response({'error': 'Cannot join a private ride directly. You must be invited by a friend.'}, status=status.HTTP_400_BAD_REQUEST)

    existing = RideParticipant.objects.filter(ride=ride, user=request.user).first()
    if existing:
        if existing.status != 'ACCEPTED':
            existing.status = 'ACCEPTED'
            existing.save()
        return Response(RideParticipantSerializer(existing, context={'request': request}).data)

    participant = RideParticipant.objects.create(
        ride=ride, user=request.user, role='WINGMAN', status='ACCEPTED'
    )
    return Response(RideParticipantSerializer(participant, context={'request': request}).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def friend_request_view(request):
    user_id = request.data.get('user_id')
    if not user_id:
        return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    if int(user_id) == request.user.id:
        return Response({'error': 'Cannot add yourself as a friend'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    existing = Friendship.objects.filter(
        Q(sender=request.user, receiver=target_user) | Q(sender=target_user, receiver=request.user)
    ).first()

    if existing:
        if existing.sender == target_user and existing.status == 'PENDING':
            existing.status = 'ACCEPTED'
            existing.save()
        elif existing.status == 'DECLINED':
            existing.status = 'PENDING'
            existing.sender = request.user
            existing.receiver = target_user
            existing.save()
        return Response(FriendshipSerializer(existing, context={'request': request}).data, status=status.HTTP_200_OK)

    friendship = Friendship.objects.create(
        sender=request.user, receiver=target_user, status='PENDING'
    )
    return Response(FriendshipSerializer(friendship, context={'request': request}).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def respond_friend_request_view(request, friendship_id):
    try:
        friendship = Friendship.objects.get(id=friendship_id)
    except Friendship.DoesNotExist:
        return Response({'error': 'Friend request not found'}, status=status.HTTP_404_NOT_FOUND)

    if friendship.receiver != request.user and friendship.sender != request.user:
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    action = request.data.get('action', '')
    if action == 'accept':
        friendship.status = 'ACCEPTED'
        friendship.save()
        return Response(FriendshipSerializer(friendship, context={'request': request}).data)
    elif action == 'decline':
        friendship.status = 'DECLINED'
        friendship.save()
        return Response(FriendshipSerializer(friendship, context={'request': request}).data)
    elif action == 'remove':
        friendship.delete()
        return Response({'success': True, 'status': 'NONE'})
    else:
        return Response({'error': 'Action must be "accept", "decline", or "remove"'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST', 'DELETE'])
def remove_friend_view(request, friendship_id=None):
    from django.db.models import Q
    target_id = friendship_id or request.data.get('user_id') or request.data.get('friendship_id')
    if not target_id:
        return Response({'error': 'friendship_id or user_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    friendship = Friendship.objects.filter(
        (Q(sender=request.user, receiver_id=target_id) | Q(receiver=request.user, sender_id=target_id)) |
        (Q(id=target_id) & (Q(sender=request.user) | Q(receiver=request.user)))
    ).first()

    if friendship:
        friendship.delete()

    return Response({'success': True, 'status': 'NONE', 'message': 'Friend removed successfully'})


@api_view(['GET'])
def user_profile_summary_view(request, user_id):
    try:
        target_user = User.objects.select_related('profile').get(id=user_id)
        return Response(RiderDiscoverySerializer(target_user, context={'request': request}).data)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
def list_friends_view(request):
    from django.db.models import Q
    friendships = Friendship.objects.filter(
        status='ACCEPTED'
    ).filter(
        Q(sender=request.user) | Q(receiver=request.user)
    ).select_related('sender__profile', 'receiver__profile')

    friends = []
    for f in friendships:
        friend_user = f.receiver if f.sender == request.user else f.sender
        friends.append(friend_user)

    return Response(RiderDiscoverySerializer(friends, many=True, context={'request': request}).data)


@api_view(['GET'])
def list_friend_requests_view(request):
    incoming = Friendship.objects.filter(
        receiver=request.user, status='PENDING'
    ).select_related('sender__profile', 'receiver__profile')

    accepted_notifications = Friendship.objects.filter(
        sender=request.user, status='ACCEPTED'
    ).select_related('sender__profile', 'receiver__profile').order_by('-updated_at')[:10]

    return Response({
        'incoming': FriendshipSerializer(incoming, many=True, context={'request': request}).data,
        'accepted_notifications': FriendshipSerializer(accepted_notifications, many=True, context={'request': request}).data,
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def app_version_view(request):
    return Response({
        'latest_version': '3.0.0',
        'min_required_version': '3.0.0',
        'download_url': 'https://cruvoride.vercel.app',
        'website_url': 'https://cruvoride.vercel.app',
        'release_date': '2026-08-27',
        'whats_new': [
            {
                'title': 'Google OAuth 2.0 Integration',
                'description': 'Direct, secure one-tap Google Sign-In and account authentication.',
                'icon': 'logo-google'
            },
            {
                'title': 'High-Reliability Email Infrastructure',
                'description': 'Upgraded instant password reset OTP system powered by official Google REST APIs.',
                'icon': 'mail-outline'
            },
            {
                'title': 'UI Betterments & Micro-Animations',
                'description': 'Refined dark luxury visual aesthetics, progressive loading feedback, and smooth navigation transitions.',
                'icon': 'color-palette-outline'
            },
            {
                'title': 'Stability & Bug Fixes',
                'description': 'Resolved cold-start connection timeouts, background threading issues, and state sync bugs.',
                'icon': 'bug-outline'
            },
            {
                'title': 'Friends-Only Privacy Controls',
                'description': 'Select whether your Email and Phone number are kept private or shared strictly with confirmed friends.',
                'icon': 'shield-checkmark-outline'
            }
        ],
        'update_steps': [
            'Tap "DOWNLOAD UPDATE v3.0.0" below to open the official CRUVO download portal.',
            'Download the new CRUVO v3.0.0 package file to your device.',
            'Open the downloaded package file to complete installation.',
            'Launch CRUVO v3.0.0 to experience the brand new features and performance enhancements!'
        ]
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def submit_bug_report_view(request):
    description = request.data.get('description', '').strip()
    category = request.data.get('category', 'GENERAL').strip()
    user_email = request.data.get('email', '') or (request.user.email if request.user.is_authenticated else '')
    app_version = request.data.get('app_version', '3.0.0')

    if not description:
        return Response({'error': 'Description is required'}, status=status.HTTP_400_BAD_REQUEST)

    print(f"[BUG REPORT] Category: {category} | Version: {app_version} | Email: {user_email}\nDescription: {description}")

    return Response({
        'success': True,
        'message': 'Thank you! Your feedback / bug report has been submitted directly to the CRUVO dev team.'
    })

