import React, { useEffect, useState } from "react";
import {
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  Tooltip
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import SearchIcon from "@material-ui/icons/Search";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import PauseIcon from "@material-ui/icons/Pause";
import StopIcon from "@material-ui/icons/Stop";
import EditIcon from "@material-ui/icons/Edit";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import ListAltIcon from "@material-ui/icons/ListAlt";
import ReplayIcon from "@material-ui/icons/Replay";
import SendIcon from "@material-ui/icons/Send";
import ScheduleIcon from "@material-ui/icons/Schedule";
import { toast } from "react-toastify";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import MessageTemplateField from "../../components/MessageTemplateField";

const useStyles = makeStyles(theme => ({
  root: {
    flex: 1,
    padding: theme.spacing(2),
    overflowY: "auto",
    background: theme.palette.background.default,
    ...theme.scrollbarStyles
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(2)
  },
  tabs: {
    marginBottom: theme.spacing(2),
    minHeight: 44,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  paper: {
    padding: theme.spacing(1.5),
    overflowX: "auto",
    borderRadius: 8,
    boxShadow: theme.custom?.cardShadow,
    borderColor: theme.palette.divider,
  },
  playlist: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.25),
  },
  automationCard: {
    padding: theme.spacing(1.5),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    background: theme.palette.background.paper,
    boxShadow: theme.custom?.cardShadow || "0 10px 24px rgba(15,23,42,0.06)",
  },
  automationHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing(1.5),
  },
  automationTitle: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    minWidth: 0,
  },
  automationIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#FFFFFF",
    background: theme.palette.primary.main,
    flexShrink: 0,
  },
  automationName: {
    fontWeight: 700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  automationMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.75),
    marginTop: theme.spacing(0.5),
  },
  automationStats: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(86px, 1fr))",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1.5),
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "repeat(2, 1fr)",
    },
  },
  statBox: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    padding: theme.spacing(1),
    background: theme.palette.type === "dark" ? "#111A2E" : "#F8FAFC",
  },
  statValue: {
    fontWeight: 700,
  },
  progressArea: {
    marginTop: theme.spacing(1.5),
  },
  playerActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: theme.spacing(0.25),
    flexShrink: 0,
  },
  helper: {
    marginBottom: theme.spacing(2)
  },
  tagChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.5)
  },
  contactPicker: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    padding: theme.spacing(1.25),
    background: theme.palette.type === "dark" ? "#0B1220" : "#F8FAFC",
  },
  contactPickerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(1),
    gap: theme.spacing(1)
  },
  contactList: {
    maxHeight: 220,
    overflowY: "auto",
    borderTop: `1px solid ${theme.palette.divider}`,
    marginTop: theme.spacing(1),
    ...theme.scrollbarStyles,
  },
  contactRow: {
    display: "flex",
    alignItems: "center",
    minHeight: 42,
    borderBottom: `1px solid ${theme.palette.divider}`,
    cursor: "pointer",
    borderRadius: 8,
    "&:hover": {
      background: theme.palette.type === "dark" ? "rgba(56,189,248,0.08)" : "#EFF6FF",
    },
  },
  contactInfo: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0
  },
  contactName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  contactNumber: {
    color: theme.palette.text.secondary,
    fontSize: 12
  }
}));

const initialCampaign = {
  name: "",
  message: "",
  audience: "contacts",
  recipientType: "contacts",
  intervalPattern: "30",
  pauseAfter: 20,
  pauseMinutes: 5,
  whatsappId: "",
  contactIds: [],
  tagIds: [],
  excludeTagIds: [],
  tagAppliedLastDays: ""
};

const initialSchedule = {
  contactIds: [],
  tagIds: [],
  audience: "all",
  message: "",
  scheduledAt: "",
  recurrenceType: "once",
  weekdays: [],
  times: [],
  startsAt: "",
  endsAt: "",
  repeatEvery: 1,
  repeatUnit: "hours",
  maxRuns: "",
  respectBusinessHours: false,
  missedRunPolicy: "skip",
  intervalPattern: "30",
  pauseAfter: 20,
  pauseMinutes: 5,
  whatsappId: ""
};

const weekdayOptions = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terca" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sabado" },
  { value: 0, label: "Domingo" }
];

const repeatUnitOptions = [
  { value: "minutes", label: "minutos" },
  { value: "hours", label: "horas" },
  { value: "days", label: "dias" }
];

const toDateTimeLocalValue = value => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const normalizeSearch = value =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const filterContactsByAudience = (contacts, audience) =>
  contacts.filter(contact => {
    if (audience === "contacts") return !contact.isGroup;
    if (audience === "groups") return contact.isGroup;
    return true;
  });

const contactHasAnyTag = (contact, tagIds) => {
  if (!tagIds?.length) return false;
  const selected = new Set(tagIds.map(Number));
  return (contact.tags || []).some(tag => selected.has(Number(tag.id)));
};

