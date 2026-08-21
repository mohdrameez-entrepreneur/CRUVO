from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Q
from datetime import date

from .models import Profile, Ride, RideParticipant, FlagStop
from .serializers import (
    RegisterSerializer, LoginSerializer, ProfileSerializer,
    RideSerializer, RideCreateSerializer, RideParticipantSerializer,
    FlagStopSerializer, RiderDiscoverySerializer, UserSerializer,
    InvitationSerializer,
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
        user = authenticate(
            request,
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password'],
        )
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
        return Response(RideSerializer(rides, many=True).data)

    serializer = RideCreateSerializer(data=request.data)
    if serializer.is_valid():
        ride = serializer.save(creator=request.user)
        RideParticipant.objects.create(
            ride=ride, user=request.user, role='CREATOR', status='ACCEPTED',
        )
        return Response(RideSerializer(ride).data, status=status.HTTP_201_CREATED)
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
        return Response(RideSerializer(ride).data)

    if request.method == 'PATCH':
        serializer = RideCreateSerializer(ride, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(RideSerializer(ride).data)
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
        participants = ride.participants.select_related('user__profile').all()
        return Response(RideParticipantSerializer(participants, many=True).data)

    user_id = request.data.get('user_id')
    role = request.data.get('role', 'WINGMAN')
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    existing = RideParticipant.objects.filter(ride=ride, user=user).first()
    if existing:
        if existing.status == 'INVITED':
            existing.delete()
            return Response({'action': 'removed'}, status=status.HTTP_200_OK)
        return Response(RideParticipantSerializer(existing).data, status=status.HTTP_200_OK)

    participant = RideParticipant.objects.create(ride=ride, user=user, role=role, status='INVITED')
    return Response(RideParticipantSerializer(participant).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def toggle_ready_view(request, ride_id):
    try:
        ride = Ride.objects.get(id=ride_id)
    except Ride.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    participant = ride.participants.filter(user=request.user).first()
    if not participant or participant.status != 'ACCEPTED':
        return Response({'error': 'Not an accepted participant'}, status=status.HTTP_400_BAD_REQUEST)

    participant.is_ready = not participant.is_ready
    participant.save()

    all_ready = ride.participants.filter(status='ACCEPTED').exclude(is_ready=True).count() == 0
    total_accepted = ride.participants.filter(status='ACCEPTED').count()
    ready_count = ride.participants.filter(status='ACCEPTED', is_ready=True).count()

    return Response({
        'is_ready': participant.is_ready,
        'all_ready': all_ready and total_accepted > 1,
        'ready_count': ready_count,
        'total_accepted': total_accepted,
    })


@api_view(['POST'])
def start_ride_view(request, ride_id):
    try:
        ride = Ride.objects.get(id=ride_id)
    except Ride.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if ride.creator != request.user:
        return Response({'error': 'Only the creator can start the ride'}, status=status.HTTP_403_FORBIDDEN)

    if ride.status != 'SCHEDULED':
        return Response({'error': 'Ride is not in SCHEDULED status'}, status=status.HTTP_400_BAD_REQUEST)

    accepted = ride.participants.filter(status='ACCEPTED')
    all_ready = accepted.exclude(is_ready=True).count() == 0

    if accepted.count() <= 1:
        return Response({'error': 'Need at least 2 riders to start'}, status=status.HTTP_400_BAD_REQUEST)

    if not all_ready:
        return Response({'error': 'Not all riders are ready'}, status=status.HTTP_400_BAD_REQUEST)

    ride.status = 'ACTIVE'
    ride.save()
    return Response(RideSerializer(ride).data)


@api_view(['GET', 'POST'])
def flag_stops_view(request, ride_id):
    try:
        ride = Ride.objects.get(id=ride_id)
    except Ride.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        stops = ride.flag_stops.select_related('flagged_by__profile').all()
        return Response(FlagStopSerializer(stops, many=True).data)

    serializer = FlagStopSerializer(data={**request.data, 'ride': ride_id})
    if serializer.is_valid():
        serializer.save(flagged_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
        'ride': RideSerializer(ride).data,
        'participants': RideParticipantSerializer(participants, many=True).data,
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
    return Response(RiderDiscoverySerializer(users, many=True).data)


@api_view(['GET'])
def invitations_view(request):
    invitations = RideParticipant.objects.filter(
        user=request.user,
        status='INVITED',
    ).select_related('ride', 'ride__creator', 'ride__creator__profile', 'user__profile')
    return Response(InvitationSerializer(invitations, many=True).data)


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
    return Response(InvitationSerializer(participant).data)
