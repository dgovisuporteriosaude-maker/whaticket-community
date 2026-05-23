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

import Campaign from "./Campaign";
import Contact from "./Contact";

@Table({ tableName: "CampaignContacts" })
class CampaignContact extends Model<CampaignContact> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Campaign)
  @Column
  campaignId: number;

  @BelongsTo(() => Campaign)
  campaign: Campaign;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @Default("pending")
  @Column
  status: string;

  @Default(0)
  @Column
  attempts: number;

  @Column
  sentAt: Date;

  @Column
  nextRunAt: Date;

  @Column(DataType.TEXT)
  errorMessage: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default CampaignContact;
