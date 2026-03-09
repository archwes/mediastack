# 🎬 MediaStack

Stack completa e self-hosted para gerenciamento e streaming de mídia, com Docker Compose. Inclui automação de downloads, gerenciamento de legendas, requests de conteúdo e um dashboard personalizado.

## 📦 Serviços

| Serviço | Porta | Descrição |
|---|---|---|
| **Jellyfin** | `8096` | Media server (streaming de filmes e séries) |
| **Jellyseerr** | `5055` | Interface para solicitar filmes e séries |
| **Sonarr** | `8989` | Gerenciador automático de séries |
| **Radarr** | `7878` | Gerenciador automático de filmes |
| **Prowlarr** | `9696` | Gerenciador de indexadores (trackers) |
| **Bazarr** | `6767` | Gerenciador automático de legendas |
| **qBittorrent** | `8080` | Cliente de download torrent |
| **FlareSolverr** | `8191` | Proxy para bypass de Cloudflare |
| **Navidrome** | `4533` | Servidor de música (API Subsonic) |
| **Lidarr** | `8686` | Gerenciador automático de música |
| **Dashboard** | `3000` | Painel de controle da stack |

## 🖥️ Pré-requisitos

- **Docker** (v20.10+)
- **Docker Compose** (v2.0+)
- **Git**

---

## 🐧 Instalação no Linux

### 1. Instalar Docker e Docker Compose

**Ubuntu / Debian:**

```bash
# Atualizar pacotes
sudo apt update && sudo apt upgrade -y

# Instalar dependências
sudo apt install -y ca-certificates curl gnupg

# Adicionar chave GPG do Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Adicionar repositório
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Adicionar seu usuário ao grupo docker (evita usar sudo)
sudo usermod -aG docker $USER
newgrp docker
```

**Fedora:**

```bash
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl start docker && sudo systemctl enable docker
sudo usermod -aG docker $USER
newgrp docker
```

**Arch Linux:**

```bash
sudo pacman -S docker docker-compose
sudo systemctl start docker && sudo systemctl enable docker
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clonar o repositório

```bash
git clone https://github.com/archwes/mediastack.git
cd mediastack
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
nano .env
```

Edite o arquivo `.env` com suas preferências:

```env
PUID=1000            # ID do seu usuário (execute: id -u)
PGID=1000            # ID do seu grupo (execute: id -g)
TZ=America/Sao_Paulo # Seu fuso horário

CONFIG_DIR=./config
MEDIA_DIR=./media

DASHBOARD_USER=admin
DASHBOARD_PASSWORD=sua_senha_segura
```

### 4. Criar diretórios de mídia

```bash
mkdir -p media/{movies,tv,music,downloads/{complete,incomplete}}
```

### 5. Subir a stack

```bash
docker compose up -d
```

### 6. Verificar se tudo está rodando

```bash
docker compose ps
```

---

## 🪟 Instalação no Windows

### 1. Instalar Docker Desktop

1. Baixe o [Docker Desktop para Windows](https://www.docker.com/products/docker-desktop/)
2. Execute o instalador e siga as instruções
3. Durante a instalação, ative o **WSL 2** quando solicitado
4. Reinicie o computador se necessário
5. Abra o Docker Desktop e aguarde ele iniciar

> **Nota:** Certifique-se de que a virtualização (VT-x/AMD-V) está habilitada na BIOS.

### 2. Instalar Git

1. Baixe o [Git para Windows](https://git-scm.com/download/win)
2. Instale com as opções padrão

### 3. Clonar o repositório

Abra o **PowerShell** ou **Git Bash**:

```powershell
git clone https://github.com/archwes/mediastack.git
cd mediastack
```

### 4. Configurar variáveis de ambiente

```powershell
copy .env.example .env
```

Abra o arquivo `.env` com um editor de texto (Notepad, VS Code, etc.) e configure:

```env
PUID=1000
PGID=1000
TZ=America/Sao_Paulo

CONFIG_DIR=./config
MEDIA_DIR=./media

