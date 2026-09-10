'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Dialog from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { Loader2, Plus, Edit2, Trash2, AlertTriangle, FolderTree } from 'lucide-react';

interface Category {
  _id: string;
  name: string;
  createdAt: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const toast = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error();
      const result = await res.json();
      setCategories(result.categories || []);
    } catch (e) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      toast.error('Category name is required.');
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: categoryName }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success('Category created successfully.');
        setIsAddOpen(false);
        setCategoryName('');
        fetchCategories();
      } else {
        toast.error(result.error || 'Failed to create category.');
      }
    } catch (e) {
      toast.error('Something went wrong.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCategory) return;
    if (!categoryName.trim()) {
      toast.error('Category name is required.');
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/categories/${currentCategory._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: categoryName }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success('Category updated successfully.');
        setIsEditOpen(false);
        setCurrentCategory(null);
        setCategoryName('');
        fetchCategories();
      } else {
        toast.error(result.error || 'Failed to update category.');
      }
    } catch (e) {
      toast.error('Something went wrong.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!currentCategory) return;
    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/categories/${currentCategory._id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (res.ok) {
        toast.success('Category deleted successfully.');
        setIsDeleteOpen(false);
        setCurrentCategory(null);
        fetchCategories();
      } else {
        toast.error(result.error || 'Failed to delete category.');
      }
    } catch (e) {
      toast.error('Something went wrong.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const openEdit = (category: Category) => {
    setCurrentCategory(category);
    setCategoryName(category.name);
    setIsEditOpen(true);
  };

  const openDelete = (category: Category) => {
    setCurrentCategory(category);
    setIsDeleteOpen(true);
  };

  return (
    <AppLayout title="Categories">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <p className="text-xs text-neutral-400">
          Manage product classifications for Nayyar Locks stock hardware.
        </p>
        <button
          onClick={() => {
            setCategoryName('');
            setIsAddOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FolderTree className="w-12 h-12 text-neutral-600 mb-3" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200 mb-1">
              No categories found
            </h3>
            <p className="text-xs text-neutral-500 mb-4 max-w-xs">
              Add your first category to start organizing stock items.
            </p>
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
            >
              Add Category
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="text-[10px] font-bold text-neutral-500 uppercase border-b border-neutral-850">
                <tr>
                  <th className="py-3.5 px-6">Category Name</th>
                  <th className="py-3.5 px-6">Created Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850">
                {categories.map((category) => (
                  <tr
                    key={category._id}
                    className="hover:bg-neutral-850/50 transition-colors"
                  >
                    <td className="py-4 px-6 font-semibold text-white">
                      {category.name}
                    </td>
                    <td className="py-4 px-6 text-neutral-400">
                      {new Date(category.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-6 text-right flex items-center justify-end gap-2.5">
                      <button
                        onClick={() => openEdit(category)}
                        className="p-1.5 text-neutral-400 hover:text-amber-500 rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
                        title="Edit Category"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDelete(category)}
                        className="p-1.5 text-neutral-400 hover:text-red-500 rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
                        title="Delete Category"
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
        title="Add New Category"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Category Name
            </label>
            <input
              type="text"
              autoFocus
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g. Door Locks"
              className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-md text-sm text-neutral-250 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
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
        title="Edit Category"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Category Name
            </label>
            <input
              type="text"
              autoFocus
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g. Door Locks"
              className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-md text-sm text-neutral-250 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
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
                Are you sure you want to delete category{' '}
                <strong className="text-white">"{currentCategory?.name}"</strong>?
              </p>
              <p className="text-neutral-400">
                This category will only be deleted if no products or subcategories are linked to it.
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
