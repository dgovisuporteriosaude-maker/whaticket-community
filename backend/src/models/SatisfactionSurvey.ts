import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, AllowNull, Default, DataType, HasMany
} from "sequelize-typescript";

import SatisfactionSurveyResponse from "./SatisfactionSurveyResponse";

@Table({ tableName: "SatisfactionSurveys" })
class SatisfactionSurvey extends Model<SatisfactionSurvey> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  question: string;

  @Column(DataType.TEXT)
  thankYouMessage: string;

  @Default("1_5")
  @Column
  scaleType: string;

  @Default("optional")
  @Column
  sendMode: string;

  @Default(true)
  @Column
  active: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => SatisfactionSurveyResponse)
  responses: SatisfactionSurveyResponse[];
}

export default SatisfactionSurvey;
