'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Dialog from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { Loader2, Plus, Edit2, Trash2, AlertTriangle, Layers } from 'lucide-react';

interface Category {
  _id: string;
  name: string;
}

interface SubCategory {
  _id: string;
  name: string;
  categoryId: Category;
  createdAt: string;
}

export default function SubcategoriesPage() {
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const toast = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [currentSubCategory, setCurrentSubCategory] = useState<SubCategory | null>(null);
  const [subcategoryName, setSubcategoryName] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [subRes, catRes] = await Promise.all([
        fetch('/api/subcategories'),
        fetch('/api/categories'),
      ]);
      if (!subRes.ok || !catRes.ok) throw new Error();
      const subResult = await subRes.json();
      const catResult = await catRes.json();
      setSubcategories(subResult.subcategories || []);
      setCategories(catResult.categories || []);
    } catch (e) {
      toast.error('Failed to load subcategories data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subcategoryName.trim()) {
      toast.error('Subcategory name is required.');
      return;
    }
    if (!parentCategoryId) {
      toast.error('Please select a parent category.');
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await fetch('/api/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: subcategoryName, categoryId: parentCategoryId }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success('Subcategory created successfully.');
        setIsAddOpen(false);
        setSubcategoryName('');
        setParentCategoryId('');
        fetchInitialData();
      } else {
        toast.error(result.error || 'Failed to create subcategory.');
      }
    } catch (e) {
      toast.error('Something went wrong.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSubCategory) return;
    if (!subcategoryName.trim()) {
      toast.error('Subcategory name is required.');
      return;
    }
    if (!parentCategoryId) {
      toast.error('Please select a parent category.');
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/subcategories/${currentSubCategory._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: subcategoryName, categoryId: parentCategoryId }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success('Subcategory updated successfully.');
        setIsEditOpen(false);
        setCurrentSubCategory(null);
        setSubcategoryName('');
        setParentCategoryId('');
        fetchInitialData();
      } else {
        toast.error(result.error || 'Failed to update subcategory.');
      }
    } catch (e) {
      toast.error('Something went wrong.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!currentSubCategory) return;
    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/subcategories/${currentSubCategory._id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (res.ok) {
        toast.success('Subcategory deleted successfully.');
        setIsDeleteOpen(false);
        setCurrentSubCategory(null);
        fetchInitialData();
      } else {
        toast.error(result.error || 'Failed to delete subcategory.');
      }
    } catch (e) {
      toast.error('Something went wrong.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const openEdit = (sub: SubCategory) => {
    setCurrentSubCategory(sub);
    setSubcategoryName(sub.name);
    setParentCategoryId(sub.categoryId?._id || '');
    setIsEditOpen(true);
  };

  const openDelete = (sub: SubCategory) => {
    setCurrentSubCategory(sub);
    setIsDeleteOpen(true);
  };

  return (
    <AppLayout title="Sub Categories">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <p className="text-xs text-neutral-400">
          Manage product subcategories under parent classifications.
        </p>
        <button
          onClick={() => {
            setSubcategoryName('');
            setParentCategoryId(categories[0]?._id || '');
            setIsAddOpen(true);
          }}
          disabled={categories.length === 0}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-neutral-955 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Subcategory
        </button>
      </div>

      {categories.length === 0 && !loading && (
        <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/10 text-amber-500 rounded-md text-xs">
          Please create a Category first before adding a Subcategory.
        </div>
      )}

      <div className="bg-neutral-900 border border-neutral-800 rounded-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          </div>
        ) : subcategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Layers className="w-12 h-12 text-neutral-600 mb-3" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200 mb-1">
              No subcategories found
            </h3>
            <p className="text-xs text-neutral-500 mb-4 max-w-xs">
              Add your first subcategory to link products under parent categories.
            </p>
            {categories.length > 0 && (
              <button
                onClick={() => {
                  setSubcategoryName('');
                  setParentCategoryId(categories[0]?._id || '');
                  setIsAddOpen(true);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
              >
                Add Subcategory
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="text-[10px] font-bold text-neutral-500 uppercase border-b border-neutral-850">
                <tr>
                  <th className="py-3.5 px-6">Subcategory Name</th>
                  <th className="py-3.5 px-6">Parent Category</th>
                  <th className="py-3.5 px-6">Created Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850">
                {subcategories.map((sub) => (
                  <tr
                    key={sub._id}
                    className="hover:bg-neutral-850/50 transition-colors"
                  >
                    <td className="py-4 px-6 font-semibold text-white">
                      {sub.name}
                    </td>
                    <td className="py-4 px-6 text-neutral-300 font-medium">
                      {sub.categoryId?.name ?? <span className="text-red-500 italic">Uncategorized</span>}
                    </td>
                    <td className="py-4 px-6 text-neutral-400">
                      {new Date(sub.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-6 text-right flex items-center justify-end gap-2.5">
                      <button
                        onClick={() => openEdit(sub)}
                        className="p-1.5 text-neutral-400 hover:text-amber-500 rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
                        title="Edit Subcategory"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDelete(sub)}
                        className="p-1.5 text-neutral-400 hover:text-red-500 rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
                        title="Delete Subcategory"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Subcategory"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Subcategory Name
            </label>
            <input
              type="text"
              autoFocus
              value={subcategoryName}
              onChange={(e) => setSubcategoryName(e.target.value)}
              placeholder="e.g. Mortise Locks"
              className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-md text-sm text-neutral-250 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Parent Category
            </label>
            <select
              value={parentCategoryId}
              onChange={(e) => setParentCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 bg-black text-neutral-200 border border-neutral-800 rounded-md text-sm focus:outline-hidden focus:border-amber-500 transition-colors [&>option]:bg-black [&>option]:text-neutral-200 cursor-pointer"
            >
              <option value="" disabled className="bg-black text-neutral-400">Select parent category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id} className="bg-black text-neutral-200">
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 border-t border-neutral-800 pt-4 mt-4">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Subcategory"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Subcategory Name
            </label>
            <input
              type="text"
              autoFocus
              value={subcategoryName}
              onChange={(e) => setSubcategoryName(e.target.value)}
              placeholder="e.g. Mortise Locks"
              className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-md text-sm text-neutral-250 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Parent Category
            </label>
            <select
              value={parentCategoryId}
              onChange={(e) => setParentCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 bg-black text-neutral-200 border border-neutral-800 rounded-md text-sm focus:outline-hidden focus:border-amber-500 transition-colors [&>option]:bg-black [&>option]:text-neutral-200 cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id} className="bg-black text-neutral-200">
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 border-t border-neutral-800 pt-4 mt-4">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-md text-red-400">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <div className="text-xs space-y-1">
              <p className="font-bold uppercase tracking-wider text-red-500">Warning</p>
              <p>
                Are you sure you want to delete subcategory{' '}
                <strong className="text-white">"{currentSubCategory?.name}"</strong>?
              </p>
              <p className="text-neutral-400">
                This subcategory will only be deleted if no products are linked to it.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => setIsDeleteOpen(false)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitLoading}
              onClick={handleDeleteSubmit}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Delete
            </button>
          </div>
        </div>
      </Dialog>
    </AppLayout>
  );
}
