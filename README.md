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
git clone https://github.com/SEU_USUARIO/mediastack.git
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
mkdir -p media/{movies,tv,downloads/{complete,incomplete}}
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
git clone https://github.com/SEU_USUARIO/mediastack.git
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
mkdir media\movies, media\tv, media\downloads\complete, media\downloads\incomplete
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

## ⚙️ Configuração inicial dos serviços

### Ordem recomendada de configuração:

1. **qBittorrent** — Configure o diretório de download para `/downloads`
2. **Prowlarr** — Adicione seus indexadores (trackers)
3. **Sonarr** — Configure o perfil de qualidade e conecte ao Prowlarr e qBittorrent
4. **Radarr** — Mesma configuração do Sonarr para filmes
5. **Bazarr** — Conecte ao Sonarr/Radarr e configure provedores de legendas
6. **Jellyfin** — Configure suas bibliotecas apontando para `/data/movies` e `/data/tv`
7. **Jellyseerr** — Conecte ao Jellyfin, Sonarr e Radarr

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
│   └── flaresolverr/
└── media/                # Arquivos de mídia (não versionado)
    ├── movies/
    ├── tv/
    └── downloads/
```

## 📄 Licença

Este projeto é de uso pessoal. Sinta-se livre para fazer fork e adaptar.
