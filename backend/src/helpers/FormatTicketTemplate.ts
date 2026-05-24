import Setting from "../models/Setting";
import Ticket from "../models/Ticket";

const FormatTicketTemplate = async (body: string, ticket: Ticket): Promise<string> => {
  const brandName = await Setting.findOne({ where: { key: "brandName" } });

  return String(body || "")
    .replace(/{{\s*name\s*}}/gi, ticket.contact?.name || "")
    .replace(/{{\s*nome_contato\s*}}/gi, ticket.contact?.name || "")
    .replace(/{{\s*telefone_contato\s*}}/gi, ticket.contact?.number || "")
    .replace(/{{\s*nome_atendente\s*}}/gi, ticket.user?.name || "")
    .replace(/{{\s*fila\s*}}/gi, ticket.queue?.name || "")
    .replace(/{{\s*fila_humana\s*}}/gi, ticket.queue?.name || "")
    .replace(/{{\s*categoria\s*}}/gi, ticket.category?.name || "")
    .replace(/{{\s*motivo_encerramento\s*}}/gi, ticket.closingReason?.name || "")
    .replace(/{{\s*ultima_mensagem\s*}}/gi, ticket.lastMessage || "")
    .replace(/{{\s*data_hora\s*}}/gi, new Date().toLocaleString("pt-BR"))
    .replace(/{{\s*nome_empresa\s*}}/gi, brandName?.value || "")
    .replace(/{{\s*nome_ia\s*}}/gi, "IA");
};

export default FormatTicketTemplate;
