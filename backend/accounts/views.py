from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    User,
    ParentalControl,
    CustomURLRule,
    DefaultBlockList,
    DefaultBlockListDomain,
    UserBlockListActivation,
    BlockedAccess,
    Family,
    FamilyMember,
    FamilyInvitation,
    FamilyNotification,
    FamilyURLRule,
)
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
    FamilySerializer,
    FamilyMemberSerializer,
    FamilyInvitationSerializer,
    FamilyNotificationSerializer,
    FamilyURLRuleSerializer,
)


def get_active_family(user):
    membership = FamilyMember.objects.select_related('family').filter(
        user=user,
        is_active=True,
    ).first()
    return membership.family if membership else None


def get_active_membership(user):
    return FamilyMember.objects.select_related('family').filter(
        user=user,
        is_active=True,
    ).first()


def user_is_family_admin(user, family):
    return FamilyMember.objects.filter(
        user=user,
        family=family,
        role='admin',
        is_active=True,
    ).exists()


class CustomURLRuleListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomURLRuleSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return CustomURLRule.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        personal_rules = CustomURLRuleSerializer(self.get_queryset(), many=True).data
        family = get_active_family(request.user)
        family_rules = []
        if family:
            family_rules = FamilyURLRuleSerializer(family.rules.all(), many=True).data
        return Response([*personal_rules, *family_rules])

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
    permission_classes = (permissions.IsAuthenticated,)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class FamilyView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        family = get_active_family(request.user)
        return Response({
            'family': FamilySerializer(family, context={'request': request}).data if family else None,
        })

    @transaction.atomic
    def post(self, request):
        if get_active_family(request.user):
            return Response({'error': 'Você já participa de uma família.'}, status=status.HTTP_400_BAD_REQUEST)

        name = str(request.data.get('name', '')).strip()
        if not name:
            return Response({'error': 'Informe o nome da família.'}, status=status.HTTP_400_BAD_REQUEST)

        family = Family.objects.create(name=name, owner=request.user)
        FamilyMember.objects.create(family=family, user=request.user, role='admin')
        return Response({
            'family': FamilySerializer(family, context={'request': request}).data,
        }, status=status.HTTP_201_CREATED)


