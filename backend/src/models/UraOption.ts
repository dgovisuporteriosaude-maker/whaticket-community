import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, AllowNull, Default, DataType, ForeignKey, BelongsTo
} from "sequelize-typescript";
import UraFlow from "./UraFlow";

@Table({ tableName: "UraOptions" })
class UraOption extends Model<UraOption> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => UraFlow)
  @AllowNull(false)
  @Column
  flowId: number;

  @BelongsTo(() => UraFlow)
  flow: UraFlow;

  @AllowNull(false)
  @Column
  optionKey: string;

  @AllowNull(false)
  @Column
  title: string;

  @Column(DataType.TEXT)
  responseMessage: string;

  @Default("SEND_MESSAGE")
  @Column
  action: string;

  @Column
  targetQueueId: number;

  @Default(0)
  @Column
  order: number;

  @Default(true)
  @Column
  active: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default UraOption;
