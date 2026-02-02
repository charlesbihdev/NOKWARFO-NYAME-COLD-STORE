import { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { MoreHorizontal, Pencil, Trash2, Plus, Check, X, Tag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function TagManagementSheet({ tags = [] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [editingTagId, setEditingTagId] = useState(null);
    const [deleteTag, setDeleteTag] = useState(null);

    // Form for creating new tags
    const createForm = useForm({ name: '' });

    // Form for editing tags
    const editForm = useForm({ name: '' });

    function handleCreateSubmit(e) {
        e.preventDefault();
        if (!createForm.data.name.trim()) return;

        createForm.post(route('bank-transfer-tags.store'), {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset();
                setIsCreating(false);
            },
        });
    }

    function handleEditSubmit(e, tagId) {
        e.preventDefault();
        if (!editForm.data.name.trim()) return;

        editForm.put(route('bank-transfer-tags.update', tagId), {
            preserveScroll: true,
            onSuccess: () => {
                editForm.reset();
                setEditingTagId(null);
            },
        });
    }

    function startEditing(tag) {
        setEditingTagId(tag.id);
        editForm.setData('name', tag.name);
    }

    function cancelEditing() {
        setEditingTagId(null);
        editForm.reset();
        editForm.clearErrors();
    }

    function handleDelete() {
        if (!deleteTag) return;

        router.delete(route('bank-transfer-tags.destroy', deleteTag.id), {
            preserveScroll: true,
            onSuccess: () => setDeleteTag(null),
        });
    }

    return (
        <>
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button variant="outline" className="gap-2">
                        <Tag className="h-4 w-4" />
                        Manage Tags
                    </Button>
                </SheetTrigger>
                <SheetContent className="flex flex-col">
                    <SheetHeader className="px-2">
                        <SheetTitle>Manage Tags</SheetTitle>
                        <SheetDescription>
                            Create, edit, and organize your transfer categories.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex-1 overflow-hidden px-2">
                        {/* Add New Tag Button/Form */}
                        <div className="mb-4">
                            {isCreating ? (
                                <form onSubmit={handleCreateSubmit} className="space-y-2">
                                    <Input
                                        placeholder="Enter tag name..."
                                        value={createForm.data.name}
                                        onChange={(e) => createForm.setData('name', e.target.value)}
                                        className={createForm.errors.name ? 'border-red-500' : ''}
                                        autoFocus
                                    />
                                    {createForm.errors.name && (
                                        <p className="text-sm text-red-500">{createForm.errors.name}</p>
                                    )}
                                    <div className="flex gap-2">
                                        <Button
                                            type="submit"
                                            size="sm"
                                            disabled={!createForm.data.name.trim() || createForm.processing}
                                        >
                                            <Check className="mr-1 h-4 w-4" />
                                            Save
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setIsCreating(false);
                                                createForm.reset();
                                                createForm.clearErrors();
                                            }}
                                        >
                                            <X className="mr-1 h-4 w-4" />
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="w-full justify-start gap-2"
                                    onClick={() => setIsCreating(true)}
                                >
                                    <Plus className="h-4 w-4" />
                                    Add New Tag
                                </Button>
                            )}
                        </div>

                        {/* Tags List */}
                        <div className="h-full overflow-y-auto pb-16 pr-2">
                            {tags.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                                        <Tag className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <h3 className="mb-1 text-sm font-medium text-gray-900">No tags yet</h3>
                                    <p className="mb-4 text-sm text-gray-500">
                                        Create your first tag to categorize your bank transfers.
                                    </p>
                                    <Button size="sm" onClick={() => setIsCreating(true)}>
                                        <Plus className="mr-1 h-4 w-4" />
                                        Create Tag
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {tags.map((tag) => (
                                        <div
                                            key={tag.id}
                                            className="flex items-center gap-3 rounded-lg border bg-white p-3 transition-colors hover:bg-gray-50"
                                        >
                                            {/* Tag Avatar */}
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600">
                                                <span className="text-sm font-bold text-white">
                                                    {tag.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>

                                            {/* Tag Content */}
                                            <div className="min-w-0 flex-1">
                                                {editingTagId === tag.id ? (
                                                    <form
                                                        onSubmit={(e) => handleEditSubmit(e, tag.id)}
                                                        className="space-y-2"
                                                    >
                                                        <Input
                                                            value={editForm.data.name}
                                                            onChange={(e) => editForm.setData('name', e.target.value)}
                                                            className={`h-8 ${editForm.errors.name ? 'border-red-500' : ''}`}
                                                            autoFocus
                                                        />
                                                        {editForm.errors.name && (
                                                            <p className="text-xs text-red-500">{editForm.errors.name}</p>
                                                        )}
                                                        <div className="flex gap-1">
                                                            <Button
                                                                type="submit"
                                                                size="sm"
                                                                className="h-7 px-2"
                                                                disabled={
                                                                    !editForm.data.name.trim() ||
                                                                    editForm.processing ||
                                                                    editForm.data.name === tag.name
                                                                }
                                                            >
                                                                <Check className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 px-2"
                                                                onClick={cancelEditing}
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </form>
                                                ) : (
                                                    <>
                                                        <p className="truncate text-sm font-medium text-gray-900">
                                                            {tag.name}
                                                        </p>
                                                        <Badge variant="secondary" className="mt-1">
                                                            {tag.bank_transfers_count || 0} transfer
                                                            {(tag.bank_transfers_count || 0) !== 1 ? 's' : ''}
                                                        </Badge>
                                                    </>
                                                )}
                                            </div>

                                            {/* Actions Menu */}
                                            {editingTagId !== tag.id && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">Open menu</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => startEditing(tag)}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => setDeleteTag(tag)}
                                                            className="text-red-600 focus:text-red-600"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteTag} onOpenChange={(open) => !open && setDeleteTag(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Tag</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTag?.bank_transfers_count > 0 ? (
                                <>
                                    Are you sure you want to delete <strong>"{deleteTag?.name}"</strong>?
                                    <br />
                                    <br />
                                    <span className="text-amber-600">
                                        This tag is used by {deleteTag?.bank_transfers_count} transfer
                                        {deleteTag?.bank_transfers_count !== 1 ? 's' : ''}.
                                        Those transfers will become untagged.
                                    </span>
                                </>
                            ) : (
                                <>
                                    Are you sure you want to delete <strong>"{deleteTag?.name}"</strong>?
                                    <br />
                                    <br />
                                    This action cannot be undone.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete Tag
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
