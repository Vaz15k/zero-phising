from django.contrib import admin

from .models import User, ParentalControl


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'is_active', 'date_joined')
    search_fields = ('username', 'email')


@admin.register(ParentalControl)
class ParentalControlAdmin(admin.ModelAdmin):
    list_display = ('guardian', 'dependent', 'is_active', 'created_at')
