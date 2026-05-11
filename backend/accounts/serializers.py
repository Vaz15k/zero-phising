from rest_framework import serializers

from .models import User, ParentalControl


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
