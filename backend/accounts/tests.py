from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import FamilyInvitation, FamilyMember, User


class FamilyInvitationAPITests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='password123',
        )
        self.invited_user = User.objects.create_user(
            username='member',
            email='member@example.com',
            password='password123',
        )
        token = RefreshToken.for_user(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

    def test_admin_can_invite_member_after_creating_family(self):
        create_response = self.client.post(reverse('family'), {'name': 'Casa'}, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        invite_response = self.client.post(
            reverse('family-invitations'),
            {'identifier': self.invited_user.email},
            format='json',
        )

        self.assertEqual(invite_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(invite_response.data['invited_user_username'], self.invited_user.username)
        self.assertTrue(FamilyInvitation.objects.filter(invited_user=self.invited_user).exists())
        self.assertTrue(FamilyMember.objects.filter(user=self.admin_user, role='admin').exists())

    def test_inviting_unknown_user_returns_clear_error(self):
        self.client.post(reverse('family'), {'name': 'Casa'}, format='json')

        response = self.client.post(
            reverse('family-invitations'),
            {'identifier': 'ninguem@example.com'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['error'],
            'Usuário não encontrado. Verifique o email ou nome de usuário informado.',
        )
