import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';

function ConfirmArchiveModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Delete Item',
    itemName = 'this item',
    relatedDataMessage = null,
    isProcessing = false,
}) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        {title}
                    </DialogTitle>
                    <DialogDescription className="pt-2">
                        {relatedDataMessage ? (
                            <div className="space-y-2">
                                <p>
                                    <span className="font-medium">{itemName}</span> has related data:
                                </p>
                                <p className="text-orange-600 font-medium">{relatedDataMessage}</p>
                                <p>
                                    This item will be <span className="font-medium">archived</span> instead of deleted.
                                    You can restore it later from the Archive page.
                                </p>
                            </div>
                        ) : (
                            <p>
                                Are you sure you want to delete <span className="font-medium">{itemName}</span>?
                                This action cannot be undone.
                            </p>
                        )}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Processing...' : relatedDataMessage ? 'Archive' : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default ConfirmArchiveModal;
