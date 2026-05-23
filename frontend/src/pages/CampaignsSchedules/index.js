import React, { useEffect, useState } from "react";
import {
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
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
  Chip
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
  root: {
    flex: 1,
    padding: theme.spacing(2),
    overflowY: "auto",
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
  paper: {
    padding: theme.spacing(1),
    overflowX: "auto"
  },
  helper: {
    marginBottom: theme.spacing(2)
  },
  tagChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.5)
  }
}));

const initialCampaign = {
  name: "",
  message: "",
  audience: "contacts",
  intervalSeconds: 30,
  pauseAfter: 20,
  pauseSeconds: 300,
  whatsappId: "",
  contactIds: [],
  tagIds: []
};

const initialSchedule = {
  contactIds: [],
  tagIds: [],
  audience: "all",
  message: "",
  scheduledAt: "",
  whatsappId: ""
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
    const { name, value } = event.target;
    setScheduleForm(prev => ({ ...prev, [name]: value }));
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

  const renderContactValue = selected => (
    <div className={classes.tagChips}>
      {selected.map(contactId => {
        const contact = contacts.find(item => item.id === contactId);
        return <Chip key={contactId} size="small" label={contact?.name || contactId} />;
      })}
    </div>
  );

  const createCampaign = async () => {
    try {
      await api.post("/campaigns", campaignForm);
      toast.success("Campanha iniciada.");
      setCampaignModalOpen(false);
      setCampaignForm(initialCampaign);
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

  const createSchedule = async () => {
    try {
      await api.post("/scheduled-messages", scheduleForm);
      toast.success("Mensagem agendada.");
      setScheduleModalOpen(false);
      setScheduleForm(initialSchedule);
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

  const renderCampaignActions = campaign => {
    if (campaign.status === "running") {
      return (
        <Button size="small" onClick={() => updateCampaignStatus(campaign, "paused")}>
          Pausar
        </Button>
      );
    }

    if (campaign.status === "paused") {
      return (
        <Button size="small" onClick={() => updateCampaignStatus(campaign, "running")}>
          Retomar
        </Button>
      );
    }

    return null;
  };

  return (
    <Container maxWidth={false} className={classes.root}>
      <Tabs
        value={tab}
        indicatorColor="primary"
        textColor="primary"
        onChange={(event, value) => setTab(value)}
        className={classes.tabs}
      >
        <Tab label="Campanhas" />
        <Tab label="Agendamentos" />
      </Tabs>

      {tab === 0 && (
        <>
          <div className={classes.header}>
            <div>
              <Typography variant="h6">Campanhas</Typography>
              <Typography variant="body2" className={classes.helper}>
                Use {"{{nome}}"} para personalizar a mensagem com o nome do contato.
              </Typography>
            </div>
            <Button
              color="primary"
              variant="contained"
              onClick={() => setCampaignModalOpen(true)}
            >
              Nova campanha
            </Button>
          </div>
          <Paper className={classes.paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Público</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Destinatários</TableCell>
                  <TableCell>Intervalo</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {campaigns.map(campaign => (
                  <TableRow key={campaign.id}>
                    <TableCell>{campaign.name}</TableCell>
                    <TableCell>{campaign.audience}</TableCell>
                    <TableCell>{campaign.status}</TableCell>
                    <TableCell>{campaign.recipients?.length || 0}</TableCell>
                    <TableCell>{campaign.intervalSeconds}s</TableCell>
                    <TableCell align="right">{renderCampaignActions(campaign)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}

      {tab === 1 && (
        <>
          <div className={classes.header}>
            <Typography variant="h6">Agendamentos</Typography>
            <Button
              color="primary"
              variant="contained"
              onClick={() => setScheduleModalOpen(true)}
            >
              Novo agendamento
            </Button>
          </div>
          <Paper className={classes.paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Contato/grupo</TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Mensagem</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {schedules.map(schedule => (
                  <TableRow key={schedule.id}>
                    <TableCell>{schedule.contact?.name}</TableCell>
                    <TableCell>{new Date(schedule.scheduledAt).toLocaleString()}</TableCell>
                    <TableCell>{schedule.status}</TableCell>
                    <TableCell>{schedule.message}</TableCell>
                    <TableCell align="right">
                      {schedule.status !== "sent" && (
                        <Button size="small" onClick={() => deleteSchedule(schedule)}>
                          Excluir
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}

      <Dialog open={campaignModalOpen} onClose={() => setCampaignModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nova campanha</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required margin="dense" variant="outlined" label="Nome" name="name" value={campaignForm.name} onChange={handleCampaignChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth margin="dense" variant="outlined" label="Público" name="audience" value={campaignForm.audience} onChange={handleCampaignChange}>
                <MenuItem value="contacts">Somente contatos</MenuItem>
                <MenuItem value="groups">Somente grupos</MenuItem>
                <MenuItem value="all">Contatos e grupos</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                margin="dense"
                variant="outlined"
                label="Contatos específicos"
                name="contactIds"
                value={campaignForm.contactIds}
                onChange={handleCampaignChange}
                SelectProps={{ multiple: true, renderValue: renderContactValue }}
              >
                {contacts.map(contact => (
                  <MenuItem key={contact.id} value={contact.id}>
                    {contact.name} {contact.isGroup ? "(grupo)" : ""}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                margin="dense"
                variant="outlined"
                label="Tags"
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
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="number" margin="dense" variant="outlined" label="Intervalo entre mensagens (seg.)" name="intervalSeconds" value={campaignForm.intervalSeconds} onChange={handleCampaignChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="number" margin="dense" variant="outlined" label="Pausar após envios" name="pauseAfter" value={campaignForm.pauseAfter} onChange={handleCampaignChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="number" margin="dense" variant="outlined" label="Tempo de pausa (seg.)" name="pauseSeconds" value={campaignForm.pauseSeconds} onChange={handleCampaignChange} />
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
              <TextField fullWidth required multiline rows={5} margin="dense" variant="outlined" label="Mensagem" name="message" value={campaignForm.message} onChange={handleCampaignChange} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCampaignModalOpen(false)}>Cancelar</Button>
          <Button color="primary" variant="contained" onClick={createCampaign}>Iniciar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Novo agendamento</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth margin="dense" variant="outlined" label="Público" name="audience" value={scheduleForm.audience} onChange={handleScheduleChange}>
                <MenuItem value="all">Contatos e grupos</MenuItem>
                <MenuItem value="contacts">Somente contatos</MenuItem>
                <MenuItem value="groups">Somente grupos</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                margin="dense"
                variant="outlined"
                label="Contatos ou grupos"
                name="contactIds"
                value={scheduleForm.contactIds}
                onChange={handleScheduleChange}
                SelectProps={{ multiple: true, renderValue: renderContactValue }}
              >
                {contacts.map(contact => (
                  <MenuItem key={contact.id} value={contact.id}>
                    {contact.name} {contact.isGroup ? "(grupo)" : ""}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                margin="dense"
                variant="outlined"
                label="Tags"
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
              <TextField fullWidth required type="datetime-local" margin="dense" variant="outlined" label="Data e hora" name="scheduledAt" value={scheduleForm.scheduledAt} onChange={handleScheduleChange} InputLabelProps={{ shrink: true }} />
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
              <TextField fullWidth required multiline rows={5} margin="dense" variant="outlined" label="Mensagem" name="message" value={scheduleForm.message} onChange={handleScheduleChange} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleModalOpen(false)}>Cancelar</Button>
          <Button color="primary" variant="contained" onClick={createSchedule}>Agendar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CampaignsSchedules;
