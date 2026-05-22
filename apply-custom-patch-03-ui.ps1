$ErrorActionPreference = "Stop"

Write-Host "Aplicando Patch 03 - Telas administrativas customizadas" -ForegroundColor Cyan

if (!(Test-Path "docker-compose.yaml") -or !(Test-Path "backend\src") -or !(Test-Path "frontend\src")) {
  Write-Host "ERRO: Execute dentro da pasta C:\Projetoswpp\whaticket-community" -ForegroundColor Red
  exit 1
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
mkdir backups -Force | Out-Null

$backupFiles = @(
  "backend\src\routes\index.ts",
  "frontend\src\routes\index.js",
  "frontend\src\layout\MainListItems.js"
)

foreach ($f in $backupFiles) {
  if (Test-Path $f) {
    $safe = $f.Replace("\", "_").Replace("/", "_")
    Copy-Item -Force $f "backups\$safe-before-ui-patch-$stamp.bak"
  }
}

Write-Host "Criando CustomAdminController..." -ForegroundColor Yellow

$controller = @'
import { Request, Response } from "express";
import AppError from "../errors/AppError";

import TicketCategory from "../models/TicketCategory";
import ClosingReason from "../models/ClosingReason";
import UraFlow from "../models/UraFlow";
import UraOption from "../models/UraOption";
import AiSetting from "../models/AiSetting";
import KnowledgeBaseArticle from "../models/KnowledgeBaseArticle";

type AnyModel = any;

const modelMap: Record<string, AnyModel> = {
  ticketCategories: TicketCategory,
  closingReasons: ClosingReason,
  uraFlows: UraFlow,
  uraOptions: UraOption,
  aiSettings: AiSetting,
  knowledgeBaseArticles: KnowledgeBaseArticle
};

function getModel(resource: string): AnyModel {
  const model = modelMap[resource];

  if (!model) {
    throw new AppError("ERR_INVALID_CUSTOM_RESOURCE", 400);
  }

  return model;
}

function normalizeBody(resource: string, body: any): any {
  const data = { ...body };

  delete data.id;
  delete data.createdAt;
  delete data.updatedAt;

  if (resource === "ticketCategories") {
    return {
      name: data.name,
      description: data.description || null,
      active: data.active !== false
    };
  }

  if (resource === "closingReasons") {
    return {
      name: data.name,
      description: data.description || null,
      farewellMessage: data.farewellMessage || null,
      sendFarewellMessage: data.sendFarewellMessage === true || data.sendFarewellMessage === "true",
      active: data.active !== false
    };
  }

  if (resource === "uraFlows") {
    return {
      name: data.name,
      description: data.description || null,
      welcomeMessage: data.welcomeMessage || "",
      invalidOptionMessage: data.invalidOptionMessage || null,
      maxInvalidAttempts: Number(data.maxInvalidAttempts || 3),
      fallbackQueueId: data.fallbackQueueId || null,
      active: data.active !== false
    };
  }

  if (resource === "uraOptions") {
    return {
      flowId: Number(data.flowId),
      optionKey: data.optionKey,
      title: data.title,
      responseMessage: data.responseMessage || null,
      action: data.action || "SEND_MESSAGE",
      targetQueueId: data.targetQueueId || null,
      order: Number(data.order || 0),
      active: data.active !== false
    };
  }

  if (resource === "aiSettings") {
    return {
      name: data.name || "Principal",
      provider: data.provider || "openai",
      model: data.model || "gpt-4o-mini",
      apiKey: data.apiKey || null,
      systemPrompt: data.systemPrompt || null,
      temperature: data.temperature || 0.2,
      maxTokens: Number(data.maxTokens || 800),
      transferToHumanOnFailure: data.transferToHumanOnFailure !== false,
      active: data.active === true || data.active === "true"
    };
  }

  if (resource === "knowledgeBaseArticles") {
    return {
      title: data.title,
      content: data.content || "",
      tags: data.tags || null,
      active: data.active !== false
    };
  }

  return data;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { resource } = req.params;
  const model = getModel(resource);

  const rows = await model.findAll({
    order: [["id", "DESC"]]
  });

  return res.json(rows);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { resource } = req.params;
  const model = getModel(resource);
  const data = normalizeBody(resource, req.body);

  const row = await model.create(data);

  return res.status(200).json(row);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { resource, id } = req.params;
  const model = getModel(resource);
  const row = await model.findByPk(id);

  if (!row) {
    throw new AppError("ERR_CUSTOM_RESOURCE_NOT_FOUND", 404);
  }

  const data = normalizeBody(resource, req.body);
  await row.update(data);

  return res.status(200).json(row);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { resource, id } = req.params;
  const model = getModel(resource);
  const row = await model.findByPk(id);

  if (!row) {
    throw new AppError("ERR_CUSTOM_RESOURCE_NOT_FOUND", 404);
  }

  await row.destroy();

  return res.status(200).json({ message: "deleted" });
};
'@

Set-Content -Encoding UTF8 "backend\src\controllers\CustomAdminController.ts" $controller

Write-Host "Criando customAdminRoutes..." -ForegroundColor Yellow

$routes = @'
import { Router } from "express";

import isAuth from "../middleware/isAuth";
import * as CustomAdminController from "../controllers/CustomAdminController";

const customAdminRoutes = Router();

customAdminRoutes.get("/custom/:resource", isAuth, CustomAdminController.index);
customAdminRoutes.post("/custom/:resource", isAuth, CustomAdminController.store);
customAdminRoutes.put("/custom/:resource/:id", isAuth, CustomAdminController.update);
customAdminRoutes.delete("/custom/:resource/:id", isAuth, CustomAdminController.remove);

export default customAdminRoutes;
'@

Set-Content -Encoding UTF8 "backend\src\routes\customAdminRoutes.ts" $routes

$routesIndex = "backend\src\routes\index.ts"
$ri = Get-Content $routesIndex -Raw

if ($ri -notmatch 'customAdminRoutes') {
  $ri = $ri.Replace('import apiRoutes from "./apiRoutes";', 'import apiRoutes from "./apiRoutes";' + "`r`n" + 'import customAdminRoutes from "./customAdminRoutes";')
  $ri = $ri.Replace('routes.use("/api/messages", apiRoutes);', 'routes.use("/api/messages", apiRoutes);' + "`r`n" + 'routes.use(customAdminRoutes);')
}

Set-Content -Encoding UTF8 $routesIndex $ri

Write-Host "Criando tela ConfiguraÃ§Ãµes AvanÃ§adas..." -ForegroundColor Yellow

mkdir "frontend\src\pages\CustomSettings" -Force | Out-Null

$page = @'
import React, { useEffect, useState } from "react";

import {
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Switch,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@material-ui/core";

import { makeStyles } from "@material-ui/core/styles";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";

import { toast } from "react-toastify";
import api from "../../services/api";

const useStyles = makeStyles(theme => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(2),
    overflowY: "scroll",
    ...theme.scrollbarStyles
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(2)
  },
  tabs: {
    marginBottom: theme.spacing(2)
  },
  tableWrapper: {
    overflowX: "auto"
  }
}));