const ContactPicker = ({
  classes,
  contacts,
  audience,
  selectedIds,
  onChange,
  label
}) => {
  const [search, setSearch] = useState("");
  const selectedSet = new Set((selectedIds || []).map(Number));
  const searchValue = normalizeSearch(search);
  const filteredContacts = filterContactsByAudience(contacts, audience).filter(contact => {
    const searchable = normalizeSearch(`${contact.name} ${contact.number || ""}`);
    return searchable.includes(searchValue);
  });

  const toggleContact = contactId => {
    const normalizedId = Number(contactId);
    const nextSelected = selectedSet.has(normalizedId)
      ? (selectedIds || []).filter(id => Number(id) !== normalizedId)
      : [...(selectedIds || []), normalizedId];

    onChange(nextSelected);
  };

  return (
    <div className={classes.contactPicker}>
      <div className={classes.contactPickerHeader}>
        <Typography variant="subtitle2">{label}</Typography>
        {!!selectedIds?.length && (
          <Button size="small" onClick={() => onChange([])}>
            Limpar
          </Button>
        )}
      </div>
      <TextField
        fullWidth
        size="small"
        variant="outlined"
        placeholder="Buscar por nome ou numero"
        value={search}
        onChange={event => setSearch(event.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          )
        }}
      />
      {!!selectedIds?.length && (
        <div className={classes.tagChips} style={{ marginTop: 8 }}>
          {selectedIds.map(contactId => {
            const contact = contacts.find(item => Number(item.id) === Number(contactId));
            return (
              <Chip
                key={contactId}
                size="small"
                label={contact?.name || contactId}
                onDelete={() => toggleContact(contactId)}
              />
            );
          })}
        </div>
      )}
      <div className={classes.contactList}>
        {filteredContacts.map(contact => (
          <div
            key={contact.id}
            className={classes.contactRow}
            onClick={() => toggleContact(contact.id)}
            role="button"
            tabIndex={0}
          >
            <Checkbox
              color="primary"
              checked={selectedSet.has(Number(contact.id))}
              onChange={() => toggleContact(contact.id)}
              onClick={event => event.stopPropagation()}
            />
            <div className={classes.contactInfo}>
              <span className={classes.contactName}>
                {contact.name} {contact.isGroup ? "(grupo)" : ""}
              </span>
              <span className={classes.contactNumber}>{contact.number}</span>
            </div>
          </div>
        ))}
        {filteredContacts.length === 0 && (
          <Typography variant="body2" color="textSecondary" style={{ padding: 12 }}>
            Nenhum contato encontrado.
          </Typography>
        )}
      </div>
    </div>
  );
};

