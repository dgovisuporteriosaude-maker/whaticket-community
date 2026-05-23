import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  Default,
  ForeignKey,
  BelongsTo,
  DataType
} from "sequelize-typescript";

import Contact from "./Contact";
import Whatsapp from "./Whatsapp";

@Table({ tableName: "ScheduledMessages" })
class ScheduledMessage extends Model<ScheduledMessage> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @Column(DataType.TEXT)
  message: string;

  @Column
  scheduledAt: Date;

  @Default("pending")
  @Column
  status: string;

  @Column
  sentAt: Date;

  @Column(DataType.TEXT)
  errorMessage: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ScheduledMessage;
