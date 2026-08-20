from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm
from .models import Profile


class SignupForm(UserCreationForm):
    email = forms.EmailField(required=True)
    display_name = forms.CharField(max_length=100)
    bike_make = forms.CharField(max_length=100, required=False)
    bike_model = forms.CharField(max_length=100, required=False)
    riding_style = forms.ChoiceField(choices=[('', '')] + Profile.STYLE_CHOICES, required=False)
    experience_level = forms.ChoiceField(choices=[('', '')] + Profile.EXPERIENCE_CHOICES, required=False)

    class Meta:
        model = User
        fields = ['email', 'password1', 'password2']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['email'].widget.attrs.update({
            'class': 'w-full h-touch-target-min pl-10 pr-4 font-body-md text-body-md rounded transition-colors duration-200',
            'placeholder': 'rider@ignition.app',
            'id': 'email',
        })
        self.fields['display_name'].widget.attrs.update({
            'class': 'w-full h-touch-target-min pl-10 pr-4 font-body-md text-body-md rounded transition-colors duration-200',
            'placeholder': 'Your name',
            'id': 'display_name',
        })
        self.fields['password1'].widget.attrs.update({
            'class': 'w-full h-touch-target-min pl-10 pr-12 font-body-md text-body-md rounded transition-colors duration-200',
            'placeholder': 'Create password',
            'id': 'password1',
        })
        self.fields['password2'].widget.attrs.update({
            'class': 'w-full h-touch-target-min pl-10 pr-12 font-body-md text-body-md rounded transition-colors duration-200',
            'placeholder': 'Confirm password',
            'id': 'password2',
        })
        self.fields['bike_make'].widget.attrs.update({
            'class': 'w-full h-touch-target-min pl-10 pr-4 font-body-md text-body-md rounded transition-colors duration-200',
            'placeholder': 'e.g. Royal Enfield',
            'id': 'bike_make',
        })
        self.fields['bike_model'].widget.attrs.update({
            'class': 'w-full h-touch-target-min pl-10 pr-4 font-body-md text-body-md rounded transition-colors duration-200',
            'placeholder': 'e.g. Himalayan 450',
            'id': 'bike_model',
        })
        self.fields['riding_style'].widget.attrs.update({
            'class': 'w-full h-touch-target-min pl-10 pr-4 font-body-md text-body-md rounded transition-colors duration-200',
            'id': 'riding_style',
        })
        self.fields['experience_level'].widget.attrs.update({
            'class': 'w-full h-touch-target-min pl-10 pr-4 font-body-md text-body-md rounded transition-colors duration-200',
            'id': 'experience_level',
        })
    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError('An account with this email already exists.')
        return email

    def clean_display_name(self):
        display_name = self.cleaned_data.get('display_name')
        if not display_name.strip():
            raise forms.ValidationError('Display name is required.')
        return display_name.strip()

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        user.username = self.cleaned_data['email']
        if commit:
            user.save()
            Profile.objects.create(
                user=user,
                display_name=self.cleaned_data['display_name'],
                bike_make=self.cleaned_data.get('bike_make', ''),
                bike_model=self.cleaned_data.get('bike_model', ''),
                riding_style=self.cleaned_data.get('riding_style', ''),
                experience_level=self.cleaned_data.get('experience_level', ''),
            )
        return user


class LoginForm(forms.Form):
    email = forms.EmailField()
    password = forms.CharField(widget=forms.PasswordInput)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['email'].widget.attrs.update({
            'class': 'w-full h-touch-target-min pl-10 pr-4 font-body-md text-body-md rounded transition-colors duration-200',
            'placeholder': 'rider@ignition.app',
            'id': 'email',
        })
        self.fields['password'].widget.attrs.update({
            'class': 'w-full h-touch-target-min pl-10 pr-12 font-body-md text-body-md rounded transition-colors duration-200',
            'placeholder': 'Enter password',
            'id': 'password',
        })
