import mongoose, { Schema, Document, model, models } from 'mongoose';

export interface IStockMovement extends Document {
  productId: mongoose.Types.ObjectId;
  type: 'IN' | 'OUT';
  quantity: number;
  previousStock: number;
  newStock: number;
  note?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    type: { type: String, enum: ['IN', 'OUT'], required: true },
    quantity: { type: Number, required: true, min: 1 },
    previousStock: { type: Number, required: true, min: 0 },
    newStock: { type: Number, required: true, min: 0 },
    note: { type: String, required: false, trim: true, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default models.StockMovement || model<IStockMovement>('StockMovement', StockMovementSchema);
