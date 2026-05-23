import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  HasMany,
  AutoIncrement,
  Default
} from "sequelize-typescript";

import Contact from "./Contact";
import Message from "./Message";
import Queue from "./Queue";
import User from "./User";
import Whatsapp from "./Whatsapp";
import TicketCategory from "./TicketCategory";
import ClosingReason from "./ClosingReason";

@Table
class Ticket extends Model<Ticket> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column({ defaultValue: "pending" })
  status: string;

  @Column
  unreadMessages: number;

  @Column
  lastMessage: string;

  @Default(false)
  @Column
  isGroup: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

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

  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;

  @ForeignKey(() => TicketCategory)
  @Column
  categoryId: number;

  @BelongsTo(() => TicketCategory)
  category: TicketCategory;

  @ForeignKey(() => ClosingReason)
  @Column
  closingReasonId: number;

  @BelongsTo(() => ClosingReason)
  closingReason: ClosingReason;

  @Column
  closingNote: string;

  @Column
  glpiTicketId: number;

  @Column
  uraFlowId: number;

  @Column
  uraMenuSentAt: Date;

  @Default(false)
  @Column
  aiActive: boolean;

  @Column
  aiSettingId: number;

  @HasMany(() => Message)
  messages: Message[];
}

export default Ticket;
