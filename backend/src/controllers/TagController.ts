import { Request, Response } from "express";
import { Op } from "sequelize";

import AppError from "../errors/AppError";
import Tag from "../models/Tag";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const tags = await Tag.findAll({ order: [["name", "ASC"]] });
  return res.json(tags);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { name, color = "#607d8b" } = req.body;

  if (!name || !String(name).trim()) {
    throw new AppError("ERR_TAG_NAME_REQUIRED", 400);
  }

  const [tag] = await Tag.findOrCreate({
    where: { name: String(name).trim() },
    defaults: { name: String(name).trim(), color }
  });

  return res.status(200).json(tag);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { tagId } = req.params;
  const { name, color } = req.body;
  const tag = await Tag.findByPk(tagId);

  if (!tag) throw new AppError("ERR_TAG_NOT_FOUND", 404);

  if (name) {
    const existing = await Tag.findOne({
      where: { name, id: { [Op.not]: tagId } }
    });

    if (existing) throw new AppError("ERR_TAG_NAME_ALREADY_EXISTS", 400);
  }

  await tag.update({
    name: name || tag.name,
    color: color || tag.color
  });

  return res.status(200).json(tag);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { tagId } = req.params;
  const tag = await Tag.findByPk(tagId);

  if (!tag) throw new AppError("ERR_TAG_NOT_FOUND", 404);

  await tag.destroy();
  return res.status(200).json({ message: "deleted" });
};
