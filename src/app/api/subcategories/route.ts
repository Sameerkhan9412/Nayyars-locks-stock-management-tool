import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SubCategory from '@/models/SubCategory';
import Category from '@/models/Category';
import { subcategorySchema } from '@/lib/validations';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    
    const query = categoryId ? { categoryId } : {};
    const subcategories = await SubCategory.find(query)
      .populate('categoryId', 'name')
      .sort({ name: 1 });
      
    return NextResponse.json({ subcategories });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch subcategories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const result = subcategorySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }
    
    const { name, categoryId } = result.data;
    
    const category = await Category.findById(categoryId);
    if (!category) {
      return NextResponse.json({ error: 'Selected parent category not found' }, { status: 400 });
    }
    
    const existing = await SubCategory.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      categoryId,
    });
    if (existing) {
      return NextResponse.json({ error: 'Subcategory already exists in this category.' }, { status: 400 });
    }
    
    const subcategory = await SubCategory.create({
      name: name.trim(),
      categoryId,
    });
    
    return NextResponse.json({ success: true, subcategory });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create subcategory' }, { status: 500 });
  }
}
