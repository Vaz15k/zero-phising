import re
from urllib.request import urlopen
from django.core.management.base import BaseCommand
from accounts.models import DefaultBlockList, DefaultBlockListDomain

DEFAULT_LISTS = [
    {
        'name': 'Bloqueio de Conteúdo Adulto',
        'category': 'adult',
        'description': 'Bloqueia sites com conteúdo adulto/pornográfico.',
        'source_url': 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/porn-only/hosts',
    },
    {
        'name': 'Bloqueio de Redes Sociais',
        'category': 'social_media',
        'description': 'Bloqueia redes sociais como Facebook, Instagram, TikTok, etc.',
        'source_url': 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/social-only/hosts',
    },
    {
        'name': 'Bloqueio de Fake News',
        'category': 'fakenews',
        'description': 'Bloqueia sites conhecidos por disseminar notícias falsas.',
        'source_url': 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-only/hosts',
    },
    {
        'name': 'Bloqueio de Jogos de Azar',
        'category': 'gambling',
        'description': 'Bloqueia sites de apostas e jogos de azar.',
        'source_url': 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/gambling-only/hosts',
    },
    {
        'name': 'Bloqueio de Malware',
        'category': 'malware',
        'description': 'Bloqueia sites conhecidos por distribuir malware e spyware.',
        'source_url': 'https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts',
    },
]

BATCH_SIZE = 2000


class Command(BaseCommand):
    help = 'Cria as listas de bloqueio padrão e popula com domínios das fontes configuradas.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fetch',
            action='store_true',
            help='Faz download dos domínios a partir das URLs configuradas.',
        )

    def handle(self, *args, **options):
        fetch = options['fetch']

        for list_data in DEFAULT_LISTS:
            block_list, created = DefaultBlockList.objects.update_or_create(
                category=list_data['category'],
                defaults={
                    'name': list_data['name'],
                    'description': list_data['description'],
                    'source_url': list_data['source_url'],
                },
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Lista criada: {block_list.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Lista atualizada: {block_list.name}'))

            if fetch and block_list.source_url:
                self._fetch_and_import(block_list)

        self.stdout.write(self.style.SUCCESS('Seed de listas de bloqueio concluído.'))

    def _fetch_and_import(self, block_list):
        try:
            self.stdout.write(f'  Baixando domínios de {block_list.source_url}...')
            with urlopen(block_list.source_url, timeout=60) as response:
                content = response.read().decode('utf-8')

            existing_domains = set(
                DefaultBlockListDomain.objects
                .filter(block_list=block_list)
                .values_list('domain', flat=True)
            )

            to_create = []
            total = 0
            for line in content.splitlines():
                line = line.strip()
                if not line or line.startswith('#'):
                    continue

                parts = re.split(r'\s+', line)
                if len(parts) < 2 or parts[0] != '0.0.0.0':
                    continue

                domain = parts[1].lower()
                domain = re.sub(r'#.*', '', domain).strip()
                if not domain:
                    continue

                if domain not in existing_domains:
                    to_create.append(DefaultBlockListDomain(
                        block_list=block_list,
                        domain=domain,
                    ))
                    existing_domains.add(domain)

                if len(to_create) >= BATCH_SIZE:
                    DefaultBlockListDomain.objects.bulk_create(to_create, ignore_conflicts=True)
                    total += len(to_create)
                    self.stdout.write(f'    [thread] Importados {total} domínios...')
                    to_create = []

            if to_create:
                DefaultBlockListDomain.objects.bulk_create(to_create, ignore_conflicts=True)
                total += len(to_create)

            self.stdout.write(f'    Importados {total} novos domínios (total na lista: {len(existing_domains)}).')
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'  Erro ao buscar {block_list.source_url}: {e}'))
