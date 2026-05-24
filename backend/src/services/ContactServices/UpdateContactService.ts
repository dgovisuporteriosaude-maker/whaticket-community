import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import Tag from "../../models/Tag";
import ContactTag from "../../models/ContactTag";

interface ExtraInfo {
  id?: number;
  name: string;
  value: string;
}
interface ContactData {
  email?: string;
  number?: string;
  name?: string;
  extraInfo?: ExtraInfo[];
  tagIds?: number[];
}

interface Request {
  contactData: ContactData;
  contactId: string;
}

const UpdateContactService = async ({
  contactData,
  contactId
}: Request): Promise<Contact> => {
  const { email, name, number, extraInfo, tagIds } = contactData;

  const contact = await Contact.findOne({
    where: { id: contactId },
    attributes: ["id", "name", "number", "email", "profilePicUrl"],
    include: ["extraInfo", "tags"]
  });

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  if (extraInfo) {
    await Promise.all(
      extraInfo.map(async info => {
        await ContactCustomField.upsert({ ...info, contactId: contact.id });
      })
    );

    await Promise.all(
      contact.extraInfo.map(async oldInfo => {
        const stillExists = extraInfo.findIndex(info => info.id === oldInfo.id);

        if (stillExists === -1) {
          await ContactCustomField.destroy({ where: { id: oldInfo.id } });
        }
      })
    );
  }

  await contact.update({
    name,
    number,
    email
  });

  if (tagIds) {
    const tags = await Tag.findAll({ where: { id: tagIds } });
    await contact.$set("tags", tags);
    await ContactTag.update(
      { appliedAt: new Date() },
      { where: { contactId: contact.id, tagId: tagIds } }
    );
  }

  await contact.reload({
    attributes: ["id", "name", "number", "email", "profilePicUrl"],
    include: ["extraInfo", "tags"]
  });

  return contact;
};

export default UpdateContactService;
