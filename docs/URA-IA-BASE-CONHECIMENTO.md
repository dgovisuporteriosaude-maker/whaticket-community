# URA + IA + Base de Conhecimento

Este patch cria a base estrutural para:

## URA
- UraFlows: fluxos de atendimento
- UraOptions: opÃ§Ãµes do fluxo
- Whatsapps.uraFlowId: conexÃ£o WhatsApp pode apontar para um fluxo

AÃ§Ãµes previstas para opÃ§Ãµes:
- SEND_MESSAGE: responder com mensagem
- TRANSFER_QUEUE: transferir para fila
- START_AI: acionar IA
- HUMAN: encaminhar para atendimento humano

## IA
- AiSettings: provedor, modelo, chave e prompt
- KnowledgeBaseArticles: base de conhecimento
- Queues.useAI e Queues.aiSettingId: fila pode usar IA

## PrÃ³ximo patch
- tela administrativa para configurar URA
- tela administrativa para configurar IA/base de conhecimento
- serviÃ§o para processar mensagem recebida pela URA
- serviÃ§o para chamar OpenAI/Gemini/DeepSeek
