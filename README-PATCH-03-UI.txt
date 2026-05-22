Patch 03 - Telas administrativas

Aplicar dentro de:
C:\Projetoswpp\whaticket-community

Comando:
powershell -ExecutionPolicy Bypass -File .\apply-custom-patch-03-ui.ps1

Este patch cria:
- backend CustomAdminController
- backend customAdminRoutes
- frontend página CustomSettings
- rota /custom-settings
- item de menu "Configurações avançadas"

Abas criadas:
- Categorias
- Motivos de encerramento
- URA - Fluxos
- URA - Opções
- IA
- Base de conhecimento
