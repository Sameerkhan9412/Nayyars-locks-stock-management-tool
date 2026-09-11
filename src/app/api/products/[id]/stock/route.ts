import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import StockMovement from '@/models/StockMovement';
import { stockAdjustmentSchema } from '@/lib/validations';
import { getSessionUser } from '@/lib/auth';
import { fulfillPendingRequirementsForProduct } from '@/lib/stockHelper';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    const body = await req.json();
    const result = stockAdjustmentSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }
    
    const { quantity, note } = result.data;
    const type = result.data.type || body.type;
    
    if (type !== 'IN' && type !== 'OUT') {
      return NextResponse.json({ error: 'Invalid stock transaction type' }, { status: 400 });
    }
    
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    const previousStock = product.stock;
    let newStock = previousStock;
    
    if (type === 'IN') {
      newStock = previousStock + quantity;
    } else {
      if (previousStock < quantity) {
        return NextResponse.json(
          { error: `Insufficient stock. Available stock: ${previousStock}` },
          { status: 400 }
        );
      }
      newStock = previousStock - quantity;
    }
    
    product.stock = newStock;
    await product.save();
    
    const movement = await StockMovement.create({
      productId: product._id,
      type,
      quantity,
      previousStock,
      newStock,
      note: note ? note.trim() : '',
      createdBy: user.id,
    });

    let fulfilledCount = 0;
    if (type === 'IN') {
      const fulfillmentRes = await fulfillPendingRequirementsForProduct(product._id, user.id);
      fulfilledCount = fulfillmentRes.fulfilledCount;
    }

    // Refresh product to return current stock (which might have been adjusted if auto-fulfilled)
    const updatedProduct = await Product.findById(id);
    
    return NextResponse.json({
      success: true,
      product: updatedProduct || product,
      movement,
      fulfilledCount,
    });
  } catch (error) {
    console.error('Stock adjustment error:', error);
    return NextResponse.json({ error: 'Failed to adjust stock' }, { status: 500 });
  }
}

