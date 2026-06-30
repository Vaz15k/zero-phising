from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    CustomURLRule,
    DefaultBlockList,
    DefaultBlockListDomain,
    FamilyInvitation,
    FamilyMember,
    FamilyURLRule,
    User,
)


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


class URLRuleAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='rules-admin',
            email='rules@example.com',
            password='password123',
        )
        token = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

    def test_personal_rule_can_be_deleted(self):
        rule = CustomURLRule.objects.create(
            user=self.user,
            url_pattern='blocked.example',
            rule_type='blacklist',
        )

        response = self.client.delete(reverse('url-rules-detail', args=[rule.id]))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CustomURLRule.objects.filter(pk=rule.id).exists())

    def test_duplicate_personal_rule_returns_validation_error(self):
        payload = {'url_pattern': 'blocked.example', 'rule_type': 'blacklist'}
        self.client.post(reverse('url-rules-list'), payload, format='json')

        response = self.client.post(reverse('url-rules-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(CustomURLRule.objects.filter(user=self.user).count(), 1)

    def test_family_whitelist_and_blacklist_rules_can_be_deleted(self):
        self.client.post(reverse('family'), {'name': 'Casa'}, format='json')

        for rule_type in ('whitelist', 'blacklist'):
            create_response = self.client.post(
                reverse('family-rules'),
                {
                    'url_pattern': f'{rule_type}.example',
                    'rule_type': rule_type,
                },
                format='json',
            )
            self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

            delete_response = self.client.delete(
                reverse('family-rule-detail', args=[create_response.data['id']]),
            )
            self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

        self.assertFalse(FamilyURLRule.objects.exists())

    def test_duplicate_family_rule_returns_validation_error(self):
        self.client.post(reverse('family'), {'name': 'Casa'}, format='json')
        payload = {'url_pattern': 'blocked.example', 'rule_type': 'blacklist'}
        self.client.post(reverse('family-rules'), payload, format='json')

        response = self.client.post(reverse('family-rules'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(FamilyURLRule.objects.count(), 1)


class BlockListAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='block-list-user',
            email='block-list@example.com',
            password='password123',
        )
        token = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')
        self.block_list = DefaultBlockList.objects.create(
            name='Redes sociais',
            category='social_media',
        )
        DefaultBlockListDomain.objects.create(
            block_list=self.block_list,
            domain='social.example',
        )

    def test_activation_and_deactivation_change_active_domains_immediately(self):
        active_domains_url = reverse('active-block-domains')

        activate_response = self.client.post(
            reverse('block-lists-activate', args=[self.block_list.id]),
        )
        domains_after_activation = self.client.get(active_domains_url)
        deactivate_response = self.client.post(
            reverse('block-lists-deactivate', args=[self.block_list.id]),
        )
        domains_after_deactivation = self.client.get(active_domains_url)

        self.assertEqual(activate_response.status_code, status.HTTP_200_OK)
        self.assertEqual(domains_after_activation.data['domains'], ['social.example'])
        self.assertEqual(deactivate_response.status_code, status.HTTP_200_OK)
        self.assertEqual(domains_after_deactivation.data['domains'], [])
