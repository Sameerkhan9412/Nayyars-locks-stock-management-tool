import mongoose, { Schema, Document, model, models } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  categoryId: mongoose.Types.ObjectId;
  subcategoryId?: mongoose.Types.ObjectId;
  stock: number;
  lowStockLimit: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, index: true, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    subcategoryId: { type: Schema.Types.ObjectId, ref: 'SubCategory', required: false, index: true, default: null },
    stock: { type: Number, required: true, default: 0, min: 0 },
    lowStockLimit: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true }
);

export default models.Product || model<IProduct>('Product', ProductSchema);
