import json
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from .models import Ride, RideParticipant, RidePosition, FlagStop


class RideConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.ride_id = self.scope['url_route']['kwargs']['ride_id']
        self.group_name = f'ride_{self.ride_id}'
        self.user = self.scope.get('user')

        if not self.user or self.user.is_anonymous:
            raw_qs = self.scope.get('query_string', b'').decode()
            params = parse_qs(raw_qs)
            token_key = params.get('token', [None])[0]
            if token_key:
                self.user = await self.get_user_from_token(token_key)

        if not self.user or self.user.is_anonymous:
            await self.close()
            return

        is_participant = await self.check_participant()
        if not is_participant:
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        positions = await self.get_all_positions()
        await self.send(text_data=json.dumps({
            'type': 'positions_init',
            'positions': positions,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get('type')

        if msg_type == 'position':
            pos = await self.save_position(
                data['lat'], data['lng'],
                data.get('heading', 0), data.get('speed', 0)
            )
            await self.channel_layer.group_send(self.group_name, {
                'type': 'position_update',
                'position': pos,
            })

        elif msg_type == 'flag':
            flag = await self.create_flag(
                data['stop_type'], data['lat'], data['lng'],
                data.get('location_name', '')
            )
            if flag:
                await self.channel_layer.group_send(self.group_name, {
                    'type': 'flag_update',
                    'flag': flag,
                })
                user_name = await self.get_display_name()
                await self.channel_layer.group_send(self.group_name, {
                    'type': 'flag_notification',
                    'user_id': self.user.id,
                    'user_name': user_name,
                    'stop_type': data['stop_type'],
                    'location_name': data.get('location_name', ''),
                    'lat': data['lat'],
                    'lng': data['lng'],
                })

        elif msg_type == 'clear_flag':
            cleared = await self.clear_flag()
            if cleared:
                await self.channel_layer.group_send(self.group_name, {
                    'type': 'flag_cleared',
                    'user_id': self.user.id,
                })

    async def ready_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'ready_update',
            'user_id': event['user_id'],
            'is_ready': event['is_ready'],
            'ready_count': event['ready_count'],
            'total_riders': event['total_riders'],
        }))

    async def ride_started(self, event):
        await self.send(text_data=json.dumps({
            'type': 'ride_started',
            'ride_id': event['ride_id'],
        }))

    async def ride_ended(self, event):
        await self.send(text_data=json.dumps({
            'type': 'ride_ended',
            'ride_id': event['ride_id'],
            'ended_by': event['ended_by'],
            'ended_by_name': event['ended_by_name'],
        }))

    async def position_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'position',
            'position': event['position'],
        }))

    async def positions_init(self, event):
        await self.send(text_data=json.dumps({
            'type': 'positions_init',
            'positions': event['positions'],
        }))

    async def flag_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'flag',
            'flag': event['flag'],
        }))

    async def flag_cleared(self, event):
        await self.send(text_data=json.dumps({
            'type': 'clear_flag',
            'user_id': event['user_id'],
        }))

    async def flag_notification(self, event):
        await self.send(text_data=json.dumps({
            'type': 'flag_notification',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'stop_type': event['stop_type'],
            'location_name': event['location_name'],
            'lat': event['lat'],
            'lng': event['lng'],
        }))

    @database_sync_to_async
    def get_user_from_token(self, key):
        try:
            token = Token.objects.select_related('user').get(key=key)
            return token.user
        except Token.DoesNotExist:
            return None

    @database_sync_to_async
    def check_participant(self):
        return RideParticipant.objects.filter(
            ride_id=self.ride_id,
            user=self.user,
            status='ACCEPTED',
        ).exists()

    @database_sync_to_async
    def save_position(self, lat, lng, heading, speed):
        obj, _ = RidePosition.objects.update_or_create(
            ride_id=self.ride_id, user=self.user,
            defaults={'lat': lat, 'lng': lng, 'heading': heading, 'speed': speed},
        )
        return {
            'user': self.user.id,
            'lat': lat,
            'lng': lng,
            'heading': heading,
            'speed': speed,
        }

    @database_sync_to_async
    def get_all_positions(self):
        positions = RidePosition.objects.filter(
            ride_id=self.ride_id
        ).select_related('user__profile')
        return [
            {
                'user': p.user.id,
                'lat': p.lat,
                'lng': p.lng,
                'heading': p.heading,
                'speed': p.speed,
            }
            for p in positions
        ]

    @database_sync_to_async
    def get_display_name(self):
        try:
            return self.user.profile.display_name
        except Exception:
            return self.user.username

    @database_sync_to_async
    def create_flag(self, stop_type, lat, lng, location_name):
        ride = Ride.objects.get(id=self.ride_id)
        existing = FlagStop.objects.filter(
            ride=ride, flagged_by=self.user, resolved_at__isnull=True
        ).first()
        if existing:
            return None
        flag = FlagStop.objects.create(
            ride=ride, flagged_by=self.user,
            stop_type=stop_type, lat=lat, lng=lng,
            location_name=location_name,
        )
        return {
            'id': flag.id,
            'user': self.user.id,
            'stop_type': stop_type,
            'lat': lat,
            'lng': lng,
            'location_name': location_name,
        }

    @database_sync_to_async
    def clear_flag(self):
        from django.utils import timezone
        updated = FlagStop.objects.filter(
            ride_id=self.ride_id, flagged_by=self.user, resolved_at__isnull=True
        ).update(resolved_at=timezone.now())
        return updated > 0
