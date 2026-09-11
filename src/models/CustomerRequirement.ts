import mongoose, { Schema, Document, model, models } from 'mongoose';

export interface IRequirementItem {
  _id?: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  productName: string;
  requestedQuantity: number;
  fulfilledQuantity: number;
  status: 'FULFILLED' | 'PENDING_STOCK';
}

export interface ICustomerRequirement extends Document {
  customerName: string;
  customerPhone?: string;
  note?: string;
  items: IRequirementItem[];
  overallStatus: 'FULFILLED' | 'PARTIALLY_FULFILLED' | 'PENDING_STOCK' | 'DELIVERED' | 'CANCELLED';
  deliveredAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RequirementItemSchema = new Schema<IRequirementItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productName: { type: String, required: true },
    requestedQuantity: { type: Number, required: true, min: 1 },
    fulfilledQuantity: { type: Number, required: true, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['FULFILLED', 'PENDING_STOCK'],
      default: 'PENDING_STOCK',
      required: true,
    },
  },
  { _id: true }
);

const CustomerRequirementSchema = new Schema<ICustomerRequirement>(
  {
    customerName: { type: String, required: true, trim: true, index: true },
    customerPhone: { type: String, required: false, trim: true, default: '' },
    note: { type: String, required: false, trim: true, default: '' },
    items: [RequirementItemSchema],
    overallStatus: {
      type: String,
      enum: ['FULFILLED', 'PARTIALLY_FULFILLED', 'PENDING_STOCK', 'DELIVERED', 'CANCELLED'],
      default: 'PENDING_STOCK',
      index: true,
    },
    deliveredAt: { type: Date, required: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default models.CustomerRequirement ||
  model<ICustomerRequirement>('CustomerRequirement', CustomerRequirementSchema);
