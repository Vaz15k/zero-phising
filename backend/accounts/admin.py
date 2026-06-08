from django.contrib import admin

from .models import User, ParentalControl, DefaultBlockList, DefaultBlockListDomain, UserBlockListActivation


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'is_active', 'date_joined')
    search_fields = ('username', 'email')


@admin.register(ParentalControl)
class ParentalControlAdmin(admin.ModelAdmin):
    list_display = ('guardian', 'dependent', 'is_active', 'created_at')


@admin.register(DefaultBlockList)
class DefaultBlockListAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'domain_count', 'created_at')
    search_fields = ('name', 'category')

    def domain_count(self, obj):
        return obj.domains.count()
    domain_count.short_description = 'Domínios'


@admin.register(DefaultBlockListDomain)
class DefaultBlockListDomainAdmin(admin.ModelAdmin):
    list_display = ('domain', 'block_list', 'created_at')
    search_fields = ('domain',)
    list_filter = ('block_list__category',)


@admin.register(UserBlockListActivation)
class UserBlockListActivationAdmin(admin.ModelAdmin):
    list_display = ('user', 'block_list', 'is_active', 'created_at')
    list_filter = ('block_list__category', 'is_active')
    search_fields = ('user__username', 'block_list__name')
