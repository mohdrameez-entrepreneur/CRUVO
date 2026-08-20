from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from datetime import date
from .forms import SignupForm, LoginForm
from .models import Ride


def onboarding(request):
    if request.user.is_authenticated:
        return redirect('pages:dashboard')
    return render(request, 'pages/onboarding-welcome.html')


def signup_view(request):
    if request.user.is_authenticated:
        return redirect('pages:dashboard')
    if request.method == 'POST':
        form = SignupForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('pages:dashboard')
    else:
        form = SignupForm()
    return render(request, 'pages/signup.html', {'form': form})


def login_view(request):
    if request.user.is_authenticated:
        return redirect('pages:dashboard')
    form = LoginForm(request.POST or None)
    error = None
    if request.method == 'POST' and form.is_valid():
        email = form.cleaned_data['email']
        password = form.cleaned_data['password']
        user = authenticate(request, username=email, password=password)
        if user is not None:
            login(request, user)
            return redirect('pages:dashboard')
        else:
            error = True
    return render(request, 'pages/login.html', {'form': form, 'error': error})


def logout_view(request):
    logout(request)
    return redirect('pages:onboarding')


@login_required
def dashboard(request):
    profile = request.user.profile
    upcoming_rides = Ride.objects.filter(
        participants__user=request.user,
        status__in=['DRAFT', 'SCHEDULED'],
        date__gte=date.today()
    ).order_by('date', 'time')[:5]
    current_hour = timezone.now().hour
    return render(request, 'pages/home-dashboard.html', {
        'profile': profile,
        'upcoming_rides': upcoming_rides,
        'current_hour': current_hour,
    })


@login_required
def discovery(request):
    return render(request, 'pages/ride_discovery.html')


@login_required
def create_ride(request):
    return render(request, 'pages/create-a-ride.html')


@login_required
def active_ride(request):
    return render(request, 'pages/active_ride_map.html')


@login_required
def flag_stop(request):
    return render(request, 'pages/flag-stop-confirmation.html')


@login_required
def ride_summary(request):
    return render(request, 'pages/ride_summary.html')