class FamilyInvitationListCreateView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        sent = FamilyInvitation.objects.filter(invited_by=request.user).select_related(
            'family',
            'invited_user',
            'invited_by',
        ).order_by('-created_at')
        received = FamilyInvitation.objects.filter(
            invited_user=request.user,
            status='pending',
        ).select_related('family', 'invited_user', 'invited_by').order_by('-created_at')

        return Response({
            'sent': FamilyInvitationSerializer(sent, many=True).data,
            'received': FamilyInvitationSerializer(received, many=True).data,
        })

    @transaction.atomic
    def post(self, request):
        membership = get_active_membership(request.user)
        if not membership:
            return Response({'error': 'Crie uma família antes de convidar membros.'}, status=status.HTTP_400_BAD_REQUEST)
        if membership.role != 'admin':
            return Response({'error': 'Apenas administradores podem convidar membros.'}, status=status.HTTP_403_FORBIDDEN)

        identifier = str(request.data.get('identifier', '')).strip()
        if not identifier:
            return Response({'error': 'Informe o email ou nome de usuário do membro.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            invited_user = User.objects.get(Q(username__iexact=identifier) | Q(email__iexact=identifier))
        except User.DoesNotExist:
            return Response({'error': 'Usuário não encontrado. Verifique o email ou nome de usuário informado.'}, status=status.HTTP_404_NOT_FOUND)

        if invited_user == request.user:
            return Response({'error': 'Você não pode convidar a si mesmo.'}, status=status.HTTP_400_BAD_REQUEST)

        if FamilyMember.objects.filter(user=invited_user, is_active=True).exists():
            return Response({'error': 'Este usuário já participa de uma família.'}, status=status.HTTP_400_BAD_REQUEST)

        invitation = FamilyInvitation.objects.filter(
            family=membership.family,
            invited_user=invited_user,
            status='pending',
        ).first()
        if invitation:
            return Response({'error': 'Já existe um convite pendente para este usuário.'}, status=status.HTTP_400_BAD_REQUEST)

        invitation = FamilyInvitation.objects.create(
            family=membership.family,
            invited_user=invited_user,
            invited_by=request.user,
            email=invited_user.email or '',
        )
        FamilyNotification.objects.create(
            user=invited_user,
            family=membership.family,
            invitation=invitation,
            message=f'{request.user.username} convidou você para a família {membership.family.name}.',
        )
        return Response(FamilyInvitationSerializer(invitation).data, status=status.HTTP_201_CREATED)


class FamilyInvitationActionView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @transaction.atomic
    def post(self, request, pk=None, action=None):
        try:
            invitation = FamilyInvitation.objects.select_related('family', 'invited_user', 'invited_by').get(
                pk=pk,
                invited_user=request.user,
                status='pending',
            )
        except FamilyInvitation.DoesNotExist:
            return Response({'error': 'Convite não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if action not in ('accept', 'decline'):
            return Response({'error': 'Ação de convite inválida.'}, status=status.HTTP_400_BAD_REQUEST)

        if action == 'accept':
            if get_active_family(request.user):
                return Response({'error': 'Você já participa de uma família.'}, status=status.HTTP_400_BAD_REQUEST)
            FamilyMember.objects.create(family=invitation.family, user=request.user, role='member')
            invitation.status = 'accepted'
            message = f'{request.user.username} aceitou o convite para a família {invitation.family.name}.'
        else:
            invitation.status = 'declined'
            message = f'{request.user.username} recusou o convite para a família {invitation.family.name}.'

        invitation.responded_at = timezone.now()
        invitation.save(update_fields=['status', 'responded_at'])
        FamilyNotification.objects.create(
            user=invitation.invited_by,
            family=invitation.family,
            invitation=invitation,
            message=message,
        )
        return Response(FamilyInvitationSerializer(invitation).data)


class FamilyInvitationCancelView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def delete(self, request, pk=None):
        try:
            invitation = FamilyInvitation.objects.get(pk=pk, invited_by=request.user, status='pending')
        except FamilyInvitation.DoesNotExist:
            return Response({'error': 'Convite não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        invitation.status = 'cancelled'
        invitation.responded_at = timezone.now()
        invitation.save(update_fields=['status', 'responded_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class FamilyMemberDetailView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def patch(self, request, pk=None):
        try:
            member = FamilyMember.objects.select_related('family', 'user').get(pk=pk, is_active=True)
        except FamilyMember.DoesNotExist:
            return Response({'error': 'Membro não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if not user_is_family_admin(request.user, member.family):
            return Response({'error': 'Apenas administradores podem alterar membros.'}, status=status.HTTP_403_FORBIDDEN)

        role = request.data.get('role')
        if role not in ('admin', 'member'):
            return Response({'error': 'Perfil de membro inválido.'}, status=status.HTTP_400_BAD_REQUEST)
        if member.user == request.user:
            return Response({'error': 'Você não pode alterar seu próprio perfil.'}, status=status.HTTP_400_BAD_REQUEST)

        member.role = role
        member.save(update_fields=['role'])
        return Response(FamilyMemberSerializer(member).data)

    def delete(self, request, pk=None):
        try:
            member = FamilyMember.objects.select_related('family', 'user').get(pk=pk, is_active=True)
        except FamilyMember.DoesNotExist:
            return Response({'error': 'Membro não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if not user_is_family_admin(request.user, member.family):
            return Response({'error': 'Apenas administradores podem remover membros.'}, status=status.HTTP_403_FORBIDDEN)
        if member.user == request.user:
            return Response({'error': 'Você não pode remover a si mesmo.'}, status=status.HTTP_400_BAD_REQUEST)

        member.is_active = False
        member.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class FamilyNotificationListView(generics.ListAPIView):
    serializer_class = FamilyNotificationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return FamilyNotification.objects.filter(user=self.request.user)


class FamilyNotificationReadView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, pk=None):
        try:
            notification = FamilyNotification.objects.get(pk=pk, user=request.user)
        except FamilyNotification.DoesNotExist:
            return Response({'error': 'Notificação não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response(FamilyNotificationSerializer(notification).data)


class FamilyURLRuleListCreateView(generics.CreateAPIView):
    serializer_class = FamilyURLRuleSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def perform_create(self, serializer):
        membership = get_active_membership(self.request.user)
        if not membership:
            raise serializers.ValidationError({'error': 'Crie uma família antes de adicionar regras.'})
        if membership.role != 'admin':
            raise serializers.ValidationError({'error': 'Apenas administradores podem adicionar regras da família.'})
        serializer.save(family=membership.family)


class FamilyURLRuleDetailView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def delete(self, request, pk=None):
        membership = get_active_membership(request.user)
        if not membership:
            return Response({'error': 'Família não encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if membership.role != 'admin':
            return Response({'error': 'Apenas administradores podem remover regras da família.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            rule = FamilyURLRule.objects.get(pk=pk, family=membership.family)
        except FamilyURLRule.DoesNotExist:
            return Response({'error': 'Regra não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        rule.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
