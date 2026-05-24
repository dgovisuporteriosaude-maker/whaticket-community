import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  DataType,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";

import User from "./User";

@Table({ tableName: "AuditLogs" })
class AuditLog extends Model<AuditLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @Column
  userName: string;

  @Column
  userProfile: string;

  @Column
  action: string;

  @Column
  resource: string;

  @Column
  resourceId: string;

  @Column
  method: string;

  @Column
  route: string;

  @Column
  ip: string;

  @Column(DataType.TEXT)
  beforeData: string;

  @Column(DataType.TEXT)
  afterData: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AuditLog;
