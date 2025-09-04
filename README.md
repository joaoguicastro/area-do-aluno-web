# 1) entrar na VPS (se já não estiver)
ssh root@SEU_SERVIDOR

# 2) ir até a pasta do frontend
cd /srv/app/area-do-aluno-web/area-do-aluno-web

# 3) pegar as últimas mudanças
git fetch --all
git reset --hard origin/main   # troque o branch se preciso

# 4) build de produção
# use o gerenciador que você usa no projeto; se usa npm:
npm ci
npm run build                  # gera a pasta dist/

# (se usar pnpm)
# corepack enable
# pnpm i --frozen-lockfile
# pnpm build

# 5) publicar os arquivos estáticos no root do Nginx
mkdir -p /var/www/aluno.infinitycurso.com.br/html
rsync -av --delete dist/ /var/www/aluno.infinitycurso.com.br/html/

# 6) checar e recarregar o Nginx
nginx -t && systemctl reload nginx

# 7) (opcional) limpar cache do navegador/CDN
# no navegador: Ctrl+F5/hard reload, ou acesse com ?v=$(date +%s)
