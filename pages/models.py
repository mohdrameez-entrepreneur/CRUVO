from django.db import models
from django.contrib.auth.models import User


class Profile(models.Model):
    STYLE_CHOICES = [
        ('ADVENTURE', 'Adventure'),
        ('SPORT', 'Sport'),
        ('TOURING', 'Touring'),
        ('CRUISE', 'Cruise'),
        ('COMMUTE', 'Commute'),
    ]
    EXPERIENCE_CHOICES = [
        ('BEGINNER', 'Beginner'),
        ('INTERMEDIATE', 'Intermediate'),
        ('VETERAN', 'Veteran'),
        ('EXPERT', 'Expert'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    display_name = models.CharField(max_length=100)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    bio = models.TextField(blank=True, default='')
    bike_make = models.CharField(max_length=100, blank=True, default='')
    bike_model = models.CharField(max_length=100, blank=True, default='')
    riding_style = models.CharField(max_length=20, choices=STYLE_CHOICES, blank=True, default='')
    experience_level = models.CharField(max_length=20, choices=EXPERIENCE_CHOICES, blank=True, default='')
    location_city = models.CharField(max_length=100, blank=True, default='')
    location_lat = models.FloatField(null=True, blank=True)
    location_lng = models.FloatField(null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True, default='')
    is_email_public = models.BooleanField(default=False)
    is_phone_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.display_name

    def initials(self):
        parts = self.display_name.strip().split()
        if len(parts) >= 2:
            return (parts[0][0] + parts[1][0]).upper()
        return self.display_name[:2].upper() if self.display_name else '??'


class Ride(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SCHEDULED', 'Scheduled'),
        ('ACTIVE', 'Active'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_rides')
    name = models.CharField(max_length=200)
    origin_name = models.CharField(max_length=200, blank=True, default='')
    origin_lat = models.FloatField(null=True, blank=True)
    origin_lng = models.FloatField(null=True, blank=True)
    destination_name = models.CharField(max_length=200, blank=True, default='')
    destination_lat = models.FloatField(null=True, blank=True)
    destination_lng = models.FloatField(null=True, blank=True)
    date = models.DateField()
    time = models.TimeField()
    is_public = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    distance_km = models.FloatField(null=True, blank=True)
    route_polyline = models.TextField(blank=True, default='')
    route_distance_m = models.IntegerField(null=True, blank=True)
    route_duration_s = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    def participant_count(self):
        return self.participants.filter(status='ACCEPTED').count()


class RideParticipant(models.Model):
    ROLE_CHOICES = [
        ('CREATOR', 'Creator'),
        ('LEAD', 'Lead'),
        ('WINGMAN', 'Wingman'),
        ('SWEEP', 'Sweep'),
    ]
    STATUS_CHOICES = [
        ('INVITED', 'Invited'),
        ('ACCEPTED', 'Accepted'),
        ('DECLINED', 'Declined'),
        ('COMPLETED', 'Completed'),
    ]

    ride = models.ForeignKey(Ride, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ride_participations')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='WINGMAN')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='INVITED')
    is_ready = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('ride', 'user')

    def __str__(self):
        return f"{self.user.profile.display_name} on {self.ride.name}"


class FlagStop(models.Model):
    TYPE_CHOICES = [
        ('FUEL', 'Fuel'),
        ('FOOD', 'Food'),
        ('BREAK', 'Break'),
        ('GENERAL', 'General'),
        ('ISSUE', 'Issue'),
    ]

    ride = models.ForeignKey(Ride, on_delete=models.CASCADE, related_name='flag_stops')
    flagged_by = models.ForeignKey(User, on_delete=models.CASCADE)
    stop_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    lat = models.FloatField(default=0)
    lng = models.FloatField(default=0)
    location_name = models.CharField(max_length=200, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.stop_type} stop on {self.ride.name}"


class RidePosition(models.Model):
    ride = models.ForeignKey(Ride, on_delete=models.CASCADE, related_name='positions')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    lat = models.FloatField()
    lng = models.FloatField()
    heading = models.FloatField(default=0)
    speed = models.FloatField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('ride', 'user')

    def __str__(self):
        return f"{self.user.username} at {self.lat},{self.lng} on {self.ride.name}"


class Friendship(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('DECLINED', 'Declined'),
    ]

    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_friend_requests')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_friend_requests')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('sender', 'receiver')

    def __str__(self):
        return f"{self.sender.username} -> {self.receiver.username} ({self.status})"


def are_friends(user1, user2):
    if not user1 or not user2:
        return False
    if user1.id == user2.id:
        return True
    return Friendship.objects.filter(
        status='ACCEPTED'
    ).filter(
        models.Q(sender=user1, receiver=user2) | models.Q(sender=user2, receiver=user1)
    ).exists()
