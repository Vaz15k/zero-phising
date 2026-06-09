# Generated manually after restoring family group models.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_default_block_lists'),
    ]

    operations = [
        migrations.CreateModel(
            name='Family',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='owned_families', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'accounts_familygroup',
                'verbose_name': 'família',
                'verbose_name_plural': 'famílias',
            },
        ),
        migrations.CreateModel(
            name='FamilyInvitation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(max_length=254)),
                ('status', models.CharField(choices=[('pending', 'Pendente'), ('accepted', 'Aceito'), ('declined', 'Recusado'), ('cancelled', 'Cancelado')], default='pending', max_length=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('responded_at', models.DateTimeField(blank=True, null=True)),
                ('family', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='invitations', to='accounts.family')),
                ('invited_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sent_family_invitations', to=settings.AUTH_USER_MODEL)),
                ('invited_user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='family_invitations', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'convite de família',
                'verbose_name_plural': 'convites de família',
            },
        ),
        migrations.CreateModel(
            name='FamilyMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(choices=[('admin', 'Administrador'), ('member', 'Membro')], default='member', max_length=10)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('family', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='members', to='accounts.family')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='family_memberships', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'accounts_familymembership',
                'verbose_name': 'membro da família',
                'verbose_name_plural': 'membros da família',
                'unique_together': {('family', 'user')},
            },
        ),
        migrations.CreateModel(
            name='FamilyNotification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('message', models.CharField(max_length=255)),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('family', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='accounts.family')),
                ('invitation', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='accounts.familyinvitation')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='family_notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'notificação de família',
                'verbose_name_plural': 'notificações de família',
                'ordering': ('-created_at',),
            },
        ),
        migrations.CreateModel(
            name='FamilyURLRule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('url_pattern', models.CharField(max_length=255)),
                ('rule_type', models.CharField(choices=[('whitelist', 'Whitelist'), ('blacklist', 'Blacklist')], max_length=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('family', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='rules', to='accounts.family')),
            ],
            options={
                'verbose_name': 'regra de URL da família',
                'verbose_name_plural': 'regras de URL da família',
                'unique_together': {('family', 'url_pattern')},
            },
        ),
    ]
