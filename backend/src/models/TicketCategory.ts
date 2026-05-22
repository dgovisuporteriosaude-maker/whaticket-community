import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, AllowNull, Default, DataType
} from "sequelize-typescript";

@Table
class TicketCategory extends Model<TicketCategory> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @Column(DataType.TEXT)
  description: string;

  @Default(true)
  @Column
  active: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default TicketCategory;
