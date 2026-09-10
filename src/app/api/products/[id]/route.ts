import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category';
import SubCategory from '@/models/SubCategory';
import StockMovement from '@/models/StockMovement';
import { getSessionUser } from '@/lib/auth';
import { z } from 'zod';

const updateProductSchema = z.object({
  name: z.string().min(1, { message: 'Product name is required' }),
  categoryId: z.string().min(1, { message: 'Please select a category' }),
  subcategoryId: z.string().optional().nullable().or(z.literal('')),
  lowStockLimit: z.coerce.number().min(0, { message: 'Low stock limit must be 0 or greater' }),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    const product = await Product.findById(id)
      .populate('categoryId', 'name')
      .populate('subcategoryId', 'name');
      
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    const body = await req.json();
    const result = updateProductSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }
    
    const { name, categoryId, subcategoryId, lowStockLimit } = result.data;
    
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    const categoryExists = await Category.exists({ _id: categoryId });
    if (!categoryExists) {
      return NextResponse.json({ error: 'Selected category does not exist' }, { status: 400 });
    }
    
    if (subcategoryId && subcategoryId !== '') {
      const subcategoryExists = await SubCategory.exists({ _id: subcategoryId, categoryId });
      if (!subcategoryExists) {
        return NextResponse.json({ error: 'Selected subcategory does not exist under this category' }, { status: 400 });
      }
      product.subcategoryId = subcategoryId as any;
    } else {
      product.subcategoryId = null as any;
    }
    
    product.name = name.trim();
    product.categoryId = categoryId as any;
    product.lowStockLimit = lowStockLimit;
    await product.save();
    
    return NextResponse.json({ success: true, product });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    
    await StockMovement.deleteMany({ productId: id });
    
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: 'Product and history deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
