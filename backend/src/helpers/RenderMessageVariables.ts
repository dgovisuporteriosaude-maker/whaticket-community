import Contact from "../models/Contact";
import Setting from "../models/Setting";
import formatBody from "./Mustache";

const settingMap = async (): Promise<Record<string, string>> => {
  const settings = await Setting.findAll({
    where: {
      key: [
        "brandName",
        "companyFantasyName",
        "companyLegalName",
        "companyCnpj",
        "companyAddress",
        "companyPhone",
        "companyEmail",
        "companyWebsite",
        "companyPix",
        "companyPaymentInfo"
      ]
    }
  });

  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value || "";
    return acc;
  }, {} as Record<string, string>);
};

const replaceAliases = (body: string, values: Record<string, string>): string =>
  body
    .replace(/{{\s*nome_contato\s*}}/gi, values.nome_contato || "")
    .replace(/{{\s*telefone_contato\s*}}/gi, values.telefone_contato || "")
    .replace(/{{\s*nome_empresa\s*}}/gi, values.nome_empresa || "")
    .replace(/{{\s*empresa_nome\s*}}/gi, values.empresa_nome || "")
    .replace(/{{\s*empresa_razao_social\s*}}/gi, values.empresa_razao_social || "")
    .replace(/{{\s*empresa_cnpj\s*}}/gi, values.empresa_cnpj || "")
    .replace(/{{\s*empresa_endereco\s*}}/gi, values.empresa_endereco || "")
    .replace(/{{\s*empresa_telefone\s*}}/gi, values.empresa_telefone || "")
    .replace(/{{\s*empresa_email\s*}}/gi, values.empresa_email || "")
    .replace(/{{\s*empresa_site\s*}}/gi, values.empresa_site || "")
    .replace(/{{\s*empresa_pix\s*}}/gi, values.empresa_pix || "")
    .replace(/{{\s*dados_pagamento\s*}}/gi, values.dados_pagamento || "");

const RenderMessageVariables = async (body: string, contact?: Contact | null): Promise<string> => {
  const settings = await settingMap();
  const companyName = settings.companyFantasyName || settings.brandName || settings.companyLegalName || "";

  return replaceAliases(formatBody(body || "", contact as Contact), {
    nome_contato: contact?.name || "",
    telefone_contato: contact?.number || "",
    nome_empresa: companyName,
    empresa_nome: companyName,
    empresa_razao_social: settings.companyLegalName || "",
    empresa_cnpj: settings.companyCnpj || "",
    empresa_endereco: settings.companyAddress || "",
    empresa_telefone: settings.companyPhone || "",
    empresa_email: settings.companyEmail || "",
    empresa_site: settings.companyWebsite || "",
    empresa_pix: settings.companyPix || "",
    dados_pagamento: settings.companyPaymentInfo || ""
  });
};

export default RenderMessageVariables;
