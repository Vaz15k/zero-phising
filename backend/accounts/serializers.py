from rest_framework import serializers

from .models import (
    User,
    ParentalControl,
    CustomURLRule,
    DefaultBlockList,
    UserBlockListActivation,
    BlockedAccess,
    Family,
    FamilyMember,
    FamilyInvitation,
    FamilyNotification,
    FamilyURLRule,
)


class CustomURLRuleSerializer(serializers.ModelSerializer):
    source = serializers.SerializerMethodField()

    class Meta:
        model = CustomURLRule
        fields = ('id', 'url_pattern', 'rule_type', 'created_at', 'source')
        read_only_fields = ('id', 'created_at')

    def get_source(self, obj):
        return 'personal'

    def validate_url_pattern(self, value):
        # Validação simples (pode ser aprimorada depois)
        if not value:
            raise serializers.ValidationError("A URL não pode ser vazia.")
        return value


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    pin = serializers.CharField(max_length=6, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'first_name', 'last_name', 'pin')

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'pin', 'is_active', 'date_joined', 'last_login')
        read_only_fields = ('id', 'is_active', 'date_joined', 'last_login')


class UserUpdateSerializer(serializers.ModelSerializer):
    pin = serializers.CharField(max_length=6, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'email', 'pin')

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()


class PinLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    pin = serializers.CharField(max_length=6)


class ParentalControlSerializer(serializers.ModelSerializer):
    guardian_username = serializers.CharField(source='guardian.username', read_only=True)
    dependent_username = serializers.CharField(source='dependent.username', read_only=True)

    class Meta:
        model = ParentalControl
        fields = ('id', 'guardian', 'dependent', 'guardian_username', 'dependent_username', 'created_at', 'is_active')
        read_only_fields = ('id', 'guardian', 'created_at')

    def validate_dependent(self, value):
        request = self.context.get('request')
        if request and request.user == value:
            raise serializers.ValidationError('Um usuário não pode ser seu próprio dependente.')
        return value


class DefaultBlockListSerializer(serializers.ModelSerializer):
    is_activated = serializers.SerializerMethodField()
    domain_count = serializers.SerializerMethodField()

    class Meta:
        model = DefaultBlockList
        fields = ('id', 'name', 'category', 'description', 'source_url',
                  'domain_count', 'is_activated', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def get_is_activated(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return UserBlockListActivation.objects.filter(
            user=request.user,
            block_list=obj,
            is_active=True,
        ).exists()

    def get_domain_count(self, obj):
        return obj.domains.count()


class ActivateBlockListSerializer(serializers.Serializer):
    block_list_id = serializers.IntegerField()

class BlockedAccessSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)

    class Meta:
        model = BlockedAccess
        fields = (
            'id',
            'url',
            'timestamp',
            'user',
            'username',
            'group',
            'group_name',
            'block_source'
        )
        read_only_fields = ('id', 'timestamp')


class FamilyURLRuleSerializer(serializers.ModelSerializer):
    source = serializers.SerializerMethodField()

    class Meta:
        model = FamilyURLRule
        fields = ('id', 'url_pattern', 'rule_type', 'created_at', 'source')
        read_only_fields = ('id', 'created_at', 'source')

    def validate_url_pattern(self, value):
        if not value:
            raise serializers.ValidationError("A URL não pode ser vazia.")
        return value

    def get_source(self, obj):
        return 'family'


class FamilyMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)

    class Meta:
        model = FamilyMember
        fields = ('id', 'user', 'username', 'email', 'first_name', 'last_name', 'role', 'created_at', 'is_active')
        read_only_fields = ('id', 'user', 'username', 'email', 'first_name', 'last_name', 'created_at', 'is_active')


class FamilySerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()
    rules = FamilyURLRuleSerializer(many=True, read_only=True)
    current_user_role = serializers.SerializerMethodField()

    class Meta:
        model = Family
        fields = ('id', 'name', 'owner', 'created_at', 'current_user_role', 'members', 'rules')
        read_only_fields = ('id', 'owner', 'created_at', 'current_user_role', 'members', 'rules')

    def get_members(self, obj):
        active_members = obj.members.filter(is_active=True)
        return FamilyMemberSerializer(active_members, many=True).data

    def get_current_user_role(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        membership = obj.members.filter(user=request.user, is_active=True).first()
        return membership.role if membership else None


class FamilyInvitationSerializer(serializers.ModelSerializer):
    family_name = serializers.CharField(source='family.name', read_only=True)
    invited_user_username = serializers.CharField(source='invited_user.username', read_only=True)
    invited_user_first_name = serializers.CharField(source='invited_user.first_name', read_only=True)
    invited_user_last_name = serializers.CharField(source='invited_user.last_name', read_only=True)
    invited_by_username = serializers.CharField(source='invited_by.username', read_only=True)
    invited_by_first_name = serializers.CharField(source='invited_by.first_name', read_only=True)
    invited_by_last_name = serializers.CharField(source='invited_by.last_name', read_only=True)

    class Meta:
        model = FamilyInvitation
        fields = (
            'id',
            'family',
            'family_name',
            'invited_user',
            'invited_user_username',
            'invited_user_first_name',
            'invited_user_last_name',
            'invited_by',
            'invited_by_username',
            'invited_by_first_name',
            'invited_by_last_name',
            'email',
            'status',
            'created_at',
            'responded_at',
        )
        read_only_fields = fields


class FamilyNotificationSerializer(serializers.ModelSerializer):
    family_name = serializers.CharField(source='family.name', read_only=True, allow_null=True)

    class Meta:
        model = FamilyNotification
        fields = ('id', 'family', 'family_name', 'invitation', 'message', 'is_read', 'created_at')
        read_only_fields = fields
