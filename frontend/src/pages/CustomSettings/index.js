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
          <Typography variant="h5">Configuracoes avancadas</Typography>
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
                <TableCell align="right">Acoes</TableCell>
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
