import mongoose from 'mongoose';
import Product from '@/models/Product';
import StockMovement from '@/models/StockMovement';
import CustomerRequirement from '@/models/CustomerRequirement';

/**
 * Checks and auto-fulfills pending customer requirements for a specific product
 * in FIFO (First-In, First-Out) order when stock becomes available.
 */
export async function fulfillPendingRequirementsForProduct(
  productId: string | mongoose.Types.ObjectId,
  userId: string | mongoose.Types.ObjectId
) {
  try {
    const product = await Product.findById(productId);
    if (!product || product.stock <= 0) {
      return { fulfilledCount: 0 };
    }

    // Find all requirements that have this product pending, sorted by earliest first
    const pendingRequirements = await CustomerRequirement.find({
      'items.productId': product._id,
      'items.status': 'PENDING_STOCK',
    }).sort({ createdAt: 1 });

    let fulfilledCount = 0;
    let initialStock = product.stock;

    for (const req of pendingRequirements) {
      if (product.stock <= 0) break;

      let reqModified = false;

      for (const item of req.items) {
        if (
          item.productId.toString() === product._id.toString() &&
          item.status === 'PENDING_STOCK'
        ) {
          const needed = item.requestedQuantity - (item.fulfilledQuantity || 0);

          if (product.stock >= needed) {
            const prevStock = product.stock;
            product.stock -= needed;

            item.fulfilledQuantity = item.requestedQuantity;
            item.status = 'FULFILLED';
            reqModified = true;
            fulfilledCount++;

            // Create OUT stock movement for this fulfillment
            await StockMovement.create({
              productId: product._id,
              type: 'OUT',
              quantity: needed,
              previousStock: prevStock,
              newStock: product.stock,
              note: `Auto-fulfilled requirement for ${req.customerName}`,
              createdBy: userId,
            });
          }
        }
      }

      if (reqModified) {
        const allFulfilled = req.items.every((it: any) => it.status === 'FULFILLED');
        const anyFulfilled = req.items.some(
          (it: any) => it.status === 'FULFILLED' || (it.fulfilledQuantity && it.fulfilledQuantity > 0)
        );

        req.overallStatus = allFulfilled
          ? 'FULFILLED'
          : anyFulfilled
          ? 'PARTIALLY_FULFILLED'
          : 'PENDING_STOCK';

        await req.save();
      }
    }

    if (product.stock !== initialStock) {
      await product.save();
    }

    return { fulfilledCount };
  } catch (error) {
    console.error('Error auto-fulfilling pending requirements:', error);
    return { fulfilledCount: 0, error };
  }
}
