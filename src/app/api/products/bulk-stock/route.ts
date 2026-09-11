import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import StockMovement from '@/models/StockMovement';
import { bulkStockAdjustmentSchema } from '@/lib/validations';
import { getSessionUser } from '@/lib/auth';
import { fulfillPendingRequirementsForProduct } from '@/lib/stockHelper';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = bulkStockAdjustmentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { adjustments } = result.data;
    const updated = [];
    const errors: string[] = [];
    let totalFulfilled = 0;

    for (let i = 0; i < adjustments.length; i++) {
      const adj = adjustments[i];
      const product = await Product.findById(adj.productId);
      if (!product) {
        errors.push(`Product not found: ${adj.productId}`);
        continue;
      }

      const prevStock = product.stock;
      const type = adj.type || 'IN';
      const quantity = Number(adj.quantity);

      if (type === 'OUT' && prevStock < quantity) {
        errors.push(`Insufficient stock for ${product.name}. Available: ${prevStock}`);
        continue;
      }

      const newStock = type === 'IN' ? prevStock + quantity : prevStock - quantity;
      product.stock = newStock;
      await product.save();

      await StockMovement.create({
        productId: product._id,
        type,
        quantity,
        previousStock: prevStock,
        newStock,
        note: adj.note ? adj.note.trim() : 'Bulk stock adjustment',
        createdBy: user.id,
      });

      if (type === 'IN') {
        const fulfillRes = await fulfillPendingRequirementsForProduct(product._id, user.id);
        totalFulfilled += fulfillRes.fulfilledCount;
      }

      const freshProduct = await Product.findById(product._id);
      updated.push(freshProduct || product);
    }

    return NextResponse.json({
      success: true,
      updatedCount: updated.length,
      products: updated,
      totalRequirementsFulfilled: totalFulfilled,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Bulk stock error:', error);
    return NextResponse.json({ error: 'Failed to process bulk stock adjustments' }, { status: 500 });
  }
}