const resources = [
  {
    label: "Categorias",
    resource: "ticketCategories",
    title: "Categoria",
    fields: [
      { name: "name", label: "Nome", required: true },
      { name: "description", label: "DescriÃ§Ã£o", multiline: true },
      { name: "active", label: "Ativo", type: "boolean" }
    ],
    columns: ["id", "name", "description", "active"]
  },
  {
    label: "Motivos de encerramento",
    resource: "closingReasons",
    title: "Motivo de encerramento",
    fields: [
      { name: "name", label: "Nome", required: true },
      { name: "description", label: "DescriÃ§Ã£o", multiline: true },
      { name: "farewellMessage", label: "Mensagem de encerramento", multiline: true },
      { name: "sendFarewellMessage", label: "Enviar mensagem ao encerrar", type: "boolean" },
      { name: "active", label: "Ativo", type: "boolean" }
    ],
    columns: ["id", "name", "sendFarewellMessage", "active"]
  },
  {
    label: "URA - Fluxos",
    resource: "uraFlows",
    title: "Fluxo de URA",
    fields: [
      { name: "name", label: "Nome", required: true },
      { name: "description", label: "DescriÃ§Ã£o", multiline: true },
      { name: "welcomeMessage", label: "Mensagem inicial", multiline: true, required: true },
      { name: "invalidOptionMessage", label: "Mensagem opÃ§Ã£o invÃ¡lida", multiline: true },
      { name: "maxInvalidAttempts", label: "MÃ¡ximo de tentativas invÃ¡lidas", type: "number" },
      { name: "fallbackQueueId", label: "Fila fallback ID", type: "number" },
      { name: "active", label: "Ativo", type: "boolean" }
    ],
    columns: ["id", "name", "welcomeMessage", "active"]
  },
  {
    label: "URA - OpÃ§Ãµes",
    resource: "uraOptions",
    title: "OpÃ§Ã£o de URA",
    fields: [
      { name: "flowId", label: "ID do fluxo URA", type: "number", required: true },
      { name: "optionKey", label: "OpÃ§Ã£o digitada. Ex: 1", required: true },
      { name: "title", label: "TÃ­tulo", required: true },
      { name: "responseMessage", label: "Mensagem de resposta", multiline: true },
      {
        name: "action",
        label: "AÃ§Ã£o",
        type: "select",
        options: [
          { value: "SEND_MESSAGE", label: "Enviar mensagem" },
          { value: "TRANSFER_QUEUE", label: "Transferir para fila" },
          { value: "START_AI", label: "Acionar IA" },
          { value: "HUMAN", label: "Encaminhar para humano" }
        ]
      },
      { name: "targetQueueId", label: "ID da fila destino", type: "number" },
      { name: "order", label: "Ordem", type: "number" },
      { name: "active", label: "Ativo", type: "boolean" }
    ],
    columns: ["id", "flowId", "optionKey", "title", "action", "active"]
  },
  {
    label: "IA",
    resource: "aiSettings",
    title: "ConfiguraÃ§Ã£o de IA",
    fields: [
      { name: "name", label: "Nome" },
      {
        name: "provider",
        label: "Provedor",
        type: "select",
        options: [
          { value: "openai", label: "OpenAI" },
          { value: "gemini", label: "Gemini" },
          { value: "deepseek", label: "DeepSeek" }
        ]
      },
      { name: "model", label: "Modelo" },
      { name: "apiKey", label: "Chave da API" },
      { name: "systemPrompt", label: "Prompt do sistema", multiline: true },
      { name: "temperature", label: "Temperatura", type: "number" },
      { name: "maxTokens", label: "MÃ¡ximo de tokens", type: "number" },
      { name: "transferToHumanOnFailure", label: "Transferir para humano se falhar", type: "boolean" },
      { name: "active", label: "Ativo", type: "boolean" }
    ],
    columns: ["id", "name", "provider", "model", "active"]
  },
  {
    label: "Base de conhecimento",
    resource: "knowledgeBaseArticles",
    title: "Artigo da base",
    fields: [
      { name: "title", label: "TÃ­tulo", required: true },
      { name: "content", label: "ConteÃºdo", multiline: true, required: true },
      { name: "tags", label: "Tags" },
      { name: "active", label: "Ativo", type: "boolean" }
    ],
    columns: ["id", "title", "tags", "active"]
  }
];

