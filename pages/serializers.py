from rest_framework import serializers
from django.contrib.auth.models import User
from django.conf import settings
from .models import Profile, Ride, RideParticipant, FlagStop


class ProfileSerializer(serializers.ModelSerializer):
    initials = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = Profile
        fields = [
            'id', 'username', 'email', 'display_name', 'avatar', 'avatar_url', 'bio', 'bike_make', 'bike_model',
            'riding_style', 'experience_level', 'location_city', 'location_lat',
            'location_lng', 'phone', 'created_at', 'initials',
        ]
        read_only_fields = ['id', 'created_at', 'avatar_url', 'username', 'email']

    def get_initials(self, obj):
        return obj.initials()

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return f"{settings.MEDIA_URL}{obj.avatar}"
        return None


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'profile']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['profile'] = ProfileSerializer(instance.profile, context=self.context).data
        return data


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=30, min_length=3)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8)
    display_name = serializers.CharField(max_length=100)
    bike_make = serializers.CharField(max_length=100, required=False, default='')
    bike_model = serializers.CharField(max_length=100, required=False, default='')
    riding_style = serializers.ChoiceField(
        choices=[c[0] for c in Profile.STYLE_CHOICES], required=False, default=''
    )
    experience_level = serializers.ChoiceField(
        choices=[c[0] for c in Profile.EXPERIENCE_CHOICES], required=False, default=''
    )

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value.lower()

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password2': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        display_name = validated_data.pop('display_name')
        bike_make = validated_data.pop('bike_make', '')
        bike_model = validated_data.pop('bike_model', '')
        riding_style = validated_data.pop('riding_style', '')
        experience_level = validated_data.pop('experience_level', '')
        validated_data.pop('password2')

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
        )
        Profile.objects.create(
            user=user,
            display_name=display_name,
            bike_make=bike_make,
            bike_model=bike_model,
            riding_style=riding_style,
            experience_level=experience_level,
        )
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()


class RideParticipantSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    initials = serializers.SerializerMethodField()
    bike_info = serializers.SerializerMethodField()

    class Meta:
        model = RideParticipant
        fields = ['id', 'user', 'role', 'status', 'joined_at', 'completed_at',
                  'display_name', 'initials', 'bike_info']

    def get_display_name(self, obj):
        return obj.user.profile.display_name

    def get_initials(self, obj):
        return obj.user.profile.initials()

    def get_bike_info(self, obj):
        p = obj.user.profile
        return f"{p.bike_make} {p.bike_model}".strip()


class RideSerializer(serializers.ModelSerializer):
    participant_count = serializers.SerializerMethodField()
    participants = RideParticipantSerializer(many=True, read_only=True)
    creator_name = serializers.SerializerMethodField()

    class Meta:
        model = Ride
        fields = [
            'id', 'creator', 'creator_name', 'name', 'origin_name', 'origin_lat',
            'origin_lng', 'destination_name', 'destination_lat', 'destination_lng',
            'date', 'time', 'is_public', 'status', 'distance_km', 'created_at',
            'updated_at', 'participant_count', 'participants',
        ]
        read_only_fields = ['id', 'creator', 'created_at', 'updated_at']

    def get_participant_count(self, obj):
        return obj.participant_count()

    def get_creator_name(self, obj):
        return obj.creator.profile.display_name


class RideCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ride
        fields = [
            'name', 'origin_name', 'origin_lat', 'origin_lng',
            'destination_name', 'destination_lat', 'destination_lng',
            'date', 'time', 'is_public',
        ]

    def validate_date(self, value):
        from datetime import date as today_date
        if value < today_date.today():
            raise serializers.ValidationError('Ride date cannot be in the past.')
        return value


class FlagStopSerializer(serializers.ModelSerializer):
    flagged_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FlagStop
        fields = [
            'id', 'ride', 'flagged_by', 'flagged_by_name', 'stop_type',
            'lat', 'lng', 'location_name', 'created_at', 'resolved_at',
        ]
        read_only_fields = ['id', 'flagged_by', 'created_at']

    def get_flagged_by_name(self, obj):
        return obj.flagged_by.profile.display_name


class RiderDiscoverySerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    distance_km = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'profile', 'distance_km']

    def get_distance_km(self, obj):
        return None


class InvitationSerializer(serializers.ModelSerializer):
    ride_name = serializers.CharField(source='ride.name', read_only=True)
    ride_date = serializers.DateField(source='ride.date', read_only=True)
    ride_time = serializers.TimeField(source='ride.time', read_only=True)
    ride_origin = serializers.CharField(source='ride.origin_name', read_only=True)
    ride_destination = serializers.CharField(source='ride.destination_name', read_only=True)
    creator_name = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = RideParticipant
        fields = ['id', 'ride', 'ride_name', 'ride_date', 'ride_time',
                  'ride_origin', 'ride_destination', 'status', 'role',
                  'creator_name', 'display_name', 'joined_at']

    def get_creator_name(self, obj):
        return obj.ride.creator.profile.display_name

    def get_display_name(self, obj):
        return obj.user.profile.display_name
