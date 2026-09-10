import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SubCategory from '@/models/SubCategory';
import Category from '@/models/Category';
import Product from '@/models/Product';
import { subcategorySchema } from '@/lib/validations';
import { getSessionUser } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    const body = await req.json();
    const result = subcategorySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }
    
    const { name, categoryId } = result.data;
    
    const subcategory = await SubCategory.findById(id);
    if (!subcategory) {
      return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 });
    }
    
    const category = await Category.findById(categoryId);
    if (!category) {
      return NextResponse.json({ error: 'Selected parent category not found' }, { status: 400 });
    }
    
    const existing = await SubCategory.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      categoryId,
    });
    if (existing) {
      return NextResponse.json({ error: 'Subcategory already exists in this category.' }, { status: 400 });
    }
    
    subcategory.name = name.trim();
    subcategory.categoryId = categoryId as any;
    await subcategory.save();
    
    return NextResponse.json({ success: true, subcategory });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update subcategory' }, { status: 500 });
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
    
    const productsCount = await Product.countDocuments({ subcategoryId: id });
    if (productsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete subcategory. There are products associated with it.' },
        { status: 400 }
      );
    }
    
    const subcategory = await SubCategory.findByIdAndDelete(id);
    if (!subcategory) {
      return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: 'Subcategory deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete subcategory' }, { status: 500 });
  }
}