const defaultValue = field => {
  if (field.type === "boolean") return true;
  if (field.type === "number") return "";
  if (field.name === "provider") return "openai";
  if (field.name === "model") return "gpt-4o-mini";
  if (field.name === "action") return "SEND_MESSAGE";
  return "";
};

const CustomSettings = () => {
  const classes = useStyles();

  const [tab, setTab] = useState(0);
  const [rows, setRows] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({});

  const current = resources[tab];

  const loadRows = async () => {
    try {
      const { data } = await api.get(`/custom/${current.resource}`);
      setRows(data);
    } catch (err) {
      toast.error("Erro ao carregar dados.");
    }
  };

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const openCreate = () => {
    const nextForm = {};
    current.fields.forEach(field => {
      nextForm[field.name] = defaultValue(field);
    });
    setForm(nextForm);
    setModalOpen(true);
  };

  const openEdit = row => {
    const nextForm = {};
    current.fields.forEach(field => {
      nextForm[field.name] =
        row[field.name] === null || row[field.name] === undefined
          ? defaultValue(field)
          : row[field.name];
    });
    nextForm.id = row.id;
    setForm(nextForm);
    setModalOpen(true);
  };

  const handleChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const save = async () => {
    try {
      if (form.id) {
        await api.put(`/custom/${current.resource}/${form.id}`, form);
      } else {
        await api.post(`/custom/${current.resource}`, form);
      }

      toast.success("Registro salvo.");
      setModalOpen(false);
      loadRows();
    } catch (err) {
      toast.error("Erro ao salvar.");
    }
  };

  const remove = async row => {
    if (!window.confirm("Deseja excluir este registro?")) return;

    try {
      await api.delete(`/custom/${current.resource}/${row.id}`);
      toast.success("Registro excluÃ­do.");
      loadRows();
    } catch (err) {
      toast.error("Erro ao excluir.");
    }
  };

  const renderCell = (row, col) => {
    const value = row[col];

    if (typeof value === "boolean") return value ? "Sim" : "NÃ£o";
    if (value === null || value === undefined) return "";
    if (String(value).length > 80) return String(value).slice(0, 80) + "...";

    return String(value);
  };

  return (
    <Container maxWidth={false}>
      <Paper className={classes.mainPaper}>
        <div className={classes.header}>
          <Typography variant="h5">ConfiguraÃ§Ãµes avanÃ§adas</Typography>
          <Button variant="contained" color="primary" onClick={openCreate}>
            Novo
          </Button>
        </div>

        <Tabs
          value={tab}
          indicatorColor="primary"
          textColor="primary"
          onChange={(event, value) => setTab(value)}
          className={classes.tabs}
          variant="scrollable"
          scrollButtons="auto"
        >
          {resources.map(item => (
            <Tab key={item.resource} label={item.label} />
          ))}
        </Tabs>

        <div className={classes.tableWrapper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {current.columns.map(col => (
                  <TableCell key={col}>{col}</TableCell>
                ))}
                <TableCell align="right">AÃ§Ãµes</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map(row => (
                <TableRow key={row.id}>
                  {current.columns.map(col => (
                    <TableCell key={col}>{renderCell(row, col)}</TableCell>
                  ))}
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(row)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => remove(row)}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={current.columns.length + 1}>
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Paper>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{form.id ? "Editar" : "Novo"} {current.title}</DialogTitle>

        <DialogContent>
          <Grid container spacing={2}>
            {current.fields.map(field => (
              <Grid item xs={12} sm={field.multiline ? 12 : 6} key={field.name}>
                {field.type === "boolean" ? (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!form[field.name]}
                        onChange={event => handleChange(field.name, event.target.checked)}
                        color="primary"
                      />
                    }
                    label={field.label}
                  />
                ) : field.type === "select" ? (
                  <TextField
                    select
                    fullWidth
                    margin="dense"
                    variant="outlined"
                    label={field.label}
                    value={form[field.name] || ""}
                    onChange={event => handleChange(field.name, event.target.value)}
                  >
                    {(field.options || []).map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <TextField
                    fullWidth
                    margin="dense"
                    variant="outlined"
                    label={field.label}
                    type={field.type === "number" ? "number" : "text"}
                    multiline={!!field.multiline}
                    rows={field.multiline ? 4 : 1}
                    required={!!field.required}
                    value={form[field.name] || ""}
                    onChange={event => handleChange(field.name, event.target.value)}
                  />
                )}
              </Grid>
            ))}
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setModalOpen(false)} color="secondary">
            Cancelar
          </Button>
          <Button onClick={save} color="primary" variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CustomSettings;
'@

Set-Content -Encoding UTF8 "frontend\src\pages\CustomSettings\index.js" $page

Write-Host "Registrando rota frontend..." -ForegroundColor Yellow

$routesFile = "frontend\src\routes\index.js"
$fr = Get-Content $routesFile -Raw

if ($fr -notmatch 'CustomSettings') {
  $fr = $fr.Replace('import Queues from "../pages/Queues/";', 'import Queues from "../pages/Queues/";' + "`r`n" + 'import CustomSettings from "../pages/CustomSettings/";')
}

if ($fr -notmatch 'path="/custom-settings"') {
  $fr = $fr.Replace('<Route exact path="/Queues" component={Queues} isPrivate />', '<Route exact path="/Queues" component={Queues} isPrivate />' + "`r`n" + '                <Route exact path="/custom-settings" component={CustomSettings} isPrivate />')
}

Set-Content -Encoding UTF8 $routesFile $fr

Write-Host "Registrando menu ConfiguraÃ§Ãµes avanÃ§adas..." -ForegroundColor Yellow

$menuFile = "frontend\src\layout\MainListItems.js"
$menu = Get-Content $menuFile -Raw

if ($menu -notmatch 'BuildOutlinedIcon') {
  $menu = $menu.Replace('import QuestionAnswerOutlinedIcon from "@material-ui/icons/QuestionAnswerOutlined";', 'import QuestionAnswerOutlinedIcon from "@material-ui/icons/QuestionAnswerOutlined";' + "`r`n" + 'import BuildOutlinedIcon from "@material-ui/icons/BuildOutlined";')
}

if ($menu -notmatch 'to="/custom-settings"') {
  $settingsBlock = @'
            <ListItemLink
              to="/settings"
              primary={i18n.t("mainDrawer.listItems.settings")}
              icon={<SettingsOutlinedIcon />}
            />
'@

  $newSettingsBlock = @'
            <ListItemLink
              to="/settings"
              primary={i18n.t("mainDrawer.listItems.settings")}
              icon={<SettingsOutlinedIcon />}
            />
            <ListItemLink
              to="/custom-settings"
              primary="ConfiguraÃ§Ãµes avanÃ§adas"
              icon={<BuildOutlinedIcon />}
            />
'@

  $menu = $menu.Replace($settingsBlock, $newSettingsBlock)
}

Set-Content -Encoding UTF8 $menuFile $menu

Write-Host "Rebuildando frontend e backend..." -ForegroundColor Yellow
docker compose build backend --no-cache
docker compose build frontend --no-cache
docker compose up -d

Write-Host ""
Write-Host "Patch 03 aplicado." -ForegroundColor Green
Write-Host "Abra http://localhost:3005, limpe cache com CTRL+F5 e procure no menu administrativo por: ConfiguraÃ§Ãµes avanÃ§adas."


