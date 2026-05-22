import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, AllowNull, Default, DataType
} from "sequelize-typescript";

@Table
class AiSetting extends Model<AiSetting> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Default("Principal")
  @Column
  name: string;

  @Default("openai")
  @Column
  provider: string;

  @Default("gpt-4o-mini")
  @Column
  model: string;

  @Column(DataType.TEXT)
  apiKey: string;

  @Column(DataType.TEXT)
  systemPrompt: string;

  @Default(0.2)
  @Column(DataType.DECIMAL(3, 2))
  temperature: number;

  @Default(800)
  @Column
  maxTokens: number;

  @Default(true)
  @Column
  transferToHumanOnFailure: boolean;

  @Default(false)
  @Column
  active: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AiSetting;
