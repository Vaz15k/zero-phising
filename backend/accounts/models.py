from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    pin = models.CharField(max_length=6, blank=True, null=True)

    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to.',
        related_name='accounts_user_set',
        related_query_name='user',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name='accounts_user_set',
        related_query_name='user',
    )

    class Meta:
        verbose_name = 'user'
        verbose_name_plural = 'users'

    def __str__(self):
        return self.email or self.username


class ParentalControl(models.Model):
    guardian = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='wards'
    )
    dependent = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='guardians'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('guardian', 'dependent')
        verbose_name = 'controle parental'
        verbose_name_plural = 'controles parentais'

    def __str__(self):
        return f'{self.guardian} -> {self.dependent}'


class CustomURLRule(models.Model):
    RULE_CHOICES = (
        ('whitelist', 'Whitelist'),
        ('blacklist', 'Blacklist'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='url_rules')
    url_pattern = models.CharField(max_length=255)
    rule_type = models.CharField(max_length=10, choices=RULE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'url_pattern')
        verbose_name = 'Regra de URL Personalizada'
        verbose_name_plural = 'Regras de URL Personalizadas'

    def __str__(self):
        return f"{self.user} - {self.rule_type} - {self.url_pattern}"
