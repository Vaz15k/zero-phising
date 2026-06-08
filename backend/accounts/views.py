from django.db.models import Q
from django.utils import timezone

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, ParentalControl, CustomURLRule, DefaultBlockList, DefaultBlockListDomain, UserBlockListActivation, BlockedAccess
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    UserUpdateSerializer,
    LoginSerializer,
    PinLoginSerializer,
    ParentalControlSerializer,
    CustomURLRuleSerializer,
    DefaultBlockListSerializer,
    BlockedAccessSerializer,
)


class CustomURLRuleListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomURLRuleSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return CustomURLRule.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CustomURLRuleDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = CustomURLRuleSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return CustomURLRule.objects.filter(user=self.request.user)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            identifier = serializer.validated_data['username']
            user = User.objects.get(Q(username__iexact=identifier) | Q(email__iexact=identifier))
        except User.DoesNotExist:
            return Response({'error': 'Credenciais inválidas.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.check_password(serializer.validated_data['password']):
            return Response({'error': 'Credenciais inválidas.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({'error': 'Usuário inativo.'}, status=status.HTTP_401_UNAUTHORIZED)

        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])

        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })


class PinLoginView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = PinLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            identifier = serializer.validated_data['username']
            user = User.objects.get(Q(username__iexact=identifier) | Q(email__iexact=identifier))
        except User.DoesNotExist:
            return Response({'error': 'Credenciais inválidas.'}, status=status.HTTP_401_UNAUTHORIZED)

        if user.pin != serializer.validated_data['pin']:
            return Response({'error': 'PIN inválido.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({'error': 'Usuário inativo.'}, status=status.HTTP_401_UNAUTHORIZED)

        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])

        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })


class ProfileView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserUpdateSerializer

    def get_object(self):
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = UserSerializer(instance)
        return Response(serializer.data)


class ParentalControlListCreateView(generics.ListCreateAPIView):
    serializer_class = ParentalControlSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return ParentalControl.objects.filter(guardian=self.request.user)

    def perform_create(self, serializer):
        serializer.save(guardian=self.request.user)


class ParentalControlDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = ParentalControlSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return ParentalControl.objects.filter(guardian=self.request.user)


class BlockListListView(generics.ListAPIView):
    serializer_class = DefaultBlockListSerializer
    permission_classes = (permissions.IsAuthenticated,)
    queryset = DefaultBlockList.objects.all()


class BlockListActivateView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, pk=None):
        try:
            block_list = DefaultBlockList.objects.get(pk=pk)
        except DefaultBlockList.DoesNotExist:
            return Response({'error': 'Lista não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        activation, created = UserBlockListActivation.objects.update_or_create(
            user=request.user,
            block_list=block_list,
            defaults={'is_active': True},
        )
        return Response({
            'id': activation.id,
            'block_list_id': block_list.id,
            'block_list_name': block_list.name,
            'is_active': activation.is_active,
            'message': f'Lista "{block_list.name}" ativada com sucesso.',
        })


class BlockListDeactivateView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, pk=None):
        try:
            block_list = DefaultBlockList.objects.get(pk=pk)
        except DefaultBlockList.DoesNotExist:
            return Response({'error': 'Lista não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        UserBlockListActivation.objects.filter(
            user=request.user,
            block_list=block_list,
        ).update(is_active=False)

        return Response({
            'message': f'Lista "{block_list.name}" desativada com sucesso.',
        })


class ActiveBlockDomainsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        activated_lists = UserBlockListActivation.objects.filter(
            user=request.user,
            is_active=True,
        ).values_list('block_list_id', flat=True)

        domains = DefaultBlockListDomain.objects.filter(
            block_list_id__in=activated_lists,
        ).values_list('domain', flat=True)

        return Response({'domains': list(domains)})


class BlockedAccessHistoryView(generics.ListAPIView):
    serializer_class = BlockedAccessSerializer
    permission_classes = (permissions.IsAdminUser,)

    def get_queryset(self):
        queryset = BlockedAccess.objects.all()
        source = self.request.query_params.get('source', None)
        
        if source:
            queryset = queryset.filter(block_source__iexact=source)
            
        return queryset
    
class ReportBlockView(generics.CreateAPIView):
    serializer_class = BlockedAccessSerializer
    permission_classes = (permissions.IsAuthenticated,) # Qualquer usuário logado pode relatar

    def perform_create(self, serializer):
        # Salva automaticamente o usuário logado como o dono do bloqueio
        serializer.save(user=self.request.user)