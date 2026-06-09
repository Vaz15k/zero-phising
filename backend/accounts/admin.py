from django.contrib import admin

from .models import (
    User,
    ParentalControl,
    DefaultBlockList,
    DefaultBlockListDomain,
    UserBlockListActivation,
    Family,
    FamilyMember,
    FamilyInvitation,
    FamilyNotification,
    FamilyURLRule,
)


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


@admin.register(Family)
class FamilyAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'created_at')
    search_fields = ('name', 'owner__username', 'owner__email')


@admin.register(FamilyMember)
class FamilyMemberAdmin(admin.ModelAdmin):
    list_display = ('family', 'user', 'role', 'is_active', 'created_at')
    list_filter = ('role', 'is_active')
    search_fields = ('family__name', 'user__username', 'user__email')


@admin.register(FamilyInvitation)
class FamilyInvitationAdmin(admin.ModelAdmin):
    list_display = ('family', 'invited_user', 'invited_by', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('family__name', 'invited_user__username', 'invited_by__username', 'email')


@admin.register(FamilyNotification)
class FamilyNotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'family', 'message', 'is_read', 'created_at')
    list_filter = ('is_read',)
    search_fields = ('user__username', 'family__name', 'message')


@admin.register(FamilyURLRule)
class FamilyURLRuleAdmin(admin.ModelAdmin):
    list_display = ('family', 'url_pattern', 'rule_type', 'created_at')
    list_filter = ('rule_type',)
    search_fields = ('family__name', 'url_pattern')