const CampaignsSchedules = () => {
  const classes = useStyles();
  const [tab, setTab] = useState(0);
  const [campaigns, setCampaigns] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [tags, setTags] = useState([]);
  const [whatsapps, setWhatsapps] = useState([]);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState(initialCampaign);
  const [scheduleForm, setScheduleForm] = useState(initialSchedule);
  const [campaignMedia, setCampaignMedia] = useState(null);
  const [scheduleMedia, setScheduleMedia] = useState(null);
  const [scheduleTimeInput, setScheduleTimeInput] = useState("");
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [logsTitle, setLogsTitle] = useState("");
  const [logs, setLogs] = useState([]);

  const loadData = async () => {
    try {
      const [
        { data: campaignData },
        { data: scheduleData },
        { data: contactData },
        { data: whatsappData },
        { data: tagData }
      ] = await Promise.all([
        api.get("/campaigns"),
        api.get("/scheduled-messages"),
        api.get("/contacts", { params: { all: true } }),
        api.get("/whatsapp/"),
        api.get("/tags")
      ]);

      setCampaigns(campaignData);
      setSchedules(scheduleData);
      setContacts(contactData.contacts || []);
      setWhatsapps(whatsappData || []);
      setTags(tagData || []);
    } catch (err) {
      toastError(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCampaignChange = event => {
    const { name, value } = event.target;
    setCampaignForm(prev => ({ ...prev, [name]: value }));
  };

  const handleScheduleChange = event => {
    const { name, value, type, checked } = event.target;
    if (type === "checkbox") {
      setScheduleForm(prev => ({ ...prev, [name]: checked }));
      return;
    }
    setScheduleForm(prev => ({ ...prev, [name]: value }));
  };

  const toggleScheduleWeekday = day => {
    setScheduleForm(prev => {
      const current = prev.weekdays.map(Number);
      const exists = current.includes(day);
      return {
        ...prev,
        weekdays: exists ? current.filter(item => item !== day) : [...current, day].sort()
      };
    });
  };

  const addScheduleTime = () => {
    if (!/^\d{2}:\d{2}$/.test(scheduleTimeInput)) {
      toast.error("Informe um horario valido.");
      return;
    }

    setScheduleForm(prev => {
      const currentTimes = Array.isArray(prev.times) ? prev.times : [];
      if (currentTimes.includes(scheduleTimeInput)) {
        toast.info("Este horario ja foi adicionado.");
        return prev;
      }

      return {
        ...prev,
        times: [...currentTimes, scheduleTimeInput].sort()
      };
    });
    setScheduleTimeInput("");
  };

  const removeScheduleTime = time => {
    setScheduleForm(prev => ({
      ...prev,
      times: (prev.times || []).filter(item => item !== time)
    }));
  };

  const handleCampaignAudienceChange = event => {
    const recipientType = event.target.value;
    const audience = recipientType === "groups" ? "groups" : "contacts";
    const allowedContactIds = filterContactsByAudience(contacts, audience).map(contact => Number(contact.id));

    setCampaignForm(prev => ({
      ...prev,
      recipientType,
      audience,
      contactIds: prev.contactIds.filter(contactId => allowedContactIds.includes(Number(contactId)))
    }));
  };

  const handleScheduleAudienceChange = event => {
    const audience = event.target.value;
    const allowedContactIds = filterContactsByAudience(contacts, audience).map(contact => Number(contact.id));

    setScheduleForm(prev => ({
      ...prev,
      audience,
      contactIds: prev.contactIds.filter(contactId => allowedContactIds.includes(Number(contactId)))
    }));
  };

  const renderTagValue = selected => (
    <div className={classes.tagChips}>
      {selected.map(tagId => {
        const tag = tags.find(item => item.id === tagId);
        return (
          <Chip
            key={tagId}
            size="small"
            label={tag?.name || tagId}
            style={{ backgroundColor: tag?.color || "#607d8b", color: "#fff" }}
          />
        );
      })}
    </div>
  );

  const createCampaign = async () => {
    try {
      let estimatedContacts = [];

      if (campaignForm.recipientType === "contacts" || campaignForm.recipientType === "groups") {
        estimatedContacts = contacts.filter(contact =>
          campaignForm.contactIds.map(Number).includes(Number(contact.id))
        );
      } else {
        estimatedContacts = contacts.filter(contact =>
          !contact.isGroup && contactHasAnyTag(contact, campaignForm.tagIds)
        );
      }

      const excluded = estimatedContacts.filter(contact =>
        contactHasAnyTag(contact, campaignForm.excludeTagIds)
      );
      const total = estimatedContacts.length - excluded.length;
      const confirmed = window.confirm(
        `Resumo da campanha\n\nTipo de envio: ${campaignForm.recipientType === "tags" ? "Etiquetas" : campaignForm.recipientType === "groups" ? "Grupos de WhatsApp" : "Contatos"}\nEncontrados: ${estimatedContacts.length}\nRemovidos por etiquetas de exclusao: ${excluded.length}\nTotal que recebera: ${Math.max(total, 0)}\n\nConfira o resumo antes de enviar para evitar mensagens duplicadas ou contatos indesejados.`
      );
      if (!confirmed) return;

      const payload = new FormData();
      Object.entries(campaignForm).forEach(([key, value]) => {
        payload.append(key, Array.isArray(value) ? JSON.stringify(value) : value);
      });
      if (campaignMedia) payload.append("media", campaignMedia);

      await api.post("/campaigns", payload, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Campanha iniciada.");
      setCampaignModalOpen(false);
      setCampaignForm(initialCampaign);
      setCampaignMedia(null);
      loadData();
    } catch (err) {
      toastError(err);
    }
  };

  const updateCampaignStatus = async (campaign, status) => {
    try {
      await api.put(`/campaigns/${campaign.id}`, { status });
      loadData();
    } catch (err) {
      toastError(err);
    }
  };

  const retryCampaignErrors = async campaign => {
    try {
      await api.post(`/campaigns/${campaign.id}/retry-failed`);
      toast.success("Reenvio iniciado apenas para os contatos que falharam.");
      loadData();
    } catch (err) {
      toastError(err);
    }
  };

  const duplicateCampaign = async campaign => {
    try {
      await api.post(`/campaigns/${campaign.id}/duplicate`);
      toast.success("Campanha duplicada como novo envio.");
      loadData();
    } catch (err) {
      toastError(err);
    }
  };

  const openCampaignLogs = async campaign => {
    try {
      const { data } = await api.get(`/campaigns/${campaign.id}/logs`);
      setLogsTitle(`Logs da campanha: ${campaign.name}`);
      setLogs(data || []);
      setLogsModalOpen(true);
    } catch (err) {
      toastError(err);
    }
  };

  const openScheduleLogs = async schedule => {
    try {
      const { data } = await api.get(`/scheduled-messages/${schedule.id}/executions`);
      setLogsTitle(`Execucoes do agendamento: ${schedule.contact?.name || schedule.id}`);
      setLogs(data || []);
      setLogsModalOpen(true);
    } catch (err) {
      toastError(err);
    }
  };

  const getCampaignStatusLabel = status => ({
    scheduled: "Agendado",
    running: "Em execucao",
    paused: "Parado",
    canceled: "Cancelado",
    completed: "Concluido",
    completed_with_errors: "Concluido com erros",
    failed: "Erro",
    error: "Erro",
    finished: "Concluido"
  }[status] || status);

  const getScheduleStatusLabel = status => ({
    scheduled: "Agendado",
    running: "Em execucao",
    paused: "Parado",
    canceled: "Cancelado",
    completed: "Concluido",
    sent: "Concluido",
    failed: "Erro",
    error: "Erro"
  }[status] || status);

  const getStatusColor = status => ({
    draft: "default",
    scheduled: "primary",
    running: "primary",
    paused: "secondary",
    completed: "primary",
    completed_with_errors: "secondary",
    sent: "primary",
    failed: "secondary",
    error: "secondary",
    canceled: "default",
    finished: "primary"
  }[status] || "default");

  const formatDateTime = value => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
  };

  const getScheduleRecurrenceLabel = schedule => {
    if (schedule.recurrenceType === "weekly") return "Dias e horarios";
    if (schedule.recurrenceType === "interval") {
      const unitLabel = repeatUnitOptions.find(item => item.value === schedule.repeatUnit)?.label || "horas";
      return `A cada ${schedule.repeatEvery || 1} ${unitLabel}`;
    }
    return "Unico";
  };

  const getCampaignProgress = campaign => {
    const recipients = campaign.recipients || [];
    const sent = recipients.filter(item => item.status === "sent").length;
    const failed = recipients.filter(item => ["failed", "error"].includes(item.status)).length;
    const pending = recipients.filter(item => ["pending", "sending"].includes(item.status)).length;
    return { sent, failed, pending, total: recipients.length };
  };

  const getScheduleProgress = schedule => {
    const completed = ["sent", "completed"].includes(schedule.status) ? 1 : 0;
    const failed = ["failed", "error"].includes(schedule.status) ? 1 : 0;
    const pending = completed || failed || schedule.status === "canceled" ? 0 : 1;
    return { sent: completed, failed, pending, total: 1 };
  };

  const getProgressPercent = progress => {
    if (!progress.total) return 0;
    return Math.min(100, Math.round((progress.sent / progress.total) * 100));
  };

  const buildAutomationItems = () => {
    const campaignItems = campaigns.map(campaign => {
      const progress = getCampaignProgress(campaign);
      return {
        id: `campaign-${campaign.id}`,
        source: "campaign",
        raw: campaign,
        name: campaign.name || `Campanha #${campaign.id}`,
        typeLabel: "Campanha",
        recurrenceLabel: "Envio em fila",
        status: campaign.status,
        statusLabel: getCampaignStatusLabel(campaign.status),
        nextRunAt: campaign.status === "scheduled" ? campaign.createdAt : null,
        lastRunAt: campaign.completedAt || campaign.startedAt || campaign.updatedAt,
        whatsappName: campaign.whatsapp?.name || "Padrao",
        message: campaign.message,
        progress
      };
    });

    const scheduleItems = schedules.map(schedule => {
      const progress = getScheduleProgress(schedule);
      return {
        id: `schedule-${schedule.id}`,
        source: "schedule",
        raw: schedule,
        name: schedule.contact?.name || schedule.message?.slice(0, 42) || `Agendamento #${schedule.id}`,
        typeLabel: "Agendamento",
        recurrenceLabel: getScheduleRecurrenceLabel(schedule),
        status: schedule.status,
        statusLabel: getScheduleStatusLabel(schedule.status),
        nextRunAt: schedule.nextRunAt || schedule.scheduledAt,
        lastRunAt: schedule.lastRunAt || schedule.updatedAt,
        whatsappName: schedule.whatsapp?.name || "Padrao",
        message: schedule.message,
        progress
      };
    });

    const allItems = [...campaignItems, ...scheduleItems].sort((a, b) => {
      const aDate = new Date(a.nextRunAt || a.lastRunAt || 0).getTime();
      const bDate = new Date(b.nextRunAt || b.lastRunAt || 0).getTime();
      return bDate - aDate;
    });

    if (tab === 1) return allItems.filter(item => item.source === "campaign");
    if (tab === 2) return allItems.filter(item => item.source === "schedule");
    if (tab === 3) return allItems.filter(item => ["running", "paused", "scheduled"].includes(item.status));
    if (tab === 4) return allItems.filter(item => ["failed", "error", "completed_with_errors"].includes(item.status) || item.progress.failed > 0);
    return allItems;
  };

  const renderIconAction = ({ title, icon, onClick, disabled = false, color = "default" }) => (
    <Tooltip title={title}>
      <span>
        <IconButton size="small" onClick={onClick} disabled={disabled} color={color}>
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );

  const openNewScheduleModal = () => {
    setEditingScheduleId(null);
    setScheduleForm(initialSchedule);
    setScheduleMedia(null);
    setScheduleTimeInput("");
    setScheduleModalOpen(true);
  };

  const openEditScheduleModal = schedule => {
    setEditingScheduleId(schedule.id);
    setScheduleForm({
      contactIds: schedule.contactId ? [schedule.contactId] : [],
      tagIds: [],
      audience: "all",
      message: schedule.message || "",
      scheduledAt: toDateTimeLocalValue(schedule.scheduledAt),
      recurrenceType: schedule.recurrenceType || "once",
      weekdays: schedule.weekdays || [],
      times: schedule.times || [],
      startsAt: toDateTimeLocalValue(schedule.startsAt),
      endsAt: toDateTimeLocalValue(schedule.endsAt),
      repeatEvery: schedule.repeatEvery || 1,
      repeatUnit: schedule.repeatUnit || "hours",
      maxRuns: schedule.maxRuns || "",
      respectBusinessHours: !!schedule.respectBusinessHours,
      missedRunPolicy: schedule.missedRunPolicy || "skip",
      intervalPattern: schedule.intervalPattern || String(schedule.intervalSeconds || 30),
      pauseAfter: schedule.pauseAfter || 20,
      pauseMinutes: Math.max(1, Math.round((schedule.pauseSeconds || 300) / 60)),
      whatsappId: schedule.whatsappId || ""
    });
    setScheduleMedia(null);
    setScheduleTimeInput("");
    setScheduleModalOpen(true);
  };

  const closeScheduleModal = () => {
    setScheduleModalOpen(false);
    setEditingScheduleId(null);
    setScheduleForm(initialSchedule);
    setScheduleMedia(null);
    setScheduleTimeInput("");
  };

  const saveSchedule = async () => {
    try {
      const payload = new FormData();
      Object.entries(scheduleForm).forEach(([key, value]) => {
        payload.append(key, Array.isArray(value) ? JSON.stringify(value) : value);
      });
      if (scheduleMedia) payload.append("media", scheduleMedia);

      if (editingScheduleId) {
        await api.put(`/scheduled-messages/${editingScheduleId}`, payload, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Agendamento atualizado.");
      } else {
        await api.post("/scheduled-messages", payload, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Mensagem agendada.");
      }

      closeScheduleModal();
      loadData();
    } catch (err) {
      toastError(err);
    }
  };

  const deleteSchedule = async schedule => {
    try {
      await api.delete(`/scheduled-messages/${schedule.id}`);
      loadData();
    } catch (err) {
      toastError(err);
    }
  };

  const updateScheduleStatus = async (schedule, status) => {
    try {
      await api.put(`/scheduled-messages/${schedule.id}`, { status });
      loadData();
    } catch (err) {
      toastError(err);
    }
  };

  const duplicateSchedule = async schedule => {
    try {
      await api.post(`/scheduled-messages/${schedule.id}/duplicate`);
      toast.success("Agendamento clonado. Revise antes de ativar.");
      loadData();
    } catch (err) {
      toastError(err);
    }
  };

  const renderCampaignActions = campaign => {
    const progress = getCampaignProgress(campaign);

    return (
      <>
        {(campaign.status === "scheduled" || campaign.status === "running") && (
          <>
            <Button size="small" onClick={() => updateCampaignStatus(campaign, "paused")}>
              Pause
            </Button>
            <Button size="small" onClick={() => updateCampaignStatus(campaign, "canceled")}>
              Stop
            </Button>
          </>
        )}
        {campaign.status === "paused" && (
          <Button size="small" onClick={() => updateCampaignStatus(campaign, "running")}>
            Play
          </Button>
        )}
        {progress.failed > 0 && (
          <Button size="small" onClick={() => retryCampaignErrors(campaign)}>
            Reenviar erros
          </Button>
        )}
        {["completed", "completed_with_errors", "canceled", "failed", "error"].includes(campaign.status) && (
          <Button size="small" onClick={() => duplicateCampaign(campaign)}>
            Reenviar tudo
          </Button>
        )}
        <Button size="small" onClick={() => openCampaignLogs(campaign)}>
          Logs
        </Button>
      </>
    );
  };

  const renderAutomationActions = item => {
    if (item.source === "campaign") {
      const campaign = item.raw;
      return (
        <div className={classes.playerActions}>
          {["scheduled", "paused"].includes(campaign.status) && renderIconAction({
            title: campaign.status === "paused" ? "Retomar campanha" : "Iniciar agora",
            icon: <PlayArrowIcon />,
            color: "primary",
            onClick: () => updateCampaignStatus(campaign, "running")
          })}
          {campaign.status === "running" && renderIconAction({
            title: "Pausar campanha",
            icon: <PauseIcon />,
            onClick: () => updateCampaignStatus(campaign, "paused")
          })}
          {["scheduled", "running", "paused"].includes(campaign.status) && renderIconAction({
            title: "Cancelar campanha",
            icon: <StopIcon />,
            onClick: () => updateCampaignStatus(campaign, "canceled")
          })}
          {item.progress.failed > 0 && renderIconAction({
            title: "Reenviar erros",
            icon: <ReplayIcon />,
            color: "secondary",
            onClick: () => retryCampaignErrors(campaign)
          })}
          {renderIconAction({
            title: "Clonar campanha",
            icon: <FileCopyIcon />,
            onClick: () => duplicateCampaign(campaign)
          })}
          {renderIconAction({
            title: "Logs",
            icon: <ListAltIcon />,
            onClick: () => openCampaignLogs(campaign)
          })}
        </div>
      );
    }

    const schedule = item.raw;
    return (
      <div className={classes.playerActions}>
        {schedule.status === "paused" && renderIconAction({
          title: "Retomar agendamento",
          icon: <PlayArrowIcon />,
          color: "primary",
          onClick: () => updateScheduleStatus(schedule, "scheduled")
        })}
        {["scheduled", "running"].includes(schedule.status) && renderIconAction({
          title: "Pausar agendamento",
          icon: <PauseIcon />,
          onClick: () => updateScheduleStatus(schedule, "paused")
        })}
        {["scheduled", "running", "paused"].includes(schedule.status) && renderIconAction({
          title: "Cancelar agendamento",
          icon: <StopIcon />,
          onClick: () => updateScheduleStatus(schedule, "canceled")
        })}
        {!["sent", "completed", "canceled"].includes(schedule.status) && renderIconAction({
          title: "Editar agendamento",
          icon: <EditIcon />,
          onClick: () => openEditScheduleModal(schedule)
        })}
        {renderIconAction({
          title: "Clonar agendamento",
          icon: <FileCopyIcon />,
          onClick: () => duplicateSchedule(schedule)
        })}
        {renderIconAction({
          title: "Logs",
          icon: <ListAltIcon />,
          onClick: () => openScheduleLogs(schedule)
        })}
      </div>
    );
  };

  const automationItems = buildAutomationItems();

  return (
    <Container maxWidth={false} className={classes.root}>
      <div className={classes.header}>
        <div>
          <Typography variant="h6">Campanhas e Agendamentos</Typography>
          <Typography variant="body2" className={classes.helper}>
            Centralize envios imediatos, campanhas em fila e mensagens recorrentes em uma unica area.
          </Typography>
        </div>
        <div>
          <Button
            color="primary"
            variant="outlined"
            onClick={() => setCampaignModalOpen(true)}
            style={{ marginRight: 8 }}
          >
            Nova campanha
          </Button>
          <Button
            color="primary"
            variant="contained"
            onClick={openNewScheduleModal}
          >
            Novo agendamento
          </Button>
        </div>
      </div>
      <Tabs
        value={tab}
        indicatorColor="primary"
        textColor="primary"
        onChange={(event, value) => setTab(value)}
        className={classes.tabs}
      >
        <Tab label="Todos" />
        <Tab label="Campanhas" />
        <Tab label="Agendamentos" />
        <Tab label="Em andamento" />
        <Tab label="Com erros" />
      </Tabs>

      <Paper className={classes.paper} variant="outlined">
        <div className={classes.playlist}>
          {automationItems.map(item => {
            const percent = getProgressPercent(item.progress);
            const isCampaign = item.source === "campaign";

            return (
              <div className={classes.automationCard} key={item.id}>
                <div className={classes.automationHeader}>
                  <div className={classes.automationTitle}>
                    <div className={classes.automationIcon}>
                      {isCampaign ? <SendIcon /> : <ScheduleIcon />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <Typography className={classes.automationName}>{item.name}</Typography>
                      <div className={classes.automationMeta}>
                        <Chip size="small" label={item.typeLabel} />
                        <Chip size="small" color={getStatusColor(item.status)} label={item.statusLabel} />
                        <Chip size="small" label={item.recurrenceLabel} />
                        <Chip size="small" label={`WhatsApp: ${item.whatsappName}`} />
                      </div>
                    </div>
                  </div>
                  {renderAutomationActions(item)}
                </div>

                <div className={classes.automationStats}>
                  <div className={classes.statBox}>
                    <Typography variant="caption" color="textSecondary">Proxima execucao</Typography>
                    <Typography variant="body2" className={classes.statValue}>{formatDateTime(item.nextRunAt)}</Typography>
                  </div>
                  <div className={classes.statBox}>
                    <Typography variant="caption" color="textSecondary">Ultima execucao</Typography>
                    <Typography variant="body2" className={classes.statValue}>{formatDateTime(item.lastRunAt)}</Typography>
                  </div>
                  <div className={classes.statBox}>
                    <Typography variant="caption" color="textSecondary">Enviados</Typography>
                    <Typography variant="body2" className={classes.statValue}>{item.progress.sent} / {item.progress.total}</Typography>
                  </div>
                  <div className={classes.statBox}>
                    <Typography variant="caption" color="textSecondary">Pendentes / erros</Typography>
                    <Typography variant="body2" className={classes.statValue}>{item.progress.pending} pend. / {item.progress.failed} erro(s)</Typography>
                  </div>
                </div>

                <div className={classes.progressArea}>
                  <LinearProgress variant="determinate" value={percent} />
                  <Typography variant="caption" color="textSecondary">
                    {percent}% concluido
                  </Typography>
                </div>
              </div>
            );
          })}
          {!automationItems.length && (
            <Typography variant="body2" color="textSecondary">
              Nenhuma campanha ou agendamento encontrado para este filtro.
            </Typography>
          )}
        </div>
      </Paper>

      <Dialog open={campaignModalOpen} onClose={() => setCampaignModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nova campanha</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required margin="dense" variant="outlined" label="Nome" name="name" value={campaignForm.name} onChange={handleCampaignChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth margin="dense" variant="outlined" label="Tipo de destinatario" name="recipientType" value={campaignForm.recipientType} onChange={handleCampaignAudienceChange}>
                <MenuItem value="contacts">Contatos</MenuItem>
                <MenuItem value="tags">Etiquetas</MenuItem>
                <MenuItem value="groups">Grupos de WhatsApp</MenuItem>
              </TextField>
              <Typography variant="caption" color="textSecondary">
                Escolha se a campanha sera enviada para contatos selecionados, contatos com etiquetas ou grupos de WhatsApp.
              </Typography>
            </Grid>
            {campaignForm.recipientType !== "tags" && (
              <Grid item xs={12} sm={6}>
                <ContactPicker
                  classes={classes}
                  contacts={contacts}
                  audience={campaignForm.recipientType === "groups" ? "groups" : "contacts"}
                  selectedIds={campaignForm.contactIds}
                  label={campaignForm.recipientType === "groups" ? "Grupos de WhatsApp" : "Contatos"}
                  onChange={contactIds => setCampaignForm(prev => ({ ...prev, contactIds }))}
                />
                <Typography variant="caption" color="textSecondary">
                  Marque os destinatarios que devem receber esta campanha.
                </Typography>
              </Grid>
            )}
            {campaignForm.recipientType === "tags" && (
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  label="Etiquetas para envio"
                  name="tagIds"
                  value={campaignForm.tagIds}
                  onChange={handleCampaignChange}
                  SelectProps={{ multiple: true, renderValue: renderTagValue }}
                >
                  {tags.map(tag => (
                    <MenuItem key={tag.id} value={tag.id}>
                      {tag.name}
                    </MenuItem>
                  ))}
                </TextField>
                <Typography variant="caption" color="textSecondary">
                  A campanha sera enviada para contatos que tenham pelo menos uma das etiquetas marcadas.
                </Typography>
              </Grid>
            )}
            {campaignForm.recipientType === "tags" && (
              <Grid item xs={12} sm={6}>
                <TextField fullWidth type="number" margin="dense" variant="outlined" label="Etiqueta aplicada nos ultimos dias" name="tagAppliedLastDays" value={campaignForm.tagAppliedLastDays} onChange={handleCampaignChange} placeholder="Ex: 7" />
                <Typography variant="caption" color="textSecondary">
                  Se preencher 7, envia apenas para contatos cuja etiqueta foi aplicada nos ultimos 7 dias.
                </Typography>
              </Grid>
            )}
            {campaignForm.recipientType === "tags" && (
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  label="Nao enviar para contatos com estas etiquetas"
                  name="excludeTagIds"
                  value={campaignForm.excludeTagIds}
                  onChange={handleCampaignChange}
                  SelectProps={{ multiple: true, renderValue: renderTagValue }}
                >
                  {tags.map(tag => (
                    <MenuItem key={tag.id} value={tag.id}>
                      {tag.name}
                    </MenuItem>
                  ))}
                </TextField>
                <Typography variant="caption" color="textSecondary">
                  Contatos com essas etiquetas nao receberao a campanha.
                </Typography>
              </Grid>
            )}
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="number" margin="dense" variant="outlined" label="Pausar após envios" name="pauseAfter" value={campaignForm.pauseAfter} onChange={handleCampaignChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="number" margin="dense" variant="outlined" label="Tempo de pausa (min.)" name="pauseMinutes" value={campaignForm.pauseMinutes} onChange={handleCampaignChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth required margin="dense" variant="outlined" label="Sequencia de intervalos em segundos" name="intervalPattern" value={campaignForm.intervalPattern} onChange={handleCampaignChange} placeholder="10:2:95:12:34" />
            </Grid>
            <Grid item xs={12}>
              <TextField select fullWidth margin="dense" variant="outlined" label="Conexão WhatsApp" name="whatsappId" value={campaignForm.whatsappId} onChange={handleCampaignChange}>
                <MenuItem value="">Padrão</MenuItem>
                {whatsapps.map(whatsapp => (
                  <MenuItem key={whatsapp.id} value={whatsapp.id}>{whatsapp.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <MessageTemplateField
                label="Mensagem"
                name="message"
                value={campaignForm.message}
                onChange={handleCampaignChange}
                rows={5}
                required
                onMediaChange={setCampaignMedia}
                mediaName={campaignMedia?.name}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCampaignModalOpen(false)}>Cancelar</Button>
          <Button color="primary" variant="contained" onClick={createCampaign}>Iniciar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={scheduleModalOpen} onClose={closeScheduleModal} maxWidth="md" fullWidth>
        <DialogTitle>{editingScheduleId ? "Editar agendamento" : "Novo agendamento"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth margin="dense" variant="outlined" label="Público" name="audience" value={scheduleForm.audience} onChange={handleScheduleAudienceChange}>
                <MenuItem value="all">Contatos e grupos</MenuItem>
                <MenuItem value="contacts">Somente contatos</MenuItem>
                <MenuItem value="groups">Somente grupos</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <ContactPicker
                classes={classes}
                contacts={contacts}
                audience={scheduleForm.audience}
                selectedIds={scheduleForm.contactIds}
                label="Contatos ou grupos"
                onChange={contactIds => setScheduleForm(prev => ({ ...prev, contactIds }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                margin="dense"
                variant="outlined"
                label="Etiquetas"
                name="tagIds"
                value={scheduleForm.tagIds}
                onChange={handleScheduleChange}
                SelectProps={{ multiple: true, renderValue: renderTagValue }}
              >
                {tags.map(tag => (
                  <MenuItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth margin="dense" variant="outlined" label="Tipo de agendamento" name="recurrenceType" value={scheduleForm.recurrenceType} onChange={handleScheduleChange}>
                <MenuItem value="once">Executar uma vez</MenuItem>
                <MenuItem value="weekly">Dias e horarios especificos</MenuItem>
                <MenuItem value="interval">Repetir por intervalo</MenuItem>
              </TextField>
            </Grid>
            {scheduleForm.recurrenceType === "once" && (
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required type="datetime-local" margin="dense" variant="outlined" label="Data e hora" name="scheduledAt" value={scheduleForm.scheduledAt} onChange={handleScheduleChange} InputLabelProps={{ shrink: true }} />
              </Grid>
            )}
            {scheduleForm.recurrenceType === "weekly" && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Dias da semana</Typography>
                  <Grid container spacing={1}>
                    {weekdayOptions.map(day => (
                      <Grid item xs={6} sm={3} md={2} key={day.value}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              color="primary"
                              checked={(scheduleForm.weekdays || []).map(Number).includes(day.value)}
                              onChange={() => toggleScheduleWeekday(day.value)}
                            />
                          }
                          label={day.label}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Horarios</Typography>
                  <Grid container spacing={1} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        type="time"
                        margin="dense"
                        variant="outlined"
                        label="Horario"
                        value={scheduleTimeInput}
                        onChange={event => setScheduleTimeInput(event.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Button fullWidth variant="outlined" color="primary" onClick={addScheduleTime}>
                        Adicionar horario
                      </Button>
                    </Grid>
                  </Grid>
                  <div className={classes.tagChips} style={{ marginTop: 8 }}>
                    {(scheduleForm.times || []).map(time => (
                      <Chip key={time} size="small" label={time} onDelete={() => removeScheduleTime(time)} />
                    ))}
                  </div>
                  <Typography variant="caption" color="textSecondary">
                    Adicione os horarios um por um. O sistema ordena e evita duplicados.
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth type="datetime-local" margin="dense" variant="outlined" label="Inicio" name="startsAt" value={scheduleForm.startsAt} onChange={handleScheduleChange} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth type="datetime-local" margin="dense" variant="outlined" label="Fim opcional" name="endsAt" value={scheduleForm.endsAt} onChange={handleScheduleChange} InputLabelProps={{ shrink: true }} />
                </Grid>
              </>
            )}
            {scheduleForm.recurrenceType === "interval" && (
              <>
                <Grid item xs={12} sm={3}>
                  <TextField fullWidth required type="number" margin="dense" variant="outlined" label="Repetir a cada" name="repeatEvery" value={scheduleForm.repeatEvery} onChange={handleScheduleChange} inputProps={{ min: 1 }} />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField select fullWidth margin="dense" variant="outlined" label="Unidade" name="repeatUnit" value={scheduleForm.repeatUnit} onChange={handleScheduleChange}>
                    {repeatUnitOptions.map(unit => (
                      <MenuItem key={unit.value} value={unit.value}>{unit.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField fullWidth type="number" margin="dense" variant="outlined" label="Limite de execucoes" name="maxRuns" value={scheduleForm.maxRuns} onChange={handleScheduleChange} inputProps={{ min: 1 }} helperText="Opcional" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth type="datetime-local" margin="dense" variant="outlined" label="Comecar em" name="startsAt" value={scheduleForm.startsAt} onChange={handleScheduleChange} InputLabelProps={{ shrink: true }} helperText="Se vazio, comeca no proximo minuto." />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth type="datetime-local" margin="dense" variant="outlined" label="Fim opcional" name="endsAt" value={scheduleForm.endsAt} onChange={handleScheduleChange} InputLabelProps={{ shrink: true }} />
                </Grid>
              </>
            )}
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="number" margin="dense" variant="outlined" label="Pausar apos envios" name="pauseAfter" value={scheduleForm.pauseAfter} onChange={handleScheduleChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="number" margin="dense" variant="outlined" label="Tempo de pausa (min.)" name="pauseMinutes" value={scheduleForm.pauseMinutes} onChange={handleScheduleChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth required margin="dense" variant="outlined" label="Sequencia de intervalos em segundos" name="intervalPattern" value={scheduleForm.intervalPattern} onChange={handleScheduleChange} placeholder="10:2:95:12:34" />
            </Grid>
            <Grid item xs={12}>
              <TextField select fullWidth margin="dense" variant="outlined" label="Conexão WhatsApp" name="whatsappId" value={scheduleForm.whatsappId} onChange={handleScheduleChange}>
                <MenuItem value="">Padrão</MenuItem>
                {whatsapps.map(whatsapp => (
                  <MenuItem key={whatsapp.id} value={whatsapp.id}>{whatsapp.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <MessageTemplateField
                label="Mensagem"
                name="message"
                value={scheduleForm.message}
                onChange={handleScheduleChange}
                rows={5}
                required
                onMediaChange={setScheduleMedia}
                mediaName={scheduleMedia?.name}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeScheduleModal}>Cancelar</Button>
          <Button color="primary" variant="contained" onClick={saveSchedule}>
            {editingScheduleId ? "Salvar" : "Agendar"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={logsModalOpen} onClose={() => setLogsModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{logsTitle}</DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Contato</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Tentativa</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Erro</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>{log.contact?.name || log.phoneNumber || log.contactId}</TableCell>
                  <TableCell>{log.status}</TableCell>
                  <TableCell>{log.attemptNumber || log.attempts || 0}</TableCell>
                  <TableCell>{new Date(log.attemptedAt || log.executedAt || log.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{log.errorMessage || "-"}</TableCell>
                </TableRow>
              ))}
              {!logs.length && (
                <TableRow>
                  <TableCell colSpan={5}>Nenhum log registrado ainda.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogsModalOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CampaignsSchedules;