DASHBOARD_USER=admin
DASHBOARD_PASSWORD=sua_senha_segura
```

### 5. Criar diretórios de mídia

```powershell
mkdir media\movies, media\tv, media\music, media\downloads\complete, media\downloads\incomplete
```

### 6. Subir a stack

```powershell
docker compose up -d
```

### 7. Verificar se tudo está rodando

```powershell
docker compose ps
```

---

## 🌐 Acessando os serviços

Após a stack estar rodando, acesse pelo navegador:

| Serviço | URL |
|---|---|
| Dashboard | http://localhost:3000 |
| Jellyfin | http://localhost:8096 |
| Jellyseerr | http://localhost:5055 |
| Sonarr | http://localhost:8989 |
| Radarr | http://localhost:7878 |
| Prowlarr | http://localhost:9696 |
| Bazarr | http://localhost:6767 |
| qBittorrent | http://localhost:8080 |
| FlareSolverr | http://localhost:8191 |
| Navidrome | http://localhost:4533 |
| Lidarr | http://localhost:8686 |

## ⚙️ Configuração inicial dos serviços

### Ordem recomendada de configuração:

1. **qBittorrent** — Configure o diretório de download para `/downloads`
2. **Prowlarr** — Adicione seus indexadores (trackers)
3. **Sonarr** — Configure o perfil de qualidade e conecte ao Prowlarr e qBittorrent
4. **Radarr** — Mesma configuração do Sonarr para filmes
5. **Bazarr** — Conecte ao Sonarr/Radarr e configure provedores de legendas
6. **Jellyfin** — Configure suas bibliotecas apontando para `/data/movies` e `/data/tv`
7. **Jellyfin** — Configure suas bibliotecas apontando para `/data/movies`, `/data/tv` e `/data/music`
8. **Jellyseerr** — Conecte ao Jellyfin, Sonarr e Radarr
9. **Lidarr** — Conecte ao Prowlarr e qBittorrent, configure pasta raiz como `/data/music`
10. **Navidrome** — Acesse http://localhost:4533 e crie sua conta de admin

## � Configuração de Música (Navidrome + Lidarr)

A stack inclui um sistema completo e automatizado para música:

### Fluxo automatizado
1. **Lidarr** gerencia sua biblioteca de música — adicione artistas e álbuns desejados
2. **Lidarr** busca e baixa via **qBittorrent** usando indexadores do **Prowlarr**
3. Arquivos são organizados automaticamente em `/media/music/Artista/Álbum/`
4. **Navidrome** detecta novos arquivos e atualiza a biblioteca automaticamente
5. **Amperfy** (iOS) conecta ao Navidrome via API Subsonic para streaming

### Configuração do Lidarr
1. Acesse http://localhost:8686
2. **Settings → Media Management** → Root Folder: `/data/music`
3. **Settings → Download Clients** → Adicione qBittorrent (host: `qbittorrent`, porta: `8080`)
4. **Settings → Profiles** → Configure qualidade preferida (ex: FLAC, 320kbps MP3)
5. O Prowlarr sincroniza os indexadores automaticamente

### Configuração do Navidrome
1. Acesse http://localhost:4533
2. Crie sua conta de administrador no primeiro acesso
3. A biblioteca já está apontando para `/music` (mapeado de `./media/music`)
4. Scan automático a cada 1 minuto (`ND_SCANSCHEDULE=1m`)
5. Transcodificação habilitada para streaming otimizado no celular

### Configuração do Amperfy (iOS)
1. Instale o **Amperfy** na App Store (gratuito, open source)
2. Abra o app → **Add Server**
3. Preencha:
   - **Server URL:** `http://SEU_IP:4533`
   - **Username:** seu usuário do Navidrome
   - **Password:** sua senha do Navidrome
   - **API Type:** Subsonic
4. Recursos disponíveis:
   - Download offline para ouvir sem internet
   - Suporte a CarPlay
   - Playlists e favoritos sincronizados
   - Cache inteligente de músicas

> **Dica:** Para acesso fora de casa, configure um reverse proxy (Caddy/Nginx) ou use Tailscale/WireGuard.

## �🌐 Configuração de Idiomas

A stack vem com dois perfis de idioma separados:

### Filmes e Séries (perfis regulares)
| Idioma | Prioridade (score) |
|---|---|
| Português (Brasil) | 150 |
| English | 50 |

### Anime (perfil "Anime HD-1080p")
| Idioma | Prioridade (score) |
|---|---|
| Português (Brasil) | 150 |
| Japanese | 100 |
| English | 50 |

### Como usar:
- Ao adicionar séries/filmes **normais** no Sonarr/Radarr, use qualquer perfil regular (ex: `HD-1080p`)
- Ao adicionar **anime**, selecione o perfil **`Anime HD-1080p`**
- O Bazarr busca legendas automaticamente em **PT-BR** (prioridade) e **EN** (fallback)
- O Jellyfin exibe metadados (títulos, sinopses) em **português**

### Configuração nos serviços:
- **Sonarr/Radarr**: Custom Formats com scores de idioma aplicados em todos os Quality Profiles
- **Bazarr**: Profile "PT-BR + EN" como padrão, provedores OpenSubtitles, Legendas.net, SubDL e Podnapisi ativos
- **Jellyfin**: Idioma de metadados `pt`, país `BR`, interface `pt-BR`

## 🔧 Comandos úteis

```bash
# Parar todos os serviços
docker compose down

# Ver logs de um serviço específico
docker compose logs -f jellyfin

# Reiniciar um serviço
docker compose restart sonarr

# Atualizar todas as imagens
docker compose pull && docker compose up -d

# Ver uso de recursos
docker stats
```

## 📁 Estrutura do projeto

```
mediastack/
├── docker-compose.yml    # Definição de todos os serviços
├── .env                  # Variáveis de ambiente (não versionado)
├── dashboard/            # Dashboard customizado (Node.js)
│   ├── Dockerfile
│   ├── server.js
│   └── public/
├── config/               # Configurações dos serviços (não versionado)
│   ├── jellyfin/
│   ├── sonarr/
│   ├── radarr/
│   ├── prowlarr/
│   ├── bazarr/
│   ├── qbittorrent/
│   ├── jellyseerr/
│   ├── flaresolverr/
│   ├── navidrome/
│   └── lidarr/
└── media/                # Arquivos de mídia (não versionado)
    ├── movies/
    ├── tv/
    ├── music/
    └── downloads/
```

## 📄 Licença

Este projeto é de uso pessoal. Sinta-se livre para fazer fork e adaptar.
