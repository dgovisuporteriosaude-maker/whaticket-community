import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  DataType
} from "sequelize-typescript";

import Contact from "./Contact";
import Ticket from "./Ticket";
import Tag from "./Tag";

@Table({ tableName: "AiTaggerHistories" })
class AiTaggerHistory extends Model<AiTaggerHistory> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @ForeignKey(() => Tag)
  @Column
  appliedTagId: number;

  @ForeignKey(() => Tag)
  @Column
  removedTagId: number;

  @Column
  classifiedAt: Date;

  @Column
  source: string;

  @Column
  configName: string;

  @Column(DataType.TEXT)
  summary: string;

  @Column(DataType.TEXT)
  errorMessage: string;

  @Column
  noTagApplied: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AiTaggerHistory;
