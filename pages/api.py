from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Q
from datetime import date

from .models import Profile, Ride, RideParticipant, FlagStop, RidePosition, Friendship, are_friends
from .serializers import (
    RegisterSerializer, LoginSerializer, ProfileSerializer,
    RideSerializer, RideCreateSerializer, RideParticipantSerializer,
    FlagStopSerializer, RiderDiscoverySerializer, UserSerializer,
    InvitationSerializer, RidePositionSerializer, FriendshipSerializer,
)


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

    api_key = getattr(settings, 'TOMTOM_API_KEY', '') or os.environ.get('TOMTOM_API_KEY', '54S1S2VigjyRLWIZiK8XRI8OsPPz30Sd')
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
    elif action == 'decline':
        friendship.status = 'DECLINED'
    else:
        return Response({'error': 'Action must be "accept" or "decline"'}, status=status.HTTP_400_BAD_REQUEST)

    friendship.save()
    return Response(FriendshipSerializer(friendship, context={'request': request}).data)


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

