$ErrorActionPreference = "Stop"

Write-Host "Aplicando Patch 02 - Whaticket customizado" -ForegroundColor Cyan
Write-Host "Itens: ignorar status/canais/broadcast, API/socket, base de categorias/motivos, saudacao por usuario." -ForegroundColor Cyan

if (!(Test-Path "docker-compose.yaml") -or !(Test-Path "backend\src") -or !(Test-Path "frontend\src")) {
  Write-Host "ERRO: Execute dentro da pasta C:\Projetoswpp\whaticket-community" -ForegroundColor Red
  exit 1
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
mkdir backups -Force | Out-Null

$filesToBackup = @(
  "backend\src\providers\WhatsApp\Implementations\wwebjs.ts",
  "backend\src\database\index.ts",
  "frontend\src\services\api.js",
  "frontend\src\services\socket-io.js"
)

foreach ($f in $filesToBackup) {
  if (Test-Path $f) {
    $safe = $f.Replace("\", "_").Replace("/", "_")
    Copy-Item -Force $f "backups\$safe-$stamp.bak"
  }
}

# 1) IGNORAR STATUS / CANAIS / BROADCAST
$wwebjs = "backend\src\providers\WhatsApp\Implementations\wwebjs.ts"

if (Test-Path $wwebjs) {
  Write-Host "Ajustando wwebjs para ignorar status, canais/newsletter e broadcast..." -ForegroundColor Yellow
  $content = Get-Content $wwebjs -Raw

  if ($content -notmatch "function shouldIgnoreNonTicketMessage") {
    $helper = @'

function shouldIgnoreNonTicketMessage(msg: any): boolean {
  const from = String(msg?.from || "");
  const to = String(msg?.to || "");
  const author = String(msg?.author || "");
  const id = String(msg?.id?._serialized || msg?.id?.id || "");
  const raw = `${from} ${to} ${author} ${id}`.toLowerCase();

  const isStatus =
    from === "status@broadcast" ||
    to === "status@broadcast" ||
    raw.includes("status@broadcast");

  const isChannel =
    raw.includes("@newsletter") ||
    raw.includes("newsletter");

  const isBroadcast =
    from.endsWith("@broadcast") ||
    to.endsWith("@broadcast") ||
    raw.includes("@broadcast");

  return isStatus || isChannel || isBroadcast;
}

'@
    if ($content -match "export\s+async\s+function") {
      $content = $content -replace "export\s+async\s+function", ($helper + "`r`nexport async function")
    } elseif ($content -match "const\s+StartWhatsAppSession") {
      $content = $content -replace "const\s+StartWhatsAppSession", ($helper + "`r`nconst StartWhatsAppSession")
    } else {
      $content = $helper + "`r`n" + $content
    }
  }

  if ($content -notmatch "shouldIgnoreNonTicketMessage\(msg\)") {
    $patterns = @(
      'wbot\.on\("message",\s*async\s+msg\s*=>\s*\{',
      'wbot\.on\(''message'',\s*async\s+msg\s*=>\s*\{',
      'wbot\.on\("message_create",\s*async\s+msg\s*=>\s*\{',
      'wbot\.on\(''message_create'',\s*async\s+msg\s*=>\s*\{'
    )

    $inserted = $false
    foreach ($p in $patterns) {
      if ($content -match $p) {
        $content = [regex]::Replace(
          $content,
          $p,
          { param($m)
            $m.Value + "`r`n      if (shouldIgnoreNonTicketMessage(msg)) {`r`n        logger.info(`"Mensagem ignorada: status/canal/broadcast. Origem: ${msg?.from || msg?.to || msg?.id?._serialized}`");`r`n        return;`r`n      }"
          },
          1
        )
        $inserted = $true
        break
      }
    }

    if (-not $inserted) {
      Write-Host "AVISO: Não encontrei automaticamente o evento wbot.on(message). Helper criado, mas pode precisar inserir manualmente." -ForegroundColor Yellow
    }
  }

  Set-Content -Encoding UTF8 $wwebjs $content
}

# 2) GARANTIR API E SOCKET NO BACKEND
if (Test-Path "frontend\src\services\api.js") {
  Write-Host "Garantindo API frontend para http://localhost:8085..." -ForegroundColor Yellow
  $api = Get-Content "frontend\src\services\api.js" -Raw
  $api = $api -replace "baseURL:\s*getBackendUrl\(\)", 'baseURL: "http://localhost:8085"'
  $api = $api -replace "baseURL:\s*process\.env\.[A-Z0-9_]+", 'baseURL: "http://localhost:8085"'
  Set-Content -Encoding UTF8 "frontend\src\services\api.js" $api
}

if (Test-Path "frontend\src\services\socket-io.js") {
  Write-Host "Garantindo Socket.IO frontend para http://localhost:8085..." -ForegroundColor Yellow
  $sock = Get-Content "frontend\src\services\socket-io.js" -Raw
  $sock = $sock -replace "openSocket\(getBackendUrl\(\)", 'openSocket("http://localhost:8085"'
  $sock = $sock -replace "openSocket\(process\.env\.[A-Z0-9_]+\)", 'openSocket("http://localhost:8085")'
  Set-Content -Encoding UTF8 "frontend\src\services\socket-io.js" $sock
}

# 3) MIGRATIONS
Write-Host "Criando migrations customizadas..." -ForegroundColor Yellow
$migrationsDir = "backend\src\database\migrations"
mkdir $migrationsDir -Force | Out-Null

$catMigration = @'
import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("TicketCategories", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});
    await queryInterface.addColumn("Tickets", "categoryId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "TicketCategories", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    }).catch(() => {});
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "categoryId").catch(() => {});
    await queryInterface.dropTable("TicketCategories").catch(() => {});
  }
};
'@

$reasonMigration = @'
import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("ClosingReasons", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      farewellMessage: { type: DataTypes.TEXT, allowNull: true },
      sendFarewellMessage: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});
    await queryInterface.addColumn("Tickets", "closingReasonId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "ClosingReasons", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    }).catch(() => {});
    await queryInterface.addColumn("Tickets", "closingNote", {
      type: DataTypes.TEXT,
      allowNull: true
    }).catch(() => {});
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "closingReasonId").catch(() => {});
    await queryInterface.removeColumn("Tickets", "closingNote").catch(() => {});
    await queryInterface.dropTable("ClosingReasons").catch(() => {});
  }
};
'@

$userGreetingMigration = @'
import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Users", "attendanceGreeting", {
      type: DataTypes.TEXT,
      allowNull: true
    }).catch(() => {});
    await queryInterface.addColumn("QuickAnswers", "global", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }).catch(() => {});
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Users", "attendanceGreeting").catch(() => {});
    await queryInterface.removeColumn("QuickAnswers", "global").catch(() => {});
  }
};
'@

Set-Content -Encoding UTF8 "$migrationsDir\20260522150000-create-ticket-categories.ts" $catMigration
Set-Content -Encoding UTF8 "$migrationsDir\20260522150100-create-closing-reasons.ts" $reasonMigration
Set-Content -Encoding UTF8 "$migrationsDir\20260522150200-add-user-greeting-and-global-quickanswers.ts" $userGreetingMigration

# 4) MODELS
Write-Host "Criando models TicketCategory e ClosingReason..." -ForegroundColor Yellow

$ticketCategoryModel = @'
import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, AllowNull, Default, DataType
} from "sequelize-typescript";

@Table
class TicketCategory extends Model<TicketCategory> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @Column(DataType.TEXT)
  description: string;

  @Default(true)
  @Column
  active: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default TicketCategory;
'@

$closingReasonModel = @'
import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, AllowNull, Default, DataType
} from "sequelize-typescript";

@Table
class ClosingReason extends Model<ClosingReason> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @Column(DataType.TEXT)
  description: string;

  @Column(DataType.TEXT)
  farewellMessage: string;

  @Default(false)
  @Column
  sendFarewellMessage: boolean;

  @Default(true)
  @Column
  active: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ClosingReason;
'@

Set-Content -Encoding UTF8 "backend\src\models\TicketCategory.ts" $ticketCategoryModel
Set-Content -Encoding UTF8 "backend\src\models\ClosingReason.ts" $closingReasonModel

# 5) REGISTRAR MODELS NO DATABASE INDEX
$dbIndex = "backend\src\database\index.ts"
if (Test-Path $dbIndex) {
  Write-Host "Registrando models no database/index.ts..." -ForegroundColor Yellow
  $db = Get-Content $dbIndex -Raw

  if ($db -notmatch 'TicketCategory') {
    $db = $db -replace '(import .*Whatsapp.*;\r?\n)', "`$1import TicketCategory from `"../models/TicketCategory`";`r`nimport ClosingReason from `"../models/ClosingReason`";`r`n"
  }

  if ($db -match 'models:\s*\[' -and $db -notmatch 'TicketCategory,') {
    $db = $db -replace '(models:\s*\[[\s\S]*?)(\])', "`$1`r`n    TicketCategory,`r`n    ClosingReason,`r`n  `$2"
  }

  Set-Content -Encoding UTF8 $dbIndex $db
}


# --------------------------------------------------------------------
# 6) BASE DE URA + IA + BASE DE CONHECIMENTO
# --------------------------------------------------------------------
Write-Host "Criando base de URA, IA e Base de Conhecimento..." -ForegroundColor Yellow

$uraMigration = @'
import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("UraFlows", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      welcomeMessage: { type: DataTypes.TEXT, allowNull: false },
      invalidOptionMessage: { type: DataTypes.TEXT, allowNull: true },
      maxInvalidAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
      fallbackQueueId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "Queues", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await queryInterface.createTable("UraOptions", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      flowId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "UraFlows", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      optionKey: { type: DataTypes.STRING, allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      responseMessage: { type: DataTypes.TEXT, allowNull: true },
      action: { type: DataTypes.STRING, allowNull: false, defaultValue: "SEND_MESSAGE" },
      targetQueueId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "Queues", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await queryInterface.addColumn("Whatsapps", "uraFlowId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "UraFlows", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    }).catch(() => {});
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Whatsapps", "uraFlowId").catch(() => {});
    await queryInterface.dropTable("UraOptions").catch(() => {});
    await queryInterface.dropTable("UraFlows").catch(() => {});
  }
};
'@

$aiMigration = @'
import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("AiSettings", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false, defaultValue: "Principal" },
      provider: { type: DataTypes.STRING, allowNull: false, defaultValue: "openai" },
      model: { type: DataTypes.STRING, allowNull: false, defaultValue: "gpt-4o-mini" },
      apiKey: { type: DataTypes.TEXT, allowNull: true },
      systemPrompt: { type: DataTypes.TEXT, allowNull: true },
      temperature: { type: DataTypes.DECIMAL(3, 2), allowNull: false, defaultValue: 0.2 },
      maxTokens: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 800 },
      transferToHumanOnFailure: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await queryInterface.createTable("KnowledgeBaseArticles", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      content: { type: DataTypes.TEXT("long"), allowNull: false },
      tags: { type: DataTypes.STRING, allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await queryInterface.addColumn("Queues", "useAI", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }).catch(() => {});

    await queryInterface.addColumn("Queues", "aiSettingId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "AiSettings", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    }).catch(() => {});
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Queues", "aiSettingId").catch(() => {});
    await queryInterface.removeColumn("Queues", "useAI").catch(() => {});
    await queryInterface.dropTable("KnowledgeBaseArticles").catch(() => {});
    await queryInterface.dropTable("AiSettings").catch(() => {});
  }
};
'@

Set-Content -Encoding UTF8 "$migrationsDir\20260522150300-create-ura-flow.ts" $uraMigration
Set-Content -Encoding UTF8 "$migrationsDir\20260522150400-create-ai-and-knowledge-base.ts" $aiMigration

$uraFlowModel = @'
import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, AllowNull, Default, DataType, HasMany
} from "sequelize-typescript";
import UraOption from "./UraOption";

@Table
class UraFlow extends Model<UraFlow> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @Column(DataType.TEXT)
  description: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  welcomeMessage: string;

  @Column(DataType.TEXT)
  invalidOptionMessage: string;

  @Default(3)
  @Column
  maxInvalidAttempts: number;

  @Column
  fallbackQueueId: number;

  @Default(true)
  @Column
  active: boolean;

  @HasMany(() => UraOption)
  options: UraOption[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default UraFlow;
'@

$uraOptionModel = @'
import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, AllowNull, Default, DataType, ForeignKey, BelongsTo
} from "sequelize-typescript";
import UraFlow from "./UraFlow";

@Table
class UraOption extends Model<UraOption> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => UraFlow)
  @AllowNull(false)
  @Column
  flowId: number;

  @BelongsTo(() => UraFlow)
  flow: UraFlow;

  @AllowNull(false)
  @Column
  optionKey: string;

  @AllowNull(false)
  @Column
  title: string;

  @Column(DataType.TEXT)
  responseMessage: string;

  @Default("SEND_MESSAGE")
  @Column
  action: string;

  @Column
  targetQueueId: number;

  @Default(0)
  @Column
  order: number;

  @Default(true)
  @Column
  active: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default UraOption;
'@

$aiSettingModel = @'
import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, AllowNull, Default, DataType
} from "sequelize-typescript";

@Table
class AiSetting extends Model<AiSetting> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Default("Principal")
  @Column
  name: string;

  @Default("openai")
  @Column
  provider: string;

  @Default("gpt-4o-mini")
  @Column
  model: string;

  @Column(DataType.TEXT)
  apiKey: string;

  @Column(DataType.TEXT)
  systemPrompt: string;

  @Default(0.2)
  @Column(DataType.DECIMAL(3, 2))
  temperature: number;

  @Default(800)
  @Column
  maxTokens: number;

  @Default(true)
  @Column
  transferToHumanOnFailure: boolean;

  @Default(false)
  @Column
  active: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AiSetting;
'@

$kbModel = @'
import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, AllowNull, Default, DataType
} from "sequelize-typescript";

@Table
class KnowledgeBaseArticle extends Model<KnowledgeBaseArticle> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  title: string;

  @AllowNull(false)
  @Column(DataType.TEXT("long"))
  content: string;

  @Column
  tags: string;

  @Default(true)
  @Column
  active: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default KnowledgeBaseArticle;
'@

Set-Content -Encoding UTF8 "backend\src\models\UraFlow.ts" $uraFlowModel
Set-Content -Encoding UTF8 "backend\src\models\UraOption.ts" $uraOptionModel
Set-Content -Encoding UTF8 "backend\src\models\AiSetting.ts" $aiSettingModel
Set-Content -Encoding UTF8 "backend\src\models\KnowledgeBaseArticle.ts" $kbModel

# Registrar models de URA/IA no Sequelize
if (Test-Path $dbIndex) {
  $db = Get-Content $dbIndex -Raw

  if ($db -notmatch 'UraFlow') {
    $db = $db -replace '(import .*ClosingReason.*;\r?\n)', "`$1import UraFlow from `"../models/UraFlow`";`r`nimport UraOption from `"../models/UraOption`";`r`nimport AiSetting from `"../models/AiSetting`";`r`nimport KnowledgeBaseArticle from `"../models/KnowledgeBaseArticle`";`r`n"
  }

  if ($db -match 'models:\s*\[' -and $db -notmatch 'UraFlow,') {
    $db = $db -replace '(models:\s*\[[\s\S]*?)(\])', "`$1`r`n    UraFlow,`r`n    UraOption,`r`n    AiSetting,`r`n    KnowledgeBaseArticle,`r`n  `$2"
  }

  Set-Content -Encoding UTF8 $dbIndex $db
}

mkdir docs -Force | Out-Null
$aiDoc = @'
# URA + IA + Base de Conhecimento

Este patch cria a base estrutural para:

## URA
- UraFlows: fluxos de atendimento
- UraOptions: opções do fluxo
- Whatsapps.uraFlowId: conexão WhatsApp pode apontar para um fluxo

Ações previstas para opções:
- SEND_MESSAGE: responder com mensagem
- TRANSFER_QUEUE: transferir para fila
- START_AI: acionar IA
- HUMAN: encaminhar para atendimento humano

## IA
- AiSettings: provedor, modelo, chave e prompt
- KnowledgeBaseArticles: base de conhecimento
- Queues.useAI e Queues.aiSettingId: fila pode usar IA

## Próximo patch
- tela administrativa para configurar URA
- tela administrativa para configurar IA/base de conhecimento
- serviço para processar mensagem recebida pela URA
- serviço para chamar OpenAI/Gemini/DeepSeek
'@
Set-Content -Encoding UTF8 "docs\URA-IA-BASE-CONHECIMENTO.md" $aiDoc


Write-Host "Rebuildando backend/frontend. Isso pode demorar..." -ForegroundColor Yellow
docker compose down --remove-orphans
docker compose build backend --no-cache
docker compose build frontend --no-cache
docker compose up -d

Start-Sleep -Seconds 12

Write-Host "Aplicando migrations no backend..." -ForegroundColor Yellow
docker compose exec backend npx sequelize db:migrate

Write-Host "Marcando quick answers existentes como globais..." -ForegroundColor Yellow
docker compose exec mysql mariadb -uroot -pstrongpassword whaticket -e "UPDATE QuickAnswers SET global = 1 WHERE global IS NULL OR global = 0;" 2>$null

Write-Host ""
Write-Host "Patch 02 aplicado." -ForegroundColor Green
Write-Host "Teste agora: status/canais não devem abrir ticket; socket e API devem continuar funcionando."
Write-Host "Se der erro de build, mande o trecho após: > tsc"
