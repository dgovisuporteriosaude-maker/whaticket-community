import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, AllowNull, Default, DataType
} from "sequelize-typescript";

@Table
class ClosingReason extends Model<ClosingReason> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @Column(DataType.TEXT)
  description: string;

  @Column(DataType.TEXT)
  farewellMessage: string;

  @Default(false)
  @Column
  sendFarewellMessage: boolean;

  @Default(true)
  @Column
  active: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ClosingReason;
