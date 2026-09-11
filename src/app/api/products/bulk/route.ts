import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category';
import SubCategory from '@/models/SubCategory';
import StockMovement from '@/models/StockMovement';
import { bulkProductSchema } from '@/lib/validations';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = bulkProductSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { products } = result.data;
    const createdProducts = [];
    const errors: string[] = [];

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const rowNum = i + 1;

      // Validate Category
      const catExists = await Category.exists({ _id: p.categoryId });
      if (!catExists) {
        errors.push(`Row ${rowNum}: Category does not exist`);
        continue;
      }

      // Validate Subcategory if present
      if (p.subcategoryId && p.subcategoryId !== '') {
        const subExists = await SubCategory.exists({
          _id: p.subcategoryId,
          categoryId: p.categoryId,
        });
        if (!subExists) {
          errors.push(`Row ${rowNum}: Subcategory does not belong to selected category`);
          continue;
        }
      }

      const newProduct = await Product.create({
        name: p.name.trim(),
        categoryId: p.categoryId,
        subcategoryId: p.subcategoryId && p.subcategoryId !== '' ? p.subcategoryId : null,
        stock: p.stock,
        lowStockLimit: p.lowStockLimit,
      });

      if (p.stock > 0) {
        await StockMovement.create({
          productId: newProduct._id,
          type: 'IN',
          quantity: p.stock,
          previousStock: 0,
          newStock: p.stock,
          note: 'Initial stock (Bulk import)',
          createdBy: user.id,
        });
      }

      createdProducts.push(newProduct);
    }

    if (createdProducts.length === 0 && errors.length > 0) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      createdCount: createdProducts.length,
      createdProducts,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Bulk product creation error:', error);
    return NextResponse.json({ error: 'Failed to create bulk products' }, { status: 500 });
  }
}
