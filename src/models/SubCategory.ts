import mongoose, { Schema, Document, model, models } from 'mongoose';

export interface ISubCategory extends Document {
  name: string;
  categoryId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SubCategorySchema = new Schema<ISubCategory>(
  {
    name: { type: String, required: true, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  },
  { timestamps: true }
);

SubCategorySchema.index({ name: 1, categoryId: 1 }, { unique: true });

export default models.SubCategory || model<ISubCategory>('SubCategory', SubCategorySchema);
