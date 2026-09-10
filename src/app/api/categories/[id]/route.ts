import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
import SubCategory from '@/models/SubCategory';
import Product from '@/models/Product';
import { categorySchema } from '@/lib/validations';
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
    const result = categorySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }
    
    const { name } = result.data;
    
    const category = await Category.findById(id);
    if (!category) {
      return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
    }
    
    const existing = await Category.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });
    if (existing) {
      return NextResponse.json({ error: 'Category name already exists.' }, { status: 400 });
    }
    
    category.name = name.trim();
    await category.save();
    
    return NextResponse.json({ success: true, category });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
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
    
    const subCategoriesCount = await SubCategory.countDocuments({ categoryId: id });
    if (subCategoriesCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category. There are subcategories associated with it.' },
        { status: 400 }
      );
    }
    
    const productsCount = await Product.countDocuments({ categoryId: id });
    if (productsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category. There are products associated with it.' },
        { status: 400 }
      );
    }
    
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
