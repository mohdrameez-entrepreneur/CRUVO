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
            'user': UserSerializer(user).data,
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = authenticate(
            request,
            username=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
        )
        if user:
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data,
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
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    return Response(ProfileSerializer(profile).data)


@api_view(['GET', 'POST'])
def rides_view(request):
    if request.method == 'GET':
        rides = Ride.objects.filter(
            participants__user=request.user,
            status__in=['DRAFT', 'SCHEDULED'],
            date__gte=date.today(),
        ).order_by('date', 'time')[:20]
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

    if request.method == 'GET':
        return Response(RideSerializer(ride).data)

    if request.method == 'PATCH':
        serializer = RideCreateSerializer(ride, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(RideSerializer(ride).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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

    participant, created = RideParticipant.objects.get_or_create(
        ride=ride, user=user, defaults={'role': role, 'status': 'INVITED'},
    )
    return Response(
        RideParticipantSerializer(participant).data,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


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
    users = User.objects.exclude(id=request.user.id).select_related('profile')
    if query:
        users = users.filter(
            Q(profile__display_name__icontains=query) |
            Q(profile__bike_make__icontains=query) |
            Q(profile__location_city__icontains=query)
        )
    users = users[:20]
    return Response(RiderDiscoverySerializer(users, many=True).data)
