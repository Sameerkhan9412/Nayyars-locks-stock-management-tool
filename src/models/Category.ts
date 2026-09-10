import mongoose, { Schema, Document, model, models } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, index: true, trim: true },
  },
  { timestamps: true }
);

export default models.Category || model<ICategory>('Category', CategorySchema);
